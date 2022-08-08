import {Asset, AssetAmount, assetToBase} from '@xchainjs/xchain-util';
import {PendingTx} from '../../clients/chains/types/pending-tx';
import {DecryptedWallet} from '../../store/phrase/phrase-state';
import {FeeRate} from '../xchain-bitcoin/src';
import {Network} from '../xchain-client/src';
import {getExplorerTxUrl, transfer} from './src/client';

export const submitSendTx = async ({
  network,
  phrase,
  asset,
  amount,
  recipient,
  memo,
  feeRate,
}: {
  network: Network;
  phrase: DecryptedWallet;
  asset: Asset;
  amount: AssetAmount;
  recipient: string;
  memo: string | null;
  feeRate: FeeRate;
}): Promise<PendingTx> => {
  if (phrase.type === 'watching-address') {
    throw new Error('Wallet is in watching mode but operation requires seed');
  }

  const txHash = await transfer({
    network,
    phrase,
    asset,
    amount: assetToBase(amount),
    recipient,
    memo,
    feeRate,
  });
  return {
    txHash,
    txUrl: getExplorerTxUrl({network, txID: txHash}),
    asset,
    memo,
    cancelTx: null,
    speedUpTx: null,
  };
};
