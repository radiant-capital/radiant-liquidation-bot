import { Account, Chain, PublicClient, Transport, WalletClient } from 'viem';
import { LiquidationStrategy } from '@core/opportunities/entities';
import { safeContractCall } from '@core/wallet/transactions-sender';
import { waitForTransactionReceipt } from 'viem/actions';



interface LiquidationTransactionDetails {
  hash?: string;
  status: 'pending' | 'success' | 'error';
  strategy: LiquidationStrategy;
}

const transactions: Record<string, LiquidationTransactionDetails> = {};
export async function sendLiquidationStrategy(
  walletClient: WalletClient<Transport, Chain, Account>,
  client: PublicClient,
  strategy: LiquidationStrategy
) {
  if (Object.values(transactions).some(trn => trn.status === 'pending')) {
    return;
  }

  let details = transactions[strategy.id];

  if (details && details.status !== 'error') {
    return;
  }

  details = { strategy, status: 'pending' };
  transactions[strategy.id] = details;

  console.log(`Liquidation Submitted [${strategy.id}] – ${Number(strategy.grossProfitMF) / (10 ** 8)} gross profit`);
  console.log(strategy.callData.address, strategy.callData.functionName, strategy.callData.args, strategy.callData.value);

  try {
    details.hash = await safeContractCall(
      walletClient,
      client,
      strategy.callData,
      (type, data) => {
        if (type === 'estimatedGas') {
          console.log(`Liquidation Estimated [${strategy.id}] – ${data} gas used`);
        } else if (type === 'simulated') {
          console.log(`Liquidation Simulated [${strategy.id}]:`, data?.result);
        }
      }
    )

    console.log(`Liquidation Sent [${strategy.id}] – hash ${details.hash}`);
  } catch (e) {
    console.log(`Liquidation Error [${strategy.id}]:`);
    console.error(e);
    details.status = 'error';
  }

  if (details.hash) {
    try {
      const receipt = await waitForTransactionReceipt(client, { hash: details.hash as any, confirmations: 10 });
      console.log(`Liquidation Receipt [${strategy.id}] – ${receipt.status}`);
      if (receipt.status !== 'success') {
        console.log(receipt);
        details.status = 'error';
      } else {
        details.status = 'success';
      }
    } catch (e) {
      console.log(`Liquidation Receipt [${strategy.id}] – error`);
      console.error(e);
      details.status = 'error';
    }
  }
}
