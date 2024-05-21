export function divCeilBI(a: bigint, b: bigint): bigint {
  return (a + b - 1n) / b;
}

export function maxBI(a: bigint, b: bigint): bigint {
  return a >= b ? a : b;
}

export function minBI(a: bigint, b: bigint): bigint {
  return a <= b ? a : b;
}
