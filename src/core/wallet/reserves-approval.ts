import { Account, Chain, PublicClient, Transport, WalletClient } from 'viem';
import { approveSpenderIfNeeded } from '@libs/helpers/approvals';
import { ReserveData } from '@entities/reserves';

export async function approveReserves(
  reserves: ReserveData[],
  walletClient: WalletClient<Transport, Chain, Account>,
  client: PublicClient,
  spenderAddress: `0x${string}`,
) {
  const time = Date.now();

  for (let i = 0; i < reserves.length; i++) {
    const reserve = reserves[i];

    const result = await approveSpenderIfNeeded(
      walletClient,
      client,
      reserve.underlyingAsset,
      spenderAddress,
    );

    console.log(`Approved: [${i + 1} / ${reserves.length}]`, `${reserve.symbol} – ${result.approveHash ? `approved just now ${result.approveHash}` : `enough allowance`}`);
  }

  console.log(`Approved all reserves – in ${(Date.now() - time) / 1000} sec`)
}
