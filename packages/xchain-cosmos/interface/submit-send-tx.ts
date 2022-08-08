import {
  Asset,
  AssetAmount,
  assetToBase,
  BaseAmount,
} from '@xchainjs/xchain-util';
import BigNumber from 'bignumber.js';
import {PendingTx} from '../../../clients/chains/types/pending-tx';
import {DecryptedWallet} from '../../../store/phrase/phrase-state';
import {Network} from '../../xchain-client/src';
import {getExplorerTxUrl, transfer} from '../src';

export const submitSendTx = async ({
  network,
  phrase,
  asset,
  amount,
  recipient,
  memo,
  feeAmount,
  feeAsset,
  gasLimit,
}: {
  network: Network;
  phrase: DecryptedWallet;
  asset: Asset;
  amount: AssetAmount;
  recipient: string;
  memo: string | null;
  feeAmount: BaseAmount;
  feeAsset: Asset;
  gasLimit: BigNumber;
}): Promise<PendingTx> => {
  const txHash = await transfer({
    network,
    phrase,
    asset,
    amount: assetToBase(amount),
    recipient,
    memo,
    feeAmount,
    feeAsset,
    gasLimit,
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
