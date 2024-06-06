export function equalAddresses(address1: string, address2: string): boolean {
  return address1.toLowerCase() === address2.toLowerCase();
}

export function includesAddress(addresses: string[], search: string): boolean {
  for (const address of addresses) {
    if (equalAddresses(address, search)) {
      return true;
    }
  }

  return false;
}
