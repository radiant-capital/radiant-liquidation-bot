import { Account, Chain, parseEther, PublicClient, Transport, WalletClient } from 'viem';
import { ContractCallData } from '@core/wallet/entities';
import { environment } from '@entities/environment';



export async function estimateContractCall(
  walletClient: WalletClient<Transport, Chain, Account>,
  client: PublicClient,
  callData: ContractCallData,
): Promise<bigint> {
  return await client.estimateContractGas({
    address: callData.address,
    abi: callData.abi,
    functionName: callData.functionName,
    args: callData.args,
    value: callData.value as any,
    account: walletClient.account,
  });
}

export async function contractCall(
  walletClient: WalletClient<Transport, Chain, Account>,
  callData: ContractCallData,
  gas?: bigint,
): Promise<`0x${string}`> {
  if (callData.value !== undefined && callData.value >= parseEther('0.1')) {
    throw new Error('Abnormal Transaction Value – too high');
  }

  if (!environment.SEND_TRANSACTIONS) {
    throw new Error('Transaction Send isn\'t allowed');
  }

  return await walletClient.writeContract({
    address: callData.address,
    abi: callData.abi,
    functionName: callData.functionName,
    args: callData.args,
    value: callData.value as any,
    gas,
  });
}

export async function safeContractCall(
  walletClient: WalletClient<Transport, Chain, Account>,
  client: PublicClient,
  callData: ContractCallData,
  onActionComplete?: (action: 'estimatedGas' | 'simulated', data: any) => void,
): Promise<`0x${string}`> {
  const gas = await estimateContractCall(walletClient, client, callData);
  onActionComplete?.('estimatedGas', gas);
  const simulation = await client.simulateContract({
    address: callData.address,
    abi: callData.abi,
    functionName: callData.functionName,
    args: callData.args,
    value: callData.value as any,
    account: walletClient.account,
  });
  onActionComplete?.('simulated', simulation);
  return await contractCall(walletClient, callData, (gas * 150n / 100n));
}
