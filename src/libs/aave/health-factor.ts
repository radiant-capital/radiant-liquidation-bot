import { getCompoundedBalance, getCompoundedStableBalance, getLinearBalance } from './aave-math-utils';
import { ReserveData, ReservesDataByAsset, UserReserveData } from '@entities/reserves';

function getUserReserveSummary(
  userReserve: Pick<
    UserReserveData,
    'scaledATokenBalance' |
    'scaledVariableDebt' |
    'principalStableDebt' |
    'stableBorrowRate' |
    'stableBorrowLastUpdateTimestamp'>,
  reserve: Pick<
    ReserveData,
    'liquidityIndex' |
    'liquidityRate' |
    'variableBorrowIndex' |
    'variableBorrowRate' |
    'lastUpdateTimestamp'>,
  currentTimestamp: number,
) {
  const variableBorrows = getCompoundedBalance(
    userReserve.scaledVariableDebt,
    reserve.variableBorrowIndex,
    reserve.variableBorrowRate,
    reserve.lastUpdateTimestamp,
    currentTimestamp,
  );

  const stableBorrows = getCompoundedStableBalance(
    userReserve.principalStableDebt,
    userReserve.stableBorrowRate,
    Number(userReserve.stableBorrowLastUpdateTimestamp),
    currentTimestamp,
  );

  return {
    balance: getLinearBalance(
      userReserve.scaledATokenBalance,
      reserve.liquidityIndex,
      reserve.liquidityRate,
      reserve.lastUpdateTimestamp,
      currentTimestamp
    ),
    totalBorrows: variableBorrows + stableBorrows
  }
}

export function calculateUserHealthFactor(
  reserveByAsset: ReservesDataByAsset,
  userReserves: UserReserveData[],
  currentTimestamp: number,
): {
  healthFactor: bigint;
  totalBorrowsMF: bigint;
  totalCollateralMF: bigint;
} {
  let totalBorrowsMF = 0n;
  let totalCollateralMF = 0n;
  let currentLiquidationThreshold = 0n;

  for (const userReserve of userReserves) {
    const reserve = reserveByAsset[userReserve.underlyingAsset.toLowerCase()];
    const {
      balance: reserveTotalBalance,
      totalBorrows: reserveTotalBorrows
    } = getUserReserveSummary(userReserve, reserve, currentTimestamp);
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
    totalBorrowsMF: totalBorrowsMF / (10n ** 18n),
    totalCollateralMF: totalCollateralMF / (10n ** 18n),
  };
}

export type UserReserveDataSummary = {
  underlyingAsset: string;
  totalBorrows: bigint;
  totalBorrowsMF: bigint;
  collateralMF: bigint;
  collateral: bigint;
};

export function calculateUserReservesSummary(
  reserveByAsset: ReservesDataByAsset,
  userReserves: UserReserveData[],
  currentTimestamp: number,
): UserReserveDataSummary[] {
  const reserves: UserReserveDataSummary[] = [];

  for (const userReserve of userReserves) {
    const underlyingAsset = userReserve.underlyingAsset.toLowerCase();
    const reserve = reserveByAsset[underlyingAsset];
    const {
      balance: reserveTotalBalance,
      totalBorrows: reserveTotalBorrows
    } = getUserReserveSummary(userReserve, reserve, currentTimestamp);
    const extraDecimals = (10n ** (18n - reserve.decimals));
    const reserveTotalBalanceMF = (reserveTotalBalance * reserve.priceInMarketReferenceCurrency * extraDecimals);
    const reserveTotalBorrowsMF = (reserveTotalBorrows * reserve.priceInMarketReferenceCurrency * extraDecimals);

    const isCollateral = reserve.reserveLiquidationThreshold > 0n && userReserve.usageAsCollateralEnabledOnUser;

    reserves.push({
      underlyingAsset,
      totalBorrows: reserveTotalBorrows,
      totalBorrowsMF: reserveTotalBorrowsMF / (10n ** 18n),
      collateral: isCollateral ? reserveTotalBalance : 0n,
      collateralMF: isCollateral ? reserveTotalBalanceMF / (10n ** 18n) : 0n,
    });
  }

  return reserves;
}
