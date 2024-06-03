import { PublicClient } from 'viem';
import ERC20TokenAbi from '@abi/ERC20Token.json';

export async function balanceOf(
  client: PublicClient,
  user: string,
  tokenAddress: string,
): Promise<bigint> {
  return await client.readContract({
    address: tokenAddress as any,
    abi: ERC20TokenAbi,
    functionName: 'balanceOf',
    args: [
      user,
    ],
  }) as any;
}
