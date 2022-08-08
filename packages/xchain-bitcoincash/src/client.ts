import {Asset, BaseAmount, Chain} from '@xchainjs/xchain-util';
import {ECPair} from 'bitcoinjs-lib';
import RNSimple from 'react-native-simple-crypto';
import {calcUtxoFee} from '../../../helpers/calculate-utxo-fee';
import {DecryptedWallet} from '../../../store/phrase/phrase-state';
import {FeeRates} from '../../xchain-bitcoin/src';
import {
  Address,
  Fees,
  Network,
  Tx,
  TxHash,
  TxHistoryParams,
  TxsPage,
} from '../../xchain-client/src';
import {getAddress, getBCHKeys} from './get-address';
import {
  getAccount,
  getSuggestedFee,
  getTransaction,
  getTransactions as getTransactionsHaskoin,
} from './haskoin-api';
import {broadcastTx} from './node-api';
import {FeeRate, FeesWithRates} from './types/client-types';
import * as utils from './utils';

type Signature = {
  signature: string;
  pubKey: string;
};

export const haskoinUrl = {
  testnet: 'https://api.haskoin.com/bchtest',
  mainnet: 'https://api.haskoin.com/bch',
  stagenet: 'https://api.haskoin.com/bch',
};

const nodeAuth = {
  username: 'thorchain',
  password: 'password',
};

export const nodeUrl = {
  testnet: 'https://testnet.bch.thorchain.info',
  mainnet: 'https://bch.thorchain.info',
  stagenet: 'https://bch.thorchain.info',
};

export const getExplorerUrl = (network: Network): string => {
  const networkPath = utils.isTestnet(network) ? 'bch-testnet' : 'bch';
  return `https://www.blockchain.com/${networkPath}`;
};

export const getExplorerAddressUrl = ({
  network,
  address,
}: {
  network: Network;
  address: Address;
}): string => {
  return `${getExplorerUrl(network)}/address/${address}`;
};

export const getExplorerTxUrl = ({
  network,
  txID,
}: {
  network: Network;
  txID: string;
}): string => {
  return `${getExplorerUrl(network)}/tx/${txID}`;
};

export const transfer = async ({
  phrase,
  network,
  asset,
  amount,
  recipient,
  memo,
  feeRate,
}: {
  phrase: DecryptedWallet;
  network: Network;
  asset: Asset;
  amount: BaseAmount;
  recipient: Address;
  memo: string | null;
  feeRate: FeeRate;
}): Promise<TxHash> => {
  if (phrase.type === 'watching-address') {
    throw new Error('Wallet is in watching mode but operation requires seed');
  }

  const sender = await getAddress({
    network: network,
    phrase: phrase,
  });

  if (sender === null) {
    throw new Error('wallet is in watching mode');
  }

  const {builder, inputUTXOs} = await utils.buildTx({
    asset,
    amount,
    recipient,
    memo: memo || undefined,
    feeRate: feeRate || (await getFeeRates()).fast,
    sender,
    haskoinUrl: haskoinUrl[network],
    network: network,
  });

  const keyPair = await getBCHKeys({
    phrase: phrase,
    network,
  });

  inputUTXOs.forEach((utxo, index) => {
    builder.sign(index, keyPair, undefined, 0x41, utxo.witnessUtxo.value);
  });

  const tx = builder.build();
  const txHex = tx.toHex();

  return await broadcastTx({
    network: network,
    txHex,
    nodeUrl: nodeUrl[network],
    auth: nodeAuth,
  });
};

export const getFeesWithMemo = async (memo: string): Promise<Fees> => {
  const {fees} = await getFeesWithRates(memo);
  return fees;
};

export const getFeeRates = async (): Promise<FeeRates> => {
  const {rates} = await getFeesWithRates(null);
  return rates;
};

export const getFeesWithRates = async (
  memo: string | null,
): Promise<FeesWithRates> => {
  const nextBlockFeeRate = await getSuggestedFee();
  const rates: FeeRates = {
    fastest: nextBlockFeeRate * 5,
    fast: nextBlockFeeRate * 2,
    average: nextBlockFeeRate * 1,
  };

  const fees: Fees = {
    type: 'byte',
    fast: calcUtxoFee(rates.fast, memo, Chain.BitcoinCash),
    average: calcUtxoFee(rates.average, memo, Chain.BitcoinCash),
    fastest: calcUtxoFee(rates.fastest, memo, Chain.BitcoinCash),
  };

  return {fees, rates};
};

export const getFees = async ({data}: {data: string | null}): Promise<Fees> => {
  const {fees} = await getFeesWithRates(data);
  return fees;
};

export const getTransactions = async ({
  network,
  params,
}: {
  network: Network;
  params: TxHistoryParams;
}): Promise<TxsPage> => {
  try {
    const offset = params.offset || 0;
    const limit = params.limit || 10;

    const account = await getAccount({
      haskoinUrl: haskoinUrl[network],
      address: params.address,
    });
    const txs = await getTransactionsHaskoin({
      haskoinUrl: haskoinUrl[network],
      address: params.address,
      params: {offset, limit},
    });

    if (!account || !txs) {
      throw new Error('Invalid address');
    }

    return {
      total: account.txs,
      txs: txs.map(utils.parseTransaction),
    };
  } catch (error) {
    return Promise.reject(error);
  }
};

export const getTransactionData = async ({
  network,
  txId,
}: {
  network: Network;
  txId: string;
}): Promise<Tx> => {
  try {
    const tx = await getTransaction({haskoinUrl: haskoinUrl[network], txId});

    if (!tx) {
      throw new Error('Invalid TxID');
    }

    return utils.parseTransaction(tx);
  } catch (error) {
    return Promise.reject(error);
  }
};

export const signMessage = async ({
  phrase,
  network,
  msg,
}: {
  phrase: DecryptedWallet;
  network: Network;
  msg: string;
}): Promise<Signature> => {
  const msgHash = await RNSimple.SHA.sha256(msg);

  const msgBuffer = Buffer.from(msgHash, 'hex');

  if (phrase.type === 'watching-address') {
    throw new Error('Wallet is in watch mode');
  }

  const keys = await getBCHKeys({
    network,
    phrase: phrase,
  });
  const wif = keys.toWIF();

  // use bitcoinjs-lib ECPair, because @psf/bitcoincashjs-lib library operates on lower cryptographic level
  const ecpair = ECPair.fromWIF(wif, keys.getNetwork());

  const signature = ecpair.sign(msgBuffer).toString('hex');
  const pubKey = ecpair.publicKey.toString('hex');

  return {signature, pubKey};
};
