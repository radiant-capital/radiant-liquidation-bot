import * as dotenv from 'dotenv';
dotenv.config();

export const NETWORK = process.env.HAHAHA || 'goerli';

export interface Environment {
  HTTP_JSON_RPC?: string;
  WS_JSON_RPC?: string;
  PRIVATE_KEY: `0x${string}`;
  CHAIN_ID: number;
  INITIAL_BLOCK: bigint;
  APPROVE_RESERVES: boolean;
  MIN_GROSS_PROFIT_USD: number;
}

export const environment: Environment = {
  HTTP_JSON_RPC: process.env.HTTP_JSON_RPC,
  WS_JSON_RPC: process.env.WS_JSON_RPC,
  PRIVATE_KEY: process.env.PRIVATE_KEY as any,
  CHAIN_ID: Number(process.env.CHAIN_ID),
  INITIAL_BLOCK: BigInt(process.env.INITIAL_BLOCK || '0'),
  APPROVE_RESERVES: process.env.APPROVE_RESERVES === 'true',
  MIN_GROSS_PROFIT_USD: Number(process.env.MIN_GROSS_PROFIT_USD)
}
