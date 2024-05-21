export function splitIntoBatches<T>(array: T[], maxBatchSize: number): T[][] {
  if (maxBatchSize <= 0) {
    throw new Error('maxBatchSize should be greater than 0');
  }

  const result: T[][] = [];
  for (let i = 0; i < array.length; i += maxBatchSize) {
    result.push(array.slice(i, i + maxBatchSize));
  }

  return result;
}
