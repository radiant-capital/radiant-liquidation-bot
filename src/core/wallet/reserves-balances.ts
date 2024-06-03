import { Account, Chain, PublicClient, Transport, WalletClient } from 'viem';
import { ReserveData } from '@entities/reserves';
import { balanceOf } from '@core/wallet/balances';

export async function printBalancesOfReserves(
  reserves: ReserveData[],
  walletClient: WalletClient<Transport, Chain, Account>,
  client: PublicClient,
) {
  const balances = await Promise.all(reserves.map(res => balanceOf(client, walletClient.account.address, res.underlyingAsset)));

  console.log(`Account balance of ${walletClient.account.address}:`);
  const str = (count: number, char: string = ' ') => Array.from({ length: count }).map(() => char).join('');
  const mStr = (s: string, minWidth: number, ahead = false) => ahead ? `${str(minWidth - s.length)}${s}` : `${s}${str(minWidth - s.length)}`;

  const maxSymbolWidth = reserves.reduce((max, item) => Math.max(item.symbol.length, max), 0);
  const balancesFormatted = balances.map((balance, i) => (Number(balance) / Number(10n ** reserves[i].decimals)).toFixed(6));
  const maxBalanceWidth = balancesFormatted.reduce((max, item) => Math.max(item.length, max), 0);

  for (let i = 0; i < reserves.length; i++) {
    const reserve = reserves[i];
    console.log(
      `[${reserve.underlyingAsset}]`,
      `${mStr(reserve.symbol, maxSymbolWidth)}`,
      `${mStr(balancesFormatted[i], maxBalanceWidth, true)}`
    )
  }
}
