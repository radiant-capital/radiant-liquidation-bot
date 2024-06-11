import { PublicClient } from 'viem';
import LendingPoolAddressesProviderAbi from '@abi/LendingPoolAddressesProvider.json';

export async function getLendingPoolAddress(client: PublicClient, lendingPoolAddressesProvider: `0x${string}`): Promise<`0x${string}`> {
  const address = await client.readContract({
    address: lendingPoolAddressesProvider,
    abi: LendingPoolAddressesProviderAbi as any,
    functionName: 'getLendingPool',
    args: []
  }) as string;

  return address.toLowerCase() as `0x${string}`;
}
