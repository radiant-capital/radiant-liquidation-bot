import { LiquidationStrategy } from '@core/opportunities/entities';
import { Account, Chain, PublicClient, Transport, WalletClient } from 'viem';


interface LiquidationTransactionDetails {
  hash?: string;
  status: 'pending' | 'success' | 'error';
  strategy: LiquidationStrategy;
}

const transactions: Record<string, LiquidationTransactionDetails> = {};
export async function sendStrategy(
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

  try {
    const gas = await client.estimateContractGas({
      address: strategy.call.address,
      abi: strategy.call.abi,
      functionName: strategy.call.functionName,
      args: strategy.call.args,
      account: walletClient.account,
    });

    console.log(`Liquidation Estimated [${strategy.id}] – ${gas} gas used`);

    const simulation = await client.simulateContract({
      address: strategy.call.address,
      abi: strategy.call.abi,
      functionName: strategy.call.functionName,
      args: strategy.call.args,
      account: walletClient.account,
    });

    console.log(`Liquidation Simulated [${strategy.id}]:`, simulation);

    details.hash = await walletClient.writeContract({
      address: strategy.call.address,
      abi: strategy.call.abi,
      functionName: strategy.call.functionName,
      args: strategy.call.args,
    });

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
