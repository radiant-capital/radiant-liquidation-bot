import { AbiItem } from 'viem';

export interface ContractCallData {
  address: `0x${string}`;
  functionName: string;
  args: any[];
  abi: AbiItem[];
  value?: bigint;
}
