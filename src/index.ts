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
import { sendStrategy } from '@core/wallet/sender';

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

(async () => {
  const initialBlock = environment.INITIAL_BLOCK;

  const lendingPoolAddress = '0x2585a47ae536535639c02444ff122ab6b7c5d111';
  const uiPoolDataProviderAddress = '0x56d4b07292343b149e0c60c7c41b7b1eeefdd733';
  const lendingPoolAddressesProvider = '0x4c017d134ed4fdcf5e5246ef2ec7071dc4a97341';
  const gmxLiquidatorAddress = '0x1723638b586331909ff85c2eaf5f121023b4825b';
  const gmxTokensAddresses = [
    '0x47c031236e19d024b42f8ae6780e44a573170703',
    '0x70d95587d40a2caf56bd97485ab3eec10bee6336',
  ];

  console.log(`Launching on ${chain.name} (${chain.id}) ...`);

  const reserves = await loadReservesData(client, uiPoolDataProviderAddress, lendingPoolAddressesProvider);

  await printBalancesOfReserves(reserves, walletClient, client);

  if (environment.APPROVE_RESERVES) {
    await approveReserves(reserves, walletClient, client, lendingPoolAddress);
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
    (opportunities, reservesByAsset, currentTimestamp, usersCount, tookMs) => {
      console.log(`Found ${opportunities.length} opportunities of ${usersCount} users – in ${tookMs}ms`);

      const MIN_GROSS_PROFIT_MF = BigInt(Math.floor(environment.MIN_GROSS_PROFIT_USD * (10 ** 8)));
      const { strategies, tookMs: strategiesTookMs } = filterLiquidationStrategies(
        opportunities,
        reservesByAsset,
        {
          lendingPoolAddress,
          gmxLiquidatorAddress,
          gmxTokensAddresses,
        },
        currentTimestamp,
        MIN_GROSS_PROFIT_MF,
      );
      const minGrossProfitUSD = Math.round(Number(MIN_GROSS_PROFIT_MF / 10000n)) / 10000;
      console.log(`Found ${strategies.length} strategies (min gross profit ${minGrossProfitUSD}) of ${opportunities.length} opportunities – in ${strategiesTookMs}ms`);

      for (const strategy of strategies) {
        console.log(`[${strategy.id}] – `, `${Number(strategy.grossProfitMF) / 100000000} gross profit`);

        sendStrategy(walletClient, client, strategy);
      }
    },
    1000,
  );
})();
