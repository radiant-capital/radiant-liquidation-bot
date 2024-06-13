import { UserReserveData } from '@entities/reserves';

export interface UserDetails {
  address: string;
  reserves: UserReserveData[];
  lastUpdateBlock: bigint;
}

export type UserDetailsMap = Record<string, UserDetails>;

export function includesCollateralAsset(userDetails: UserDetails, collateralSet: Set<string>): boolean {
  return userDetails.reserves.some(res => (
    collateralSet.has(res.underlyingAsset.toLowerCase()) &&
    res.usageAsCollateralEnabledOnUser
  ))
}
