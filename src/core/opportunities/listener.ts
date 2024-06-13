import { PublicClient } from 'viem';
import { listenBlocksChanges } from '@core/blocks/block-resolver';
import { loadReservesData } from '@core/reserves/reserves-loader';
import { loadUsersDetails, updateUsersDetailsMap } from '@core/users/users-details';
import { includesCollateralAsset, UserDetailsMap } from '@core/users/entities';
import { throttle } from '@utils/timing';
import { mapReservesByAsset, ReserveData, ReservesDataByAsset } from '@entities/reserves';
import { calculateUserHealthFactor } from '@libs/aave';
import { LiquidationOpportunity } from '@core/opportunities/entities';

function listenUsersDetailsUpdates(
  usersMap: UserDetailsMap,
  listenFromBlock: bigint,
  client: PublicClient,
  lendingPoolAddress: `0x${string}`,
  uiPoolDataProviderAddress: `0x${string}`,
  lendingPoolAddressesProvider: `0x${string}`,
  onUpdate: (usersMap: UserDetailsMap, reserves: ReserveData[], blockNumber: bigint, gasPrice: bigint) => void,
  updateIntervalDelay: number,
) {
  let reserves: ReserveData[] = [];
  let blockNumber = 0n;
  let gasPrice = 0n;

  const triggerUpdate = throttle(() => {
    onUpdate(usersMap, reserves, blockNumber, gasPrice);
  }, 1000);

  listenBlocksChanges(
    client,
    lendingPoolAddress,
    listenFromBlock,
    async (changes) => {
      const currentBlock = await client.getBlockNumber();
      const currentGasPrice = await client.getGasPrice();
      const [
        latestReserves,
        userDetailsChanges
      ] = await Promise.all([
        loadReservesData(client, uiPoolDataProviderAddress, lendingPoolAddressesProvider, currentBlock),
        changes.changedUsers ? loadUsersDetails(client, uiPoolDataProviderAddress, lendingPoolAddressesProvider, changes.changedUsers, currentBlock) : Promise.resolve({} as any),
      ]);

      updateUsersDetailsMap(usersMap, userDetailsChanges);
      reserves = latestReserves;
      blockNumber = currentBlock;
      gasPrice = currentGasPrice;
      triggerUpdate();
    }
  );

  setInterval(() => {
    if (!reserves.length) {
      return;
    }

    triggerUpdate();
  }, updateIntervalDelay);
}

export function listenLiquidationOpportunities(
  usersMap: UserDetailsMap,
  listenFromBlock: bigint,
  client: PublicClient,
  lendingPoolAddress: `0x${string}`,
  uiPoolDataProviderAddress: `0x${string}`,
  lendingPoolAddressesProvider: `0x${string}`,
  liquidationCollateralAssets: string[],
  onOpportunitiesFound: (opportunities: LiquidationOpportunity[], reservesByAsset: ReservesDataByAsset, gasPrice: bigint, currentTimestamp: number, usersCount: number, tookMs: number) => void,
  updateIntervalDelay: number,
) {
  const liquidationCollateralAssetsSet = new Set(liquidationCollateralAssets.map(address => address.toLowerCase()));

  listenUsersDetailsUpdates(
    usersMap,
    listenFromBlock,
    client,
    lendingPoolAddress,
    uiPoolDataProviderAddress,
    lendingPoolAddressesProvider,
    (usersMap, reserves, blockNumber, gasPrice) => {
      const time = Date.now();
      const currentTimestamp = Math.ceil(Date.now() / 1000);
      const opportunities: LiquidationOpportunity[] = [];
      const reservesByAsset = mapReservesByAsset(reserves);

      let usersCount = 0;
      for (const user in usersMap) {
        if (!includesCollateralAsset(usersMap[user], liquidationCollateralAssetsSet)) {
          continue;
        }

        const {
          healthFactor,
          totalCollateralMF,
          totalBorrowsMF
        } = calculateUserHealthFactor(reservesByAsset, usersMap[user].reserves, currentTimestamp);

        if (healthFactor <= ((10n ** 18n))) {
          opportunities.push({
            userDetails: usersMap[user],
            totalBorrowsMF,
            totalCollateralMF,
            healthFactor,
          });
        }

        usersCount++;
      }

      onOpportunitiesFound(opportunities, reservesByAsset, gasPrice, currentTimestamp, usersCount, Date.now() - time);
    },
    updateIntervalDelay,
  );
}
