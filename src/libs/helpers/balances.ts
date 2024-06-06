import { PublicClient } from 'viem';
import ERC20TokenAbi from '@abi/ERC20Token.json';
import { jsonStringifyWithBigInt } from '@utils/json';

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

export interface TokenBalanceData {
  address: `0x${string}`;
  balance: bigint;
}

export async function balanceOfMany(
  client: PublicClient,
  user: string,
  tokenAddresses: string[],
): Promise<TokenBalanceData[]> {
  const balances = await Promise.all(tokenAddresses.map(address => balanceOf(client, user, address)));

  const tokens: TokenBalanceData[] = balances
    .map((balance, i) => (<TokenBalanceData>{ balance, address: tokenAddresses[i] }));

  return tokens;
}

export function listenBalanceChanges(
  client: PublicClient,
  user: `0x${string}`,
  tokenAddresses: string[],
  onChanges: (tokens: TokenBalanceData[]) => void,
  interval = 60000,
) {
  let prevSnapshot: string | null = null;

  const checkBalances = async () => {
    const tokens = await balanceOfMany(client, user, tokenAddresses);
    const snapshot = jsonStringifyWithBigInt(tokens);

    if (snapshot !== prevSnapshot) {
      prevSnapshot = snapshot;
      onChanges(tokens);
    }
  }

  setInterval(checkBalances, interval);
  checkBalances();
}
