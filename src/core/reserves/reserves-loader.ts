import { PublicClient } from 'viem';
import { BaseCurrency, ReserveData } from '@entities/reserves';
import UiPoolDataProviderAbi from '@abi/UiPoolDataProvider.json';

async function getReservesData(
  client: PublicClient,
  uiPoolDataProviderAddress: `0x${string}`,
  lendingPoolAddressesProvider: `0x${string}`,
  blockNumber?: bigint,
): Promise<ReserveData[]> {
  const reserves = await client.readContract({
    blockNumber,
    address: uiPoolDataProviderAddress,
    abi: UiPoolDataProviderAbi as any,
    functionName: 'getReservesData',
    args: [lendingPoolAddressesProvider]
  });

  const baseCurrency: BaseCurrency = (reserves as any)?.[1] ?? {};
  const resetDecimals = (price: bigint, baseCurrency: BaseCurrency, targetDecimals: bigint) => {
    return price * (10n ** targetDecimals) / baseCurrency.marketReferenceCurrencyUnit;
  }

  const data: ReserveData[] = ((reserves as any)?.[0] ?? []).map((reserve: ReserveData) => ({
    ...reserve,
    underlyingAsset: reserve.underlyingAsset.toLowerCase(),
    priceInMarketReferenceCurrency: resetDecimals(reserve.priceInMarketReferenceCurrency, baseCurrency, 8n),
  }));

  return data;
}

export async function loadReservesData(
  client: PublicClient,
  uiPoolDataProviderAddress: `0x${string}`,
  lendingPoolAddressesProvider: `0x${string}`,
  blockNumber?: bigint,
): Promise<ReserveData[]> {
  return getReservesData(client, uiPoolDataProviderAddress, lendingPoolAddressesProvider, blockNumber);
}
