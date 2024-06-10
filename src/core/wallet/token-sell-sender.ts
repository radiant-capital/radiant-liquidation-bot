import { safeContractCall } from '@core/wallet/transactions-sender';
import { Account, Chain, PublicClient, Transport, WalletClient } from 'viem';
import { TokenSell } from '@core/swap/entities';
import { retry } from '@utils/promise';

export async function sendTokenSell(
  walletClient: WalletClient<Transport, Chain, Account>,
  client: PublicClient,
  tokenSell: TokenSell,
) {
  console.log(`Token Sell Submitted [${tokenSell.id}] – ${tokenSell.amount} of ${Number(tokenSell.token) / (10 ** 8)}`);

  try {
    const trn = await retry(async () => {
      return await safeContractCall(walletClient, client, tokenSell.callData, (type, data) => {
        if (type === 'estimatedGas') {
          console.log(`Token Sell Estimated [${tokenSell.id}] – ${data} gas used`);
        } else if (type === 'simulated') {
          console.log(`Token Sell Simulated [${tokenSell.id}]:`, data);
        }
      });
    }, 5, 60000);

    console.log(`Token Sell Sent [${tokenSell.id}] – hash ${trn}`);
  } catch (e) {
    console.log(`Token Sell Error [${tokenSell.id}]:`);
    console.error(e);
  }
}
