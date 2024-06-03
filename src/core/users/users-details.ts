import { PublicClient } from 'viem';
import UiPoolDataProviderAbi from '@abi/UiPoolDataProvider.json';
import { UserReserveData } from '@entities/reserves';
import { splitIntoBatches } from '@utils/array';
import { getCacheFile } from '@utils/cache';
import { jsonParseWithBigInt, jsonStringifyWithBigInt } from '@utils/json';
import { loadAllUsersCached } from '@core/users/users-loader';
import { loadAllChangedUsers } from '@core/users/users-changes';
import { maxBI } from '@utils/bigint-math';
import { UserDetails, UserDetailsMap } from '@core/users/entities';

async function getUserReservesData(
  client: PublicClient,
  uiPoolDataProviderAddress: `0x${string}`,
  lendingPoolAddressesProvider: `0x${string}`,
  users: string[],
  blockNumber: bigint,
): Promise<UserReserveData[][]> {
  const userReserves = await client.multicall({
    blockNumber,
    contracts: users.map(user => ({
      address: uiPoolDataProviderAddress,
      abi: UiPoolDataProviderAbi as any,
      functionName: 'getUserReservesData',
      args: [lendingPoolAddressesProvider, user]
    }))
  });

  const result: UserReserveData[][] = [];

  for (const userReserve of userReserves) {
    if (userReserve.status === 'success') {
      result.push(userReserve.result as UserReserveData[]);
    } else {
      throw new Error('Failed to getUserReservesData')
    }
  }

  return result;
}

async function getUserReservesDataInBatches(
  client: PublicClient,
  uiPoolDataProviderAddress: `0x${string}`,
  lendingPoolAddressesProvider: `0x${string}`,
  users: string[],
  blockNumber: bigint,
  maxBatchSize = 100
): Promise<UserDetailsMap> {
  const userBatches = splitIntoBatches(users, maxBatchSize);
  const loadingStartedAt = Date.now();
  const result: Record<string, UserDetails> = {};

  let i = 0;
  let loadedUsersCount = 0;
  while (i < userBatches.length) {
    const userBatch = userBatches[i];

    try {
      const userBatchReserves = await getUserReservesData(
        client,
        uiPoolDataProviderAddress,
        lendingPoolAddressesProvider,
        userBatch,
        blockNumber
      );

      for (let j = 0; j < userBatchReserves.length; j++) {
        const address = userBatch[j].toLowerCase();
        const reserves = userBatchReserves[j]
          .map(reserve => ({ ...reserve, underlyingAsset: reserve.underlyingAsset.toLowerCase() }))
          .filter(reserve => (
            reserve.stableBorrowLastUpdateTimestamp !== 0n ||
            reserve.stableBorrowRate !== 0n ||
            reserve.scaledATokenBalance !== 0n ||
            reserve.principalStableDebt !== 0n ||
            reserve.scaledVariableDebt !== 0n ||
            reserve.usageAsCollateralEnabledOnUser
          ));

        result[address] = {
          address,
          reserves,
          lastUpdateBlock: blockNumber
        };
      }

      loadedUsersCount += userBatch.length;
      i++;
      const left = Math.round((users.length - loadedUsersCount) / loadedUsersCount * (Date.now() - loadingStartedAt)) / 1000;
      console.log(
        `Users Details Request: [${loadedUsersCount} / ${users.length}]`,
        users.length === loadedUsersCount ? `– done in ${Math.round(Date.now() - loadingStartedAt) / 1000} sec` : `~ ${left} sec left`
      );
    } catch (e) {
      console.log(`Users Details Error: [${loadedUsersCount} / ${users.length}]`);
      console.error(e);
    }
  }

  return result;
}

export async function loadUsersDetails(
  client: PublicClient,
  uiPoolDataProviderAddress: `0x${string}`,
  lendingPoolAddressesProvider: `0x${string}`,
  users: string[],
  currentBlock: bigint,
): Promise<UserDetailsMap> {
  return getUserReservesDataInBatches(
    client,
    uiPoolDataProviderAddress,
    lendingPoolAddressesProvider,
    users,
    currentBlock,
  );
}

export function updateUsersDetailsMap(usersDetails: UserDetailsMap, otherUsersDetails: UserDetailsMap): void {
  for (const user in otherUsersDetails) {
    usersDetails[user] = otherUsersDetails[user];
  }

  for (const user in usersDetails) {
    const hasBorrows = usersDetails[user].reserves.some(reserve => (
      reserve.stableBorrowLastUpdateTimestamp !== 0n ||
      reserve.stableBorrowRate !== 0n ||
      reserve.principalStableDebt !== 0n ||
      reserve.scaledVariableDebt !== 0n
    ));
    const hasReserves = !!usersDetails[user].reserves.length;

    if (!hasReserves || !hasBorrows) {
      delete usersDetails[user];
    }
  }
}

export async function loadAllUsersDetailsCached(
  client: PublicClient,
  lendingPoolAddress: `0x${string}`,
  uiPoolDataProviderAddress: `0x${string}`,
  lendingPoolAddressesProvider: `0x${string}`,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<UserDetailsMap> {
  const BLOCK_SAFETY_GAP = 128n;

  const cache = getCacheFile('users-details', client, {
    lendingPoolAddress: lendingPoolAddress.toLowerCase(),
    uiPoolDataProviderAddress: uiPoolDataProviderAddress.toLowerCase(),
    lendingPoolAddressesProvider: lendingPoolAddressesProvider.toLowerCase(),
    fromBlock,
  });

  let usersDetails: UserDetailsMap = {};
  let cachedUsersDetailsToBlock: bigint | null = null;
  if (cache.exists()) {
    const data = jsonParseWithBigInt(cache.read());
    cachedUsersDetailsToBlock = data.toBlock;
    usersDetails = data.usersDetails;
  }

  if (cachedUsersDetailsToBlock && cachedUsersDetailsToBlock > toBlock) {
    throw new Error(`Cached users to a higher block than requested. Please clear cache. cachedUsersDetailsToBlock=${cachedUsersDetailsToBlock}, requestedToBlock=${toBlock}`);
  }

  const changedUsers = cachedUsersDetailsToBlock !== null ? (
    await loadAllChangedUsers(
      client,
      lendingPoolAddress,
      maxBI(cachedUsersDetailsToBlock - BLOCK_SAFETY_GAP, fromBlock),
      toBlock
    )
  ) : (
    await loadAllUsersCached(
      client,
      lendingPoolAddress,
      fromBlock,
      toBlock
    )
  );

  const changedUsersDetails = await loadUsersDetails(
    client,
    uiPoolDataProviderAddress,
    lendingPoolAddressesProvider,
    changedUsers,
    toBlock,
  );

  updateUsersDetailsMap(usersDetails, changedUsersDetails);

  cache.write(jsonStringifyWithBigInt({
    chainId: client.chain?.id,
    lendingPoolAddress,
    uiPoolDataProviderAddress,
    lendingPoolAddressesProvider,
    fromBlock,
    toBlock,
    usersDetails,
  }, null, 2));

  return usersDetails;
}

export async function loadAllUsersDetailsToLatestBlockCached(
  client: PublicClient,
  lendingPoolAddress: `0x${string}`,
  uiPoolDataProviderAddress: `0x${string}`,
  lendingPoolAddressesProvider: `0x${string}`,
  initialBlock: bigint,
  toleranceBlocks = 32n,
): Promise<{
  usersMap: UserDetailsMap,
  toBlock: bigint,
}> {
  let currentBlock: bigint = 0n;
  let toBlock: bigint = 0n;
  let usersMap: UserDetailsMap = {};

  do {
    toBlock = await client.getBlockNumber();
    usersMap = await loadAllUsersDetailsCached(
      client,
      lendingPoolAddress,
      uiPoolDataProviderAddress,
      lendingPoolAddressesProvider,
      initialBlock,
      toBlock
    );
    currentBlock = await client.getBlockNumber();
    console.log(`Users Details Loaded: ${Object.keys(usersMap).length}`, currentBlock - toBlock !== 0n ? `(upto ${toBlock} block ${currentBlock - toBlock} blocks away from current block)` : '');
  } while (currentBlock - toBlock > toleranceBlocks);

  return {
    usersMap,
    toBlock,
  }
}
