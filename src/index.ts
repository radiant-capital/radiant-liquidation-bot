import {
  Account,
  Chain,
  createPublicClient,
  createWalletClient, extractChain,
  http,
  PublicClient,
  Transport,
  WalletClient,
  webSocket
} from 'viem';
import * as chains from 'viem/chains';
import {
  loadAllUsersDetailsToLatestBlockCached
} from '@core/users/users-details';
import { listenLiquidationOpportunities } from '@core/opportunities/listener';
import { privateKeyToAccount } from 'viem/accounts';
import { environment } from '@entities/environment';
import { filterLiquidationStrategies } from '@core/opportunities/strategies';
import { approveReserves } from '@core/wallet/reserves-approval';
import { loadReservesData } from '@core/reserves/reserves-loader';
import { printBalancesOfReserves } from '@core/wallet/reserves-balances';
import { listenTokensSell } from '@core/swap/tokens-seller';
import { sendLiquidationStrategy } from '@core/wallet/strategies-sender';
import { sendTokenSell } from '@core/wallet/token-sell-sender';
import { getGMXWithdrawalGasLimit } from '@core/opportunities/gmx-transfer-fee';
import { getLendingPoolAddress } from '@core/reserves/lending-pool-addresses-provider';

const account = privateKeyToAccount(environment.PRIVATE_KEY);
const chain = extractChain({
  chains: Object.values(chains),
  id: environment.CHAIN_ID as any,
})

const client = createPublicClient({
  batch: {
    multicall: true,
  },
  chain,
  transport: environment.WS_JSON_RPC ? webSocket(environment.WS_JSON_RPC) : http(environment.HTTP_JSON_RPC)
}) as PublicClient<Transport, Chain>;

const walletClient = createWalletClient({
  account,
  chain,
  transport: environment.WS_JSON_RPC ? webSocket(environment.WS_JSON_RPC) : http(environment.HTTP_JSON_RPC)
}) as WalletClient<Transport, Chain, Account>;

//TODO: token-sell overlaps
(async () => {
  const initialBlock = environment.INITIAL_BLOCK;

  const uiPoolDataProviderAddress = environment.UI_POOL_DATA_PROVIDER_ADDRESS;
  const lendingPoolAddressesProvider = environment.LENDING_POOL_ADDRESSES_PROVIDER;
  const gmxLiquidatorAddress = environment.GMX_LIQUIDATOR_ADDRESS;
  const gmxTokensAddresses = environment.GMX_TOKENS_ADDRESSES;
  const gmxSellTokensAddresses = environment.GMX_SELL_TOKENS_ADDRESSES;
  const gmxWithdrawalGasLimit = await getGMXWithdrawalGasLimit(client, environment.GMX_DATA_STORE_ADDRESS, 1.5);

  console.log(`Launching on ${chain.name} (${chain.id}) ...`);

  const lendingPoolAddress = await getLendingPoolAddress(client, lendingPoolAddressesProvider);
  const reserves = await loadReservesData(client, uiPoolDataProviderAddress, lendingPoolAddressesProvider);
  const liquidationCollateralAssets = environment.LIQUIDATION_COLLATERAL_ASSETS ?? reserves.map(res => res.underlyingAsset.toLowerCase());
  const liquidationDebtAssets = environment.LIQUIDATION_DEBT_ASSETS ?? reserves.map(res => res.underlyingAsset.toLowerCase());

  await printBalancesOfReserves(reserves, walletClient, client);

  if (environment.APPROVE_RESERVES) {
    await approveReserves(reserves, walletClient, client, lendingPoolAddress, gmxLiquidatorAddress, gmxTokensAddresses, liquidationCollateralAssets);
  }

  const { usersMap, toBlock } = await loadAllUsersDetailsToLatestBlockCached(
    client,
    lendingPoolAddress,
    uiPoolDataProviderAddress,
    lendingPoolAddressesProvider,
    initialBlock
  );

  listenLiquidationOpportunities(
    usersMap,
    toBlock,
    client,
    lendingPoolAddress,
    uiPoolDataProviderAddress,
    lendingPoolAddressesProvider,
    (opportunities, reservesByAsset, gasPrice, currentTimestamp, usersCount, tookMs) => {
      console.log(`Found ${opportunities.length} opportunities of ${usersCount} users – in ${tookMs}ms`);

      const MIN_GROSS_PROFIT_MF = BigInt(Math.floor(environment.MIN_GROSS_PROFIT_USD * (10 ** 8)));
      const { strategies, tookMs: strategiesTookMs } = filterLiquidationStrategies(
        opportunities,
        reservesByAsset, {
          lendingPoolAddress,
          gmxLiquidatorAddress,
          gmxTokensAddresses,
          liquidationCollateralAssets,
          liquidationDebtAssets,
          gmxWithdrawalGasLimit,
          gasPrice
        },
        currentTimestamp,
        MIN_GROSS_PROFIT_MF,
      );
      const minGrossProfitUSD = Math.round(Number(MIN_GROSS_PROFIT_MF / 10000n)) / 10000;
      console.log(`Found ${strategies.length} strategies (min gross profit ${minGrossProfitUSD}) of ${opportunities.length} opportunities – in ${strategiesTookMs}ms`);

      for (const strategy of strategies) {
        console.log(`[${strategy.id}] – `, `${Number(strategy.grossProfitMF) / 100000000} gross profit`);

        sendLiquidationStrategy(walletClient, client, strategy);
      }
    },
    1000,
  );

  listenTokensSell(
    client,
    { gmxLiquidatorAddress, gmxSellTokensAddresses },
    (tokenSell) => {
      sendTokenSell(walletClient, client, tokenSell);
    }
  );
})();
