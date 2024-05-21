/*
console.log(formatUserSummary({
  currentTimestamp,
  marketRefPriceInUsd: '100000000',
  marketRefCurrencyDecimals: 8,
  rawUserReserves: ((userReserves[0].result) as any[]).map(userReserve => {
    const reserve = (reserves[0].result as any)[0].find((item: any) => item.underlyingAsset.toLowerCase() === userReserve.underlyingAsset.toLowerCase());
    return {
      underlyingAsset: userReserve.underlyingAsset,
      scaledATokenBalance: valueToBigNumber(userReserve.scaledATokenBalance),
      scaledVariableDebt: valueToBigNumber(userReserve.scaledVariableDebt),
      principalStableDebt: valueToBigNumber(userReserve.principalStableDebt),
      stableBorrowRate: valueToBigNumber(userReserve.stableBorrowRate),
      stableBorrowLastUpdateTimestamp: Number(userReserve.stableBorrowLastUpdateTimestamp),
      usageAsCollateralEnabledOnUser: userReserve.usageAsCollateralEnabledOnUser,

      reserve: {
        underlyingAsset: reserve.underlyingAsset,
        decimals: Number(reserve.decimals),
        priceInMarketReferenceCurrency: valueToBigNumber(reserve.priceInMarketReferenceCurrency),
        liquidityIndex: valueToBigNumber(reserve.liquidityIndex),
        baseLTVasCollateral: valueToBigNumber(reserve.baseLTVasCollateral),
        liquidityRate: valueToBigNumber(reserve.liquidityRate),
        variableBorrowIndex: valueToBigNumber(reserve.variableBorrowIndex),
        variableBorrowRate: valueToBigNumber(reserve.variableBorrowRate),
        lastUpdateTimestamp: Number(reserve.lastUpdateTimestamp),
        name: reserve.name,
        symbol: reserve.symbol,
        reserveLiquidationThreshold: valueToBigNumber(reserve.reserveLiquidationThreshold),
        reserveLiquidationBonus: valueToBigNumber(reserve.reserveLiquidationBonus),
        reserveFactor: valueToBigNumber(reserve.reserveFactor),
        usageAsCollateralEnabled: reserve.usageAsCollateralEnabled,
        borrowingEnabled: reserve.borrowingEnabled,
        stableBorrowRateEnabled: reserve.stableBorrowRateEnabled,
        isActive: reserve.isActive,
        isFrozen: reserve.isFrozen,
        stableBorrowRate: valueToBigNumber(reserve.stableBorrowRate),
        aTokenAddress: reserve.aTokenAddress,
        stableDebtTokenAddress: reserve.stableDebtTokenAddress,
        variableDebtTokenAddress: reserve.variableDebtTokenAddress,
        interestRateStrategyAddress: reserve.interestRateStrategyAddress,
        availableLiquidity: valueToBigNumber(reserve.availableLiquidity),
        totalPrincipalStableDebt: valueToBigNumber(reserve.totalPrincipalStableDebt),
        averageStableRate: valueToBigNumber(reserve.averageStableRate),
        stableDebtLastUpdateTimestamp: Number(reserve.stableDebtLastUpdateTimestamp),
        totalScaledVariableDebt: valueToBigNumber(reserve.totalScaledVariableDebt),
        variableRateSlope1: valueToBigNumber(reserve.variableRateSlope1),
        variableRateSlope2: valueToBigNumber(reserve.variableRateSlope2),
        stableRateSlope1: valueToBigNumber(reserve.stableRateSlope1),
        stableRateSlope2: valueToBigNumber(reserve.stableRateSlope2),
      }
    }
  }) as any[],
}));

console.log(
  calculateUserHealthFactor(
    (reserves[0].result as any)[0] as any[],
    (userReserves[0].result) as any[],
    currentTimestamp
  )
)*/
