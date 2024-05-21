import { getCompoundedBalance, getCompoundedStableBalance, getLinearBalance } from './aave-math-utils';
import { ReserveData, UserReserveData } from '@entities/reserves';

function getUserReserveSummary(
  scaledATokenBalance: bigint,
  scaledVariableDebt: bigint,
  principalStableDebt: bigint,
  stableBorrowRate: bigint,
  stableBorrowLastUpdateTimestamp: number,

  liquidityIndex: bigint,
  liquidityRate: bigint,
  variableBorrowIndex: bigint,
  variableBorrowRate: bigint,
  lastUpdateTimestamp: number,
  currentTimestamp: number,
) {
  const variableBorrows = getCompoundedBalance(
    scaledVariableDebt,
    variableBorrowIndex,
    variableBorrowRate,
    lastUpdateTimestamp,
    currentTimestamp,
  );

  const stableBorrows = getCompoundedStableBalance(
    principalStableDebt,
    stableBorrowRate,
    stableBorrowLastUpdateTimestamp,
    currentTimestamp,
  );

  return {
    balance: getLinearBalance(
      scaledATokenBalance,
      liquidityIndex,
      liquidityRate,
      lastUpdateTimestamp,
      currentTimestamp
    ),
    totalBorrows: variableBorrows + stableBorrows
  }
}

export function calculateUserHealthFactor(
  reserves: ReserveData[],
  userReserves: UserReserveData[],
  currentTimestamp: number,
): {
  healthFactor: bigint;
  totalBorrowsMF: bigint;
  totalCollateralMF: bigint;
} {
  const reserveByAsset = reserves.reduce((acc, item) => {
    acc[item.underlyingAsset.toLowerCase()] = item;
    return acc;
  }, {} as Record<string, ReserveData>);

  let totalBorrowsMF = 0n;
  let totalCollateralMF = 0n;
  let currentLiquidationThreshold = 0n;

  for (const userReserve of userReserves) {
    const reserve = reserveByAsset[userReserve.underlyingAsset.toLowerCase()];
    const { balance: reserveTotalBalance, totalBorrows: reserveTotalBorrows } = getUserReserveSummary(
      userReserve.scaledATokenBalance,
      userReserve.scaledVariableDebt,
      userReserve.principalStableDebt,
      userReserve.stableBorrowRate,
      Number(userReserve.stableBorrowLastUpdateTimestamp),

      reserve.liquidityIndex,
      reserve.liquidityRate,
      reserve.variableBorrowIndex,
      reserve.variableBorrowRate,
      reserve.lastUpdateTimestamp,
      currentTimestamp,
    );
    const extraDecimals = (10n ** (18n - reserve.decimals));
    const reserveTotalBalanceMF = (reserveTotalBalance * reserve.priceInMarketReferenceCurrency * extraDecimals);
    const reserveTotalBorrowsMF = (reserveTotalBorrows * reserve.priceInMarketReferenceCurrency * extraDecimals);

    totalBorrowsMF += reserveTotalBorrowsMF;

    if (
      reserve.reserveLiquidationThreshold > 0n &&
      userReserve.usageAsCollateralEnabledOnUser
    ) {
      totalCollateralMF += reserveTotalBalanceMF;
      currentLiquidationThreshold += (reserveTotalBalanceMF * reserve.reserveLiquidationThreshold);
      //currentLTV += reserveTotalBalanceMF * reserve.baseLTVasCollateral;
    }
  }

  if (currentLiquidationThreshold > 0n) {
    currentLiquidationThreshold = currentLiquidationThreshold * (10n ** 18n) / totalCollateralMF;
  }

  const healthFactor = totalBorrowsMF === 0n ? -1n : totalCollateralMF * currentLiquidationThreshold / (10n ** 4n) / totalBorrowsMF;

  return {
    healthFactor,
    totalBorrowsMF,
    totalCollateralMF,
  };
}
