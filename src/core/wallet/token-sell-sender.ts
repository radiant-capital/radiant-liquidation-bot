import { safeContractCall } from '@core/wallet/transactions-sender';
import { Account, Chain, PublicClient, Transport, WalletClient } from 'viem';
import { TokenSell } from '@core/swap/entities';
import { retry } from '@utils/promise';
import { waitForTransactionReceipt } from 'viem/actions';

export async function sendTokenSell(
  walletClient: WalletClient<Transport, Chain, Account>,
  client: PublicClient,
  tokenSell: TokenSell,
) {
  console.log(`Token Sell Submitted [${tokenSell.id}] – ${tokenSell.amount} of ${tokenSell.token}`);

  let hash: `0x${string}` | null = null;

  try {
    hash = await retry(async () => {
      return await safeContractCall(walletClient, client, tokenSell.callData, (type, data) => {
        if (type === 'estimatedGas') {
          console.log(`Token Sell Estimated [${tokenSell.id}] – ${data} gas used`);
        } else if (type === 'simulated') {
          console.log(`Token Sell Simulated [${tokenSell.id}]:`, data?.result);
        }
      });
    }, 5, 60000);

    console.log(`Token Sell Sent [${tokenSell.id}] – hash ${hash}`);
  } catch (e) {
    console.log(`Token Sell Error [${tokenSell.id}]:`);
    console.error(e);
  }

  if (hash) {
    try {
      const receipt = await waitForTransactionReceipt(client, { hash, confirmations: 10 });
      console.log(`Token Sell Receipt [${tokenSell.id}] – ${receipt.status}`);
      if (receipt.status !== 'success') {
        console.log(receipt);
      }
    } catch (e) {
      console.log(`Token Sell Receipt [${tokenSell.id}] – error`);
      console.error(e);
    }
  }
}
