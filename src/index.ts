import { createPublicClient, http, webSocket } from 'viem';
import { arbitrum } from 'viem/chains';
import { listenBlocksChanges } from '@core/blocks/block-resolver';
import { loadReservesData } from '@core/reserves/reserves-loader';
import {
  loadAllUsersDetailsToLatestBlockCached,
  loadUsersDetails, updateUsersDetailsMap
} from '@core/users/users-details';
import { calculateUserHealthFactor } from '@libs/aave';

//http('https://arb1.arbitrum.io/rpc')
//webSocket('wss://arbitrum-one-rpc.publicnode.com')
//webSocket('wss://arb-mainnet.g.alchemy.com/v2/LLC4u016PAp3y4oXq7T29uCWKtcGmfPV')
const client = createPublicClient({
  batch: {
    multicall: true,
  },
  chain: arbitrum,
  transport: http('https://arb1.arbitrum.io/rpc'),
});

(async () => {
  const initialBlock = 0n;

  const lendingPoolAddress = '0xf4b1486dd74d07706052a33d31d7c0aafd0659e1';
  const uiPoolDataProviderAddress = '0x56d4b07292343b149e0c60c7c41b7b1eeefdd733';
  const lendingPoolAddressesProvider = '0x091d52cace1edc5527c99cdcfa6937c1635330e4';

  const { usersMap, toBlock } = await loadAllUsersDetailsToLatestBlockCached(
    client,
    lendingPoolAddress,
    uiPoolDataProviderAddress,
    lendingPoolAddressesProvider,
    initialBlock
  );

  listenBlocksChanges(
    client,
    lendingPoolAddress,
    toBlock,
    async (changes) => {
      const currentBlock = await client.getBlockNumber();
      const [reserves, userDetailsChanges] = await Promise.all([
        loadReservesData(client, uiPoolDataProviderAddress, lendingPoolAddressesProvider, currentBlock),
        changes.changedUsers ? loadUsersDetails(client, uiPoolDataProviderAddress, lendingPoolAddressesProvider, changes.changedUsers, currentBlock) : Promise.resolve({} as any),
      ]);

      updateUsersDetailsMap(usersMap, userDetailsChanges);

      console.log('changes', changes);
      console.log('currentBlock', currentBlock);
      console.log('currentReserves', reserves.length);
      console.log('currentUsersMap', Object.keys(usersMap).length);

      const time = Date.now();
      const currentTimestamp = Math.ceil(Date.now() / 1000);
      const usersInDanger = [];
      for (const user in usersMap) {
        const { healthFactor, totalCollateralMF } = calculateUserHealthFactor(reserves, usersMap[user].reserves, currentTimestamp);

        if (healthFactor < ((10n ** 18n)) && totalCollateralMF >= (10n ** 27n)) {
          //health < 1 && collateral >= $10
          usersInDanger.push(usersMap[user]);
          console.log('user', user, Math.round(Number(healthFactor / (10n ** 14n))) / (10 ** 4));
        }
      }

      console.log('usersInDanger', usersInDanger.length, `- done in ${Date.now() - time}ms`);
    }
  );
})();
