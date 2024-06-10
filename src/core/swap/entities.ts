import { ContractCallData } from '@core/wallet/entities';

export interface TokenSell {
  id: string;
  token: string;
  amount: bigint;
  callData: ContractCallData;
}
