import { Account, Chain, WalletClient, Transport, PublicClient } from 'viem';
import ERC20TokenAbi from '@abi/ERC20Token.json';
import { timeout, wait } from '@utils/promise';

export async function approveSpender(
  walletClient: WalletClient<Transport, Chain, Account>,
  tokenAddress: string,
  spenderAddress: string,
  value: bigint,
): Promise<string> {
  return await walletClient.writeContract({
    address: tokenAddress as any,
    abi: ERC20TokenAbi,
    functionName: 'approve',
    args: [
      spenderAddress,
      value,
    ],
  });
}

export async function spenderAllowance(
  client: PublicClient,
  userAddress: string,
  tokenAddress: string,
  spenderAddress: string
): Promise<bigint> {
  return await client.readContract({
    address: tokenAddress as any,
    abi: ERC20TokenAbi,
    functionName: 'allowance',
    args: [
      userAddress,
      spenderAddress,
    ],
  }) as any;
}

export async function approveSpenderIfNeeded(
  walletClient: WalletClient<Transport, Chain, Account>,
  client: PublicClient,
  tokenAddress: string,
  spenderAddress: string,
  value: bigint = (2n ** 256n - 1n),
  minValue: bigint = value / 2n,
  delay = 5000,
): Promise<{ approveHash?: string; allowance: bigint; }> {
  if (value < minValue) {
    throw new Error('At approveSpenderIfNeeded minValue can\'t be bigger than value');
  }

  let allowance = await spenderAllowance(client, walletClient.account.address, tokenAddress, spenderAddress);

  if (allowance >= minValue) {
    return { allowance };
  } else {
  }

  const approveHash = await approveSpender(walletClient, tokenAddress, spenderAddress, value);

  await timeout(
    async () => {
      do {
        await wait(delay);
        allowance = await spenderAllowance(client, walletClient.account.address, tokenAddress, spenderAddress);
      } while (allowance < minValue)
    },
    10 * delay,
    `Couldn't approve token: user=${walletClient.account.address} token=${tokenAddress} spender=${spenderAddress} value=${value}`,
  );

  return { approveHash, allowance };
}
