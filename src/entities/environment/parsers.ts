export function parseAddresses(value: string | undefined, separator = ',') {
  return (value ?? '').split(separator)
    .map(item => item.trim())
    .filter(Boolean)
    .map((address => address.toLowerCase()));
}

export function parseAddress<T = `0x${string}` | undefined>(value: string | undefined, required = false): T {
  if (required && !value) {
    throw new Error('Required address not provided');
  }

  if (!value) {
    return undefined as T;
  }

  return value.trim().toLowerCase() as T;
}
