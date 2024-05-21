import { PublicClient } from 'viem';
import { ReserveData } from '@entities/reserves';
import UiPoolDataProviderAbi from '@abi/UiPoolDataProvider.json';

async function getReservesData(
  client: PublicClient,
  uiPoolDataProviderAddress: `0x${string}`,
  lendingPoolAddressesProvider: `0x${string}`,
  blockNumber: bigint,
): Promise<ReserveData[]> {
  const reserves = await client.readContract({
    blockNumber,
    address: uiPoolDataProviderAddress,
    abi: UiPoolDataProviderAbi as any,
    functionName: 'getReservesData',
    args: [lendingPoolAddressesProvider]
  });

  const data: ReserveData[] = ((reserves as any)?.[0] ?? []).map((reserve: ReserveData) => ({
    ...reserve,
    underlyingAsset: reserve.underlyingAsset.toLowerCase(),
  }));
  //const baseCurrency: ReserveData[] = (reserves as any)?.[1] ?? [];

  return data;
}

export async function loadReservesData(
  client: PublicClient,
  uiPoolDataProviderAddress: `0x${string}`,
  lendingPoolAddressesProvider: `0x${string}`,
  blockNumber: bigint,
): Promise<ReserveData[]> {
  return getReservesData(client, uiPoolDataProviderAddress, lendingPoolAddressesProvider, blockNumber);
}
