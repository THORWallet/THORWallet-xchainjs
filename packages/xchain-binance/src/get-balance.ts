import {BncClient} from '@binance-chain/javascript-sdk/lib/client';
import {
  Asset,
  AssetBNB,
  assetFromString,
  assetToBase,
  assetToString,
  BNBChain,
} from '@xchainjs/xchain-util';
import {Balances as BinanceBalances} from '.';
import {assetAmount, baseAmount} from '../../../helpers/amount-helper';
import {Balances, Network} from '../../xchain-client/src';
import {BNB_DECIMAL} from './util';

const getClientUrl = (network: Network): string => {
  return network === Network.Testnet
    ? 'https://testnet-dex.binance.org'
    : 'https://dex.binance.org';
};

export const getBalance = async ({
  network,
  address,
  assets,
}: {
  network: Network;
  address: string;
  assets?: Asset[];
}): Promise<Balances> => {
  const client = new BncClient(getClientUrl(network));
  const balances: BinanceBalances = await client.getBalance(address);

  let assetBalances = balances.map((balance) => {
    return {
      asset: assetFromString(`${BNBChain}.${balance.symbol}`, 0) || AssetBNB,
      amount: assetToBase(assetAmount(balance.free, BNB_DECIMAL)),
    };
  });

  // make sure we always have the bnb asset as balance in the array
  if (assetBalances.length === 0) {
    assetBalances = [
      {
        asset: AssetBNB,
        amount: baseAmount(0, BNB_DECIMAL),
      },
    ];
  }

  return assetBalances.filter(
    (balance) =>
      !assets ||
      assets.filter(
        (asset) => assetToString(balance.asset) === assetToString(asset),
      ).length,
  );
};
