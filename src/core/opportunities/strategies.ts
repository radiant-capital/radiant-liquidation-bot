import { LiquidationStrategy, LiquidationOpportunity } from '@core/opportunities/entities';
import GMXRadiantLiquidatorAbi from '@abi/GMXRadiantLiquidator.json';
import LendingPoolAbi from '@abi/LendingPool.json';
import { ReservesDataByAsset } from '@entities/reserves';
import { calculateUserReservesSummary, UserReserveDataSummary } from '@libs/aave';
import { minBI } from '@utils/bigint-math';
import { includesAddress } from '@utils/addresses';
import { ContractCallData } from '@core/wallet/entities';



interface LiquidationStrategiesContext {
  lendingPoolAddress: `0x${string}`;
  gmxLiquidatorAddress: `0x${string}`;
  gmxTokensAddresses: string[];
  gmxWithdrawalGasLimit: bigint;
  gasPrice: bigint;
}

export function createContractCall(
  opportunity: LiquidationOpportunity,
  collateralAsset: UserReserveDataSummary,
  debtAsset: UserReserveDataSummary,
  debtToCover: bigint,
  context: LiquidationStrategiesContext,
): ContractCallData {
  if (includesAddress(context.gmxTokensAddresses, collateralAsset.underlyingAsset)) {
    return {
      address: context.gmxLiquidatorAddress,
      abi: GMXRadiantLiquidatorAbi as any,
      functionName: 'liquidatePosition',
      args: [
        opportunity.userDetails.address,
        collateralAsset.underlyingAsset,
        debtAsset.underlyingAsset,
        debtToCover,
        context.lendingPoolAddress,
      ],
      value: context.gmxWithdrawalGasLimit * context.gasPrice
    }
  }

  return {
    address: context.lendingPoolAddress,
    abi: LendingPoolAbi as any,
    functionName: 'liquidationCall',
    args: [
      collateralAsset.underlyingAsset,
      debtAsset.underlyingAsset,
      opportunity.userDetails.address,
      debtToCover,
      false,
    ]
  };
}

export function findLiquidationStrategy(
  opportunity: LiquidationOpportunity,
  reservesByAsset: ReservesDataByAsset,
  context: LiquidationStrategiesContext,
  currentTimestamp: number,
): LiquidationStrategy | null {
  const usersSummary = calculateUserReservesSummary(reservesByAsset, opportunity.userDetails.reserves, currentTimestamp);
  const availableAssetsMF: Record<string, bigint> = Object.keys(reservesByAsset).reduce((acc, key) => {
    acc[key] = (2n ** 256n - 1n);
    return acc;
  }, {} as any);
  const availableTargetAssets = context.gmxTokensAddresses;

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

    if (
      includesAddress(availableTargetAssets, item.underlyingAsset) &&
      (collateralAsset === null || (collateralAsset as UserReserveDataSummary).collateralMF < item.collateralMF)
    ) {
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
    callData: createContractCall(opportunity, collateralAsset, debtAsset, debtToCover, context),
  };
}

export function filterLiquidationStrategies(
  opportunities: LiquidationOpportunity[],
  reservesByAsset: ReservesDataByAsset,
  context: LiquidationStrategiesContext,
  currentTimestamp: number,
  minGrossProfitMF?: bigint,
): { tookMs: number; strategies: LiquidationStrategy[] } {
  const time = Date.now();

  let strategies = opportunities
    .map(opp => findLiquidationStrategy(opp, reservesByAsset, context, currentTimestamp))
    .filter(Boolean) as LiquidationStrategy[];

  strategies = strategies.sort((a, b) => a.grossProfitMF < b.grossProfitMF ? 1 : a.grossProfitMF > b.grossProfitMF ? -1 : 0)

  if (minGrossProfitMF !== undefined) {
    strategies = strategies.filter(strategy => strategy.grossProfitMF >= minGrossProfitMF);
  }

  return { strategies, tookMs: Date.now() - time };
}
