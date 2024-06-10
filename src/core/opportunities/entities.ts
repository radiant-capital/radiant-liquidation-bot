import { UserDetails } from '@core/users/entities';
import { UserReserveDataSummary } from '@libs/aave';
import { ReserveData } from '@entities/reserves';
import { ContractCallData } from '@core/wallet/entities';

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
  callData: ContractCallData;
}
