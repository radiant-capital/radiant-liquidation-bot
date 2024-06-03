import { UserDetails } from '@core/users/entities';
import { AbiItem } from 'viem';
import { UserReserveDataSummary } from '@libs/aave';
import { ReserveData } from '@entities/reserves';

export interface LiquidationOpportunity {
  userDetails: UserDetails;
  healthFactor: bigint;
  totalBorrowsMF: bigint;
  totalCollateralMF: bigint;
}

export interface LiquidationStrategy {
  id: string;
  opportunity: LiquidationOpportunity;
  collateralAsset: UserReserveDataSummary;
  debtAsset: UserReserveDataSummary;
  collateralReserve: ReserveData;
  debtReserve: ReserveData;
  grossProfitMF: bigint;
  call: {
    address: `0x${string}`;
    functionName: string;
    args: any[];
    abi: AbiItem[];
  }
}
