import * as dotenv from 'dotenv';
import * as process from 'process';
import { parseAddress, parseAddresses } from '@entities/environment/parsers';
dotenv.config();

export interface Environment {
  HTTP_JSON_RPC?: string;
  WS_JSON_RPC?: string;
  PRIVATE_KEY: `0x${string}`;
  CHAIN_ID: number;
  INITIAL_BLOCK: bigint;
  APPROVE_RESERVES: boolean;
  MIN_GROSS_PROFIT_USD: number;

  LIQUIDATION_COLLATERAL_ASSETS: string[] | null;
  LIQUIDATION_DEBT_ASSETS: string[] | null;

  UI_POOL_DATA_PROVIDER_ADDRESS: `0x${string}`;
  LENDING_POOL_ADDRESSES_PROVIDER: `0x${string}`;

  GMX_DATA_STORE_ADDRESS: `0x${string}`;
  GMX_LIQUIDATOR_ADDRESS: `0x${string}`;
  GMX_TOKENS_ADDRESSES: string[];
  GMX_SELL_TOKENS_ADDRESSES: string[];
}

export const environment: Environment = {
  HTTP_JSON_RPC: process.env.HTTP_JSON_RPC,
  WS_JSON_RPC: process.env.WS_JSON_RPC,
  PRIVATE_KEY: process.env.PRIVATE_KEY as any,
  CHAIN_ID: Number(process.env.CHAIN_ID),
  INITIAL_BLOCK: BigInt(process.env.INITIAL_BLOCK || '0'),
  APPROVE_RESERVES: process.env.APPROVE_RESERVES === 'true',
  MIN_GROSS_PROFIT_USD: Number(process.env.MIN_GROSS_PROFIT_USD),

  LIQUIDATION_COLLATERAL_ASSETS: parseAddresses(process.env.LIQUIDATION_COLLATERAL_ASSETS),
  LIQUIDATION_DEBT_ASSETS: parseAddresses(process.env.LIQUIDATION_DEBT_ASSETS),

  UI_POOL_DATA_PROVIDER_ADDRESS: parseAddress(process.env.UI_POOL_DATA_PROVIDER_ADDRESS, true),
  LENDING_POOL_ADDRESSES_PROVIDER: parseAddress(process.env.LENDING_POOL_ADDRESSES_PROVIDER, true),

  GMX_DATA_STORE_ADDRESS: parseAddress(process.env.GMX_DATA_STORE_ADDRESS, true),
  GMX_LIQUIDATOR_ADDRESS: parseAddress(process.env.GMX_LIQUIDATOR_ADDRESS, true),
  GMX_TOKENS_ADDRESSES: parseAddresses(process.env.GMX_TOKENS_ADDRESSES) ?? [],
  GMX_SELL_TOKENS_ADDRESSES: parseAddresses(process.env.GMX_SELL_TOKENS_ADDRESSES) ?? [],
}
