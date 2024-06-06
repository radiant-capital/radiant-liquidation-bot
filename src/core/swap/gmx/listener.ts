import { PublicClient } from 'viem';
import { listenBalanceChanges } from '@libs/helpers/balances';

export function listenForGMXTokensBalancesChanges(
  client: PublicClient,
  gmxLiquidatorAddress: `0x${string}`,
  gmxTokensAddresses: string[],
) {
  listenBalanceChanges(client, gmxLiquidatorAddress, gmxTokensAddresses, (balanceData) => {
    //TODO: send swap transactions.
  })
}
