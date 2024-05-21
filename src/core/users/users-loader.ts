import { PublicClient } from 'viem';
import { jsonParseWithBigInt, jsonStringifyWithBigInt } from '@utils/json';
import { maxBI } from '@utils/bigint-math';
import { getAllLogs } from '@libs/logs';
import { getCacheFile } from '@utils/cache';
import { findAbiEvent } from '@abi/events';
import LendingPoolAbi from '@abi/LendingPool.json';

export async function loadAllUsers(
  client: PublicClient,
  address: `0x${string}`,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<string[]> {
  const logs = await getAllLogs(client, {
    address,
    event: findAbiEvent(LendingPoolAbi, 'Borrow'),
    fromBlock,
    toBlock,
  });

  const users = Array.from(new Set(logs.map(log => (log as any).args.onBehalfOf.toLowerCase())));

  return users;
}

export async function loadAllUsersCached(
  client: PublicClient,
  address: `0x${string}`,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<string[]> {
  const BLOCK_SAFETY_GAP = 128n;
  const cache = getCacheFile('users', client, {
    address: address.toLowerCase(),
    fromBlock,
  });

  let usersSet: Set<string> = new Set();
  let cachedUsersToBlock: bigint | null = null;

  if (cache.exists()) {
    const data = jsonParseWithBigInt(cache.read());
    usersSet = new Set(data.users);
    cachedUsersToBlock = data.toBlock;
  }

  if (cachedUsersToBlock && cachedUsersToBlock > toBlock) {
    throw new Error(`Cached users to a higher block than requested. Please clear cache. cachedUsersToBlock=${cachedUsersToBlock}, requestedToBlock=${toBlock}`);
  }

  const newUsers = await loadAllUsers(
    client,
    address,
    cachedUsersToBlock !== null ? maxBI(cachedUsersToBlock - BLOCK_SAFETY_GAP, fromBlock) : fromBlock,
    toBlock,
  );

  for (const newUser of newUsers) {
    usersSet.add(newUser.toLowerCase());
  }
  const users: string[] = Array.from(usersSet);

  cache.write(jsonStringifyWithBigInt({
    chainId: client.chain?.id,
    lendingPool: address,
    fromBlock,
    toBlock,
    users,
  }, null, 2));

  return users;
}

