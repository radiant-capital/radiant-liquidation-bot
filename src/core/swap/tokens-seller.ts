import { PublicClient } from 'viem';
import { listenBalanceChanges } from '@libs/helpers/balances';
import { TokenSell } from '@core/swap/entities';
import GMXRadiantLiquidatorAbi from '@abi/GMXRadiantLiquidator.json';

interface TokensSellerContext {
  gmxLiquidatorAddress: `0x${string}`,
  gmxSellTokensAddresses: string[],
}

export function listenTokensSell(
  client: PublicClient,
  context: TokensSellerContext,
  onTokenSell: (action: TokenSell) => void,
) {
  listenBalanceChanges(
    client,
    context.gmxLiquidatorAddress,
    context.gmxSellTokensAddresses,
    (balanceData) => {
      for (const item of balanceData) {
        console.log(`GMX Balance [${item.address}] – ${item.balance}`);

        if (item.balance > 0n) {
          const token = item.address;
          const amount = item.balance;

          onTokenSell({
            id: `${token}${amount}`,
            token,
            amount,
            callData: {
              address: context.gmxLiquidatorAddress,
              abi: GMXRadiantLiquidatorAbi as any,
              functionName: 'sellTokensForEth',
              args: [
                token,
                amount
              ]
            }
          });
        }
      }
    }
  )
}
