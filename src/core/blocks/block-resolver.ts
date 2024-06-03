import { Log, PublicClient } from 'viem';
import { debounce } from '@utils/promise';
import { CHANGED_USERS_EVENTS, resolveChangedUsers } from '@core/users/users-changes';
import { RESERVES_UPDATE_EVENTS, resolveReservesUpdated } from '@core/reserves/reserves-changes';

export interface ResolvedBlocksChanges {
  fromBlock: bigint;
  toBlock: bigint;
  changedUsers: string[];
  updatedReserves: boolean;
}

function resolveBlocksRange(logs: Log[]): [bigint, bigint] {
  let fromBlock = -1n;
  let toBlock = -1n;

  for (const log of logs) {
    if (log.blockNumber === null) {
      throw new Error('Log blockNumber=null');
    }

    if (fromBlock === -1n || fromBlock > log.blockNumber) {
      fromBlock = log.blockNumber;
    }

    if (toBlock === -1n || toBlock < log.blockNumber) {
      toBlock = log.blockNumber;
    }
  }

  if (fromBlock === -1n || toBlock === -1n) {
    throw new Error(`Incorrect blocks range for ${logs.length} logs`);
  }

  return [fromBlock, toBlock];
}

function resolveBlocksChanges(logs: Log[]): ResolvedBlocksChanges {
  const [fromBlock, toBlock] = resolveBlocksRange(logs);
  const changedUsers = resolveChangedUsers(logs);
  const updatedReserves = resolveReservesUpdated(logs);

  return {
    fromBlock,
    toBlock,
    changedUsers,
    updatedReserves,
  };
}

export function listenBlocksChanges(
  client: PublicClient,
  address: `0x${string}`,
  fromBlock: bigint,
  onChanges: (changes: ResolvedBlocksChanges) => void,
) {
  let bufferedLogs: Log[] = [];

  const debouncedBufferSubmit = debounce(async () => {
    const changes = resolveBlocksChanges(bufferedLogs);
    bufferedLogs = [];
    if (changes.updatedReserves || changes.changedUsers.length) {
      onChanges(changes);
    }
  }, 1);

  const poll = client.transport.type !== 'webSocket';
  console.log(`Started listening for latest blocks:`, poll ? '(fallback to polling, no websocket provided!)' : '(optimized with websocket)');

  client.watchEvent({
    fromBlock,
    address,
    poll: poll as true,
    events: [
      ...CHANGED_USERS_EVENTS,
      ...RESERVES_UPDATE_EVENTS,
    ],
    onLogs: (logs) => {
      bufferedLogs.push(...logs);
      debouncedBufferSubmit();
    },
    onError: (error) => {
      throw error;
    },
  });

  onChanges({
    fromBlock,
    toBlock: fromBlock,
    changedUsers: [],
    updatedReserves: true,
  });
}
