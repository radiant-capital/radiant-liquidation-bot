import { LiquidationStrategy, LiquidationOpportunity } from '@core/opportunities/entities';
import LendingPoolAbi from '@abi/LendingPool.json';
import { ReservesDataByAsset } from '@entities/reserves';
import { calculateUserReservesSummary, UserReserveDataSummary } from '@libs/aave';
import { minBI } from '@utils/bigint-math';



export function findLiquidationStrategy(
  opportunity: LiquidationOpportunity,
  reservesByAsset: ReservesDataByAsset,
  lendingPoolAddress: `0x${string}`,
  currentTimestamp: number,
): LiquidationStrategy | null {
  const usersSummary = calculateUserReservesSummary(reservesByAsset, opportunity.userDetails.reserves, currentTimestamp);
  const availableAssetsMF: Record<string, bigint> = Object.keys(reservesByAsset).reduce((acc, key) => {
    acc[key] = (2n ** 256n - 1n);
    return acc;
  }, {} as any);

  let debtAsset: UserReserveDataSummary | null = null;
  let collateralAsset: UserReserveDataSummary | null = null;
  let maxDebtToCoverMF: bigint | null = null;

  for (const item of usersSummary) {
    const availableAmountMF = availableAssetsMF[item.underlyingAsset];
    const possibleDebtToCoverMF = minBI(availableAmountMF, item.totalBorrowsMF / 2n);

    if (possibleDebtToCoverMF > 0n && (maxDebtToCoverMF === null || maxDebtToCoverMF < possibleDebtToCoverMF)) {
      maxDebtToCoverMF = possibleDebtToCoverMF;
      debtAsset = item;
    }

    if (collateralAsset === null || (collateralAsset as UserReserveDataSummary).collateralMF < item.collateralMF) {
      collateralAsset = item;
    }
  }

  if (collateralAsset === null || debtAsset === null || maxDebtToCoverMF === null) {
    return null;
  }

  const collateralReserve = reservesByAsset[collateralAsset.underlyingAsset];
  const debtReserve = reservesByAsset[debtAsset.underlyingAsset];
  const liquidatorFee = 750n;
  const platformFee = 750n;
  const base = 10000n;
  //TODO: might be wrong calculation for maxDebtToCoverForCollateralMF.
  const maxDebtToCoverForCollateralMF = collateralAsset.collateralMF * base / (base + platformFee + liquidatorFee);
  const debtToCoverMF = minBI(maxDebtToCoverMF, maxDebtToCoverForCollateralMF);
  //TODO: might be wrong calculation for grossProfitMF.
  const grossProfitMF = debtToCoverMF * (base + liquidatorFee) / base - debtToCoverMF;
  const debtToCover = debtToCoverMF * (10n ** debtReserve.decimals) / debtReserve.priceInMarketReferenceCurrency;

  return {
    id: `${opportunity.userDetails.address.toLowerCase()}${opportunity.userDetails.lastUpdateBlock.toString()}`,
    opportunity,
    collateralReserve,
    debtReserve,
    collateralAsset,
    debtAsset,
    grossProfitMF,
    call: {
      address: lendingPoolAddress,
      abi: LendingPoolAbi as any,
      functionName: 'liquidationCall',
      args: [
        collateralAsset.underlyingAsset,
        debtAsset.underlyingAsset,
        opportunity.userDetails.address,
        debtToCover,
        false,
      ]
    }
  };
}

export function filterLiquidationStrategies(
  opportunities: LiquidationOpportunity[],
  reservesByAsset: ReservesDataByAsset,
  lendingPoolAddress: `0x${string}`,
  currentTimestamp: number,
  minGrossProfitMF?: bigint,
): { tookMs: number; strategies: LiquidationStrategy[] } {
  const time = Date.now();

  let strategies = opportunities
    .map(opp => findLiquidationStrategy(opp, reservesByAsset, lendingPoolAddress, currentTimestamp))
    .filter(Boolean) as LiquidationStrategy[];

  strategies = strategies.sort((a, b) => a.grossProfitMF < b.grossProfitMF ? 1 : a.grossProfitMF > b.grossProfitMF ? -1 : 0)

  if (minGrossProfitMF !== undefined) {
    strategies = strategies.filter(strategy => strategy.grossProfitMF >= minGrossProfitMF);
  }

  return { strategies, tookMs: Date.now() - time };
}
