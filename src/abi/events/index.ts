import { AbiEvent } from 'abitype';

export function findAbiEvent(abi: any[], eventName: string): AbiEvent {
  const event = abi.find((item: any) => item.type === 'event' && item.name === eventName) as AbiEvent;

  if (!event) {
    throw new Error(`Event "${eventName}" not found at provided abi`);
  }

  return event;
}

export function filterAbiEvents(abi: any, eventsNames: string[]): AbiEvent[] {
  const filteredEvents = abi.filter((item: any) => item.type === 'event' && eventsNames.includes(item.name));

  if (filteredEvents.length !== eventsNames.length) {
    throw new Error(`Failed to find "${eventsNames.join(', ')}"  at provided abi`);
  }

  return filteredEvents;
}
