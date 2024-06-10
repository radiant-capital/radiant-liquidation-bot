import { Account, Chain, PublicClient, Transport, WalletClient } from 'viem';
import { LiquidationStrategy } from '@core/opportunities/entities';
import { safeContractCall } from '@core/wallet/transactions-sender';



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
  console.log(strategy.callData.address);
  console.log(strategy.callData.functionName);
  console.log(strategy.callData.args);
  console.log(strategy.callData.value);

  try {
    details.hash = await safeContractCall(
      walletClient,
      client,
      strategy.callData,
      (type, data) => {
        if (type === 'estimatedGas') {
          console.log(`Liquidation Estimated [${strategy.id}] – ${data} gas used`);
        } else if (type === 'simulated') {
          console.log(`Liquidation Simulated [${strategy.id}]:`, data);
        }
      }
    )

    console.log(`Liquidation Sent [${strategy.id}] – hash ${details.hash}`);

    const [transaction, receipt] = await Promise.all([
      client.getTransaction({ hash: details.hash as any }),
      client.getTransactionReceipt({ hash: details.hash as any }),
    ]);

    console.log(`Liquidation Receipt [${strategy.id}]:`, transaction, receipt);

    if (receipt.status === 'success') {
      details.status = 'success';
    } else {
      throw new Error('Transaction Reverted');
    }
  } catch (e) {
    console.log(`Liquidation Error [${strategy.id}]:`);
    console.error(e);
    details.status = 'error';
  }
}
