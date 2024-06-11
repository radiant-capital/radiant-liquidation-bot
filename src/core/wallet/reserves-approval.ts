import { Account, Chain, PublicClient, Transport, WalletClient } from 'viem';
import { approveSpenderIfNeeded } from '@libs/helpers/approvals';
import { ReserveData } from '@entities/reserves';

interface ApprovalRequest {
  reserve: ReserveData;
  spenderAddress: `0x${string}`;
  spenderName: string;
}

export async function approveReserves(
  reserves: ReserveData[],
  walletClient: WalletClient<Transport, Chain, Account>,
  client: PublicClient,
  lendingPoolAddress: `0x${string}`,
  gmxLiquidatorAddress: `0x${string}`,
  gmxTokensAddresses: string[],
  liquidationCollateralAssets: string[],
) {
  const time = Date.now();

  const gmxTokensAddressesSet = new Set<string>(gmxTokensAddresses);
  const liquidationCollateralAssetsSet = new Set<string>(liquidationCollateralAssets);
  const approvalRequests: ApprovalRequest[] = reserves
    .filter(reserve => liquidationCollateralAssetsSet.has(reserve.underlyingAsset.toLowerCase()))
    .map(reserve => {
      const isGmx = gmxTokensAddressesSet.has(reserve.underlyingAsset.toLowerCase());
      const spenderAddress = isGmx ? gmxLiquidatorAddress : lendingPoolAddress;
      const spenderName =
        spenderAddress === gmxLiquidatorAddress ? 'GMX Liquidator' :
        spenderAddress === lendingPoolAddress ? 'Lending Pool' :
        'Unknown';

      return <ApprovalRequest>{
        reserve,
        spenderAddress,
        spenderName,
      };
    });

  for (let i = 0; i < approvalRequests.length; i++) {
    const approvalRequest = approvalRequests[i];
    const { reserve, spenderAddress, spenderName } = approvalRequest;

    const result = await approveSpenderIfNeeded(
      walletClient,
      client,
      reserve.underlyingAsset,
      spenderAddress,
    );

    console.log(`Approved: [${i + 1} / ${approvalRequests.length}]`, `${reserve.symbol} to ${spenderName} – ${result.approveHash ? `approved just now ${result.approveHash}` : `enough allowance`}`);
  }

  console.log(`Approved all reserves – in ${(Date.now() - time) / 1000} sec`)
}
