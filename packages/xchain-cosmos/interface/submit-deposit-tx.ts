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

export const submitDepositTx = async ({
  network,
  phrase,
  asset,
  amount,
  inboundVaultAddress,
  memo,
  feeAmount,
  feeAsset,
  gasLimit,
}: {
  network: Network;
  phrase: DecryptedWallet;
  asset: Asset;
  amount: AssetAmount;
  inboundVaultAddress: string;
  memo: string;
  feeAmount: BaseAmount;
  feeAsset: Asset;
  gasLimit: BigNumber;
}): Promise<PendingTx> => {
  if (phrase.type === 'watching-address') {
    throw new Error('Wallet is in watching mode but operation requires seed');
  }

  const txHash = await transfer({
    network,
    phrase,
    asset,
    amount: assetToBase(amount),
    recipient: inboundVaultAddress,
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
