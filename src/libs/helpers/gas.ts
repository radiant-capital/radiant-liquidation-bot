import { PublicClient } from 'viem';
import { arbitrum } from 'viem/chains';
import { ReserveData } from '@entities/reserves';

export interface GasPriceData {
  price: bigint;
  decimals: bigint;
  priceMF: bigint;
  decimalsMF: bigint;
}

export interface GasPriceContext {
  reserves: ReserveData[];
}

export async function getGasPriceData(client: PublicClient, chainId: number, context: GasPriceContext): Promise<GasPriceData> {
  const weiPrice = await client.getGasPrice();

  if (chainId === arbitrum.id) {
    const wethReserve = context.reserves.find(reserve => reserve.underlyingAsset.toLowerCase() === '0x82af49447d8a07e3bd95bd0d56f35241523fbab1');

    if (!wethReserve) {
      throw new Error('weth not found');
    }

    return {
      price: weiPrice,
      decimals: wethReserve.decimals,
      priceMF: weiPrice * wethReserve.priceInMarketReferenceCurrency,
      decimalsMF: wethReserve.decimals,
    };
  } else {
    throw new Error(`ChainId ${chainId} isn't supported`);
  }
}

export function calculateGasFeeMF(gas: bigint, data: GasPriceData): bigint {
  return gas * data.priceMF / (10n ** data.decimalsMF);
}
