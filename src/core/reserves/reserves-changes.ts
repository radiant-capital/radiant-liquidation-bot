import { Log } from 'viem';
import { AbiEvent } from 'abitype';
import { findAbiEvent } from '@abi/events';
import LendingPoolAbi from '@abi/LendingPool.json';

interface StateChangingEvent {
  abi: AbiEvent;
  name: string;
}

const STATE_CHANGING_EVENTS: StateChangingEvent[] = ([
  {
    name: 'ReserveDataUpdated',
  },
] as Omit<StateChangingEvent, 'abi'>[])
  .map(item => ({...item, abi: findAbiEvent(LendingPoolAbi, item.name)}));

const STATE_CHANGING_EVENTS_MAP = STATE_CHANGING_EVENTS.reduce((acc, item) => {
  acc[item.name] = item;
  return acc;
}, {} as Record<string, StateChangingEvent>);

export const RESERVES_UPDATE_EVENTS: AbiEvent[] = STATE_CHANGING_EVENTS.map(item => item.abi);

export function resolveReservesUpdated(logs: Log[]): boolean {
  for (const log of logs) {
    const event = STATE_CHANGING_EVENTS_MAP[(log as Log<bigint, number, false, AbiEvent>).eventName];

    if (!event) {
      continue;
    }

    return true;
  }

  return false;
}
