import { Log, PublicClient } from 'viem';
import { findAbiEvent } from '@abi/events';
import LendingPoolAbi from '@abi/LendingPool.json';
import { getAllLogs } from '@libs/logs';
import { AbiEvent } from 'abitype';

interface StateChangingEvent {
  abi: AbiEvent;
  name: string;
  changedUserKey?: string;
  changedUser?: (log: Log) => string | null;
  changedUsers?: (log: Log) => string[] | null;
}

/**
 * 'Deposit',
 * 'Withdraw',
 * 'Borrow',
 * 'Repay',
 * 'Swap',
 * 'ReserveUsedAsCollateralEnabled',
 * 'ReserveUsedAsCollateralDisabled',
 * 'RebalanceStableBorrowRate',
 * 'FlashLoan',
 * 'LiquidationCall'
 * */
const STATE_CHANGING_EVENTS: StateChangingEvent[] = ([
  {
    name: 'Deposit',
    changedUserKey: 'onBehalfOf',
  },
  {
    name: 'Withdraw',
    changedUserKey: 'user',
  },
  {
    name: 'Borrow',
    changedUserKey: 'onBehalfOf',
  },
  {
    name: 'Repay',
    changedUserKey: 'user',
  },
  {
    name: 'ReserveUsedAsCollateralEnabled',
    changedUserKey: 'user',
  },
  {
    name: 'ReserveUsedAsCollateralDisabled',
    changedUserKey: 'user',
  },
  {
    name: 'LiquidationCall',
    changedUserKey: 'user',
  }
] as Omit<StateChangingEvent, 'abi'>[])
  .map(item => ({...item, abi: findAbiEvent(LendingPoolAbi, item.name)}));

const STATE_CHANGING_EVENTS_MAP = STATE_CHANGING_EVENTS.reduce((acc, item) => {
  acc[item.name] = item;
  return acc;
}, {} as Record<string, StateChangingEvent>);

export const CHANGED_USERS_EVENTS: AbiEvent[] = STATE_CHANGING_EVENTS.map(item => item.abi);

export function resolveChangedUsers(logs: Log[]): string[] {
  const changedUsersSet = new Set<string>();
  for (const log of logs) {
    const event = STATE_CHANGING_EVENTS_MAP[(log as Log<bigint, number, false, AbiEvent>).eventName];

    if (!event) {
      continue;
    }

    if (event.changedUserKey) {
      const user = (log as any).args[event.changedUserKey];
      changedUsersSet.add(user.toLowerCase());
    } else if (event.changedUser) {
      const user = event.changedUser(log);

      if (user) {
        changedUsersSet.add(user.toLowerCase());
      }
    } else if (event.changedUsers) {
      const users = event.changedUsers(log);

      if (users) {
        for (const user of users) {
          changedUsersSet.add(user.toLowerCase());
        }
      }
    }
  }

  const changedUsers = Array.from(changedUsersSet);
  return changedUsers;
}

export async function loadAllChangedUsers(
  client: PublicClient,
  address: `0x${string}`,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<string[]> {
  const logs = await getAllLogs(client, {
    address,
    events: STATE_CHANGING_EVENTS.map(item => item.abi),
    fromBlock,
    toBlock,
  });

  return resolveChangedUsers(logs);
}
