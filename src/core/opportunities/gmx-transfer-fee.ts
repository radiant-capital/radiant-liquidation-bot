import { encodePacked, keccak256, PublicClient } from 'viem';
import GMXDataStoreAbi from '@abi/GMXDataStore.json';

async function getGMXDataStoreUnit(client: PublicClient, address: `0x${string}`, key: string): Promise<bigint> {
  return await client.readContract({
    address,
    abi: GMXDataStoreAbi as any,
    functionName: 'getUint',
    args: [key],
  }) as bigint;
}

export async function getGMXWithdrawalGasLimit(
  client: PublicClient,
  gmxDataStoreAddress: `0x${string}`,
  safetyFactor: number,
): Promise<bigint> {
  const hashUintKey = (key: `0x${string}`) => keccak256(encodePacked(['bytes32'], [key]));

  const WITHDRAWAL_GAS_LIMIT = hashUintKey(`0x2e365620be682b0eaff6521339d5f4a7d6a1c118d9766dad390735f03b07b738`);
  const ESTIMATED_GAS_FEE_BASE_AMOUNT = `0xb240624f82b02b1a8e07fd5d67821e9664f273e0dc86415a33c1f3f444c81db4`;
  const ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR = `0xce135f2a886cf6d862269f215b1e64498fa09cb04f90b771b163399df2a82b81`;
  const FLOAT_PRECISION = 10n ** 30n;

  const [
    gasLimit,
    baseGasLimit,
    multiplierFactor,
  ] = await Promise.all([
    getGMXDataStoreUnit(client, gmxDataStoreAddress, WITHDRAWAL_GAS_LIMIT),
    getGMXDataStoreUnit(client, gmxDataStoreAddress, ESTIMATED_GAS_FEE_BASE_AMOUNT),
    getGMXDataStoreUnit(client, gmxDataStoreAddress, ESTIMATED_GAS_FEE_MULTIPLIER_FACTOR),
  ])

  const adjustedGasLimit = baseGasLimit + (gasLimit * multiplierFactor) / FLOAT_PRECISION;
  const safeAdjustedGasLimit = adjustedGasLimit * BigInt(Math.round(safetyFactor * (10 ** 8))) / 10n ** 8n;

  return safeAdjustedGasLimit;
}
