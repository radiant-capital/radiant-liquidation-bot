import { UserReserveData } from '@entities/reserves';

export interface UserDetails {
  address: string;
  reserves: UserReserveData[];
  lastUpdateBlock: bigint;
}

export type UserDetailsMap = Record<string, UserDetails>;
