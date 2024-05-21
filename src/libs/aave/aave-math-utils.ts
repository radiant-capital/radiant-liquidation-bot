const WAD_RAY_RATIO = 10n ** 9n;
const HALF_WAD_RAY_RATIO = WAD_RAY_RATIO / 2n;

const RAY = 10n ** 27n;
const HALF_RAY = RAY / 2n;
const SECONDS_PER_YEAR = 31536000n;

function rayDiv(a: bigint, b: bigint): bigint {
  const halfB = b / 2n;
  return (halfB + a * RAY) / b;
}

function rayToWad(a: bigint): bigint {
  return (HALF_WAD_RAY_RATIO + a) / WAD_RAY_RATIO;
}

function rayMul(a: bigint, b: bigint): bigint {
  return (HALF_RAY + a * b) / RAY;
}

function wadToRay(a: bigint): bigint {
  return (a * WAD_RAY_RATIO);
}

function calculateLinearInterest(
  rate: bigint,
  lastUpdateTimestamp: number,
  currentTimestamp: number,
): bigint {
  const timeDelta = wadToRay(
    BigInt(currentTimestamp - lastUpdateTimestamp),
  );
  const timeDeltaInSeconds = rayDiv(
    timeDelta,
    wadToRay(SECONDS_PER_YEAR),
  );
  const a = rayMul(rate, timeDeltaInSeconds) + RAY;
  return a;
}

function binomialApproximatedRayPow(
  base: bigint,
  exp: bigint,
): bigint {
  if (exp === 0n) return RAY;
  const expMinusOne = exp - 1n;
  const expMinusTwo = exp > 2n ? exp - 2n : 0n;

  const basePowerTwo = rayMul(base, base);
  const basePowerThree = rayMul(basePowerTwo, base);

  const firstTerm = exp * base;
  const secondTerm = (exp * expMinusOne * basePowerTwo) / 2n;
  const thirdTerm = (exp * expMinusOne * expMinusTwo * basePowerThree) / 6n;

  return (RAY + firstTerm + secondTerm + thirdTerm);
}

function calculateCompoundedInterest(
  rate: bigint,
  lastUpdateTimestamp: number,
  currentTimestamp: number,
): bigint {
  const timeDelta = BigInt(currentTimestamp - lastUpdateTimestamp);
  const ratePerSecond = rate / SECONDS_PER_YEAR;
  return binomialApproximatedRayPow(ratePerSecond, timeDelta);
}

function getReserveNormalizedIncome(
  liquidityRate: bigint,
  liquidityIndex: bigint,
  lastUpdateTimestamp: number,
  currentTimestamp: number,
) {
  if (liquidityRate === 0n) {
    return liquidityIndex;
  }

  const cumulatedInterest = calculateLinearInterest(
    liquidityRate,
    lastUpdateTimestamp,
    currentTimestamp,
  );

  return rayMul(cumulatedInterest, liquidityIndex);
}

export function getLinearBalance(
  scaledATokenBalance: bigint,
  liquidityIndex: bigint,
  liquidityRate: bigint,
  lastUpdateTimestamp: number,
  currentTimestamp: number,
) {
  return rayToWad(
    rayMul(
      wadToRay(scaledATokenBalance),
      getReserveNormalizedIncome(
        liquidityRate,
        liquidityIndex,
        lastUpdateTimestamp,
        currentTimestamp,
      ),
    ),
  );
}

export function getCompoundedBalance(
  principalBalance: bigint,
  reserveIndex: bigint,
  reserveRate: bigint,
  lastUpdateTimestamp: number,
  currentTimestamp: number,
): bigint {
  if (principalBalance === 0n) {
    return principalBalance;
  }

  const compoundedInterest = calculateCompoundedInterest(
    reserveRate,
    lastUpdateTimestamp,
    currentTimestamp,
  );
  const cumulatedInterest = rayMul(compoundedInterest, reserveIndex);
  const principalBalanceRay = wadToRay(principalBalance);

  return rayToWad(
    rayMul(principalBalanceRay, cumulatedInterest),
  );
}

export function getCompoundedStableBalance(
  principalBalance: bigint,
  userStableRate: bigint,
  lastUpdateTimestamp: number,
  currentTimestamp: number,
): bigint {
  if (principalBalance === 0n) {
    return principalBalance;
  }

  const cumulatedInterest = calculateCompoundedInterest(
    userStableRate,
    lastUpdateTimestamp,
    currentTimestamp,
  );
  const principalBalanceRay = wadToRay(principalBalance);

  return rayToWad(
    rayMul(principalBalanceRay, cumulatedInterest),
  );
}
