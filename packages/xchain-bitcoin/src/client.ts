import {
  Asset,
  assetAmount,
  AssetBTC,
  assetToBase,
  BaseAmount,
  Chain,
} from '@xchainjs/xchain-util';
import RNSimple from 'react-native-simple-crypto';
import {calcUtxoFee} from '../../../helpers/calculate-utxo-fee';
import {extractMemoFromSochainBtc} from '../../../helpers/extract-memo';
import {DecryptedWallet} from '../../../store/phrase/phrase-state';
import {
  Address,
  Fees,
  Network,
  Tx,
  TxHash,
  TxHistoryParams,
  TxsPage,
} from '../../xchain-client/src';
import {getAddress, getBtcKeys} from './get-address';
import * as sochain from './sochain-api';
import {FeeRate, FeeRates, FeesWithRates, Signature} from './types';
import * as Utils from './utils';

const sochainUrl = 'https://sochain.com/api/v2';
const blockstreamUrl = 'https://blockstream.info';

const haskoinUrl = {
  [Network.Testnet]: 'https://haskoin.ninerealms.com/btctest',
  [Network.Mainnet]: 'https://haskoin.ninerealms.com/btc',
  [Network.Stagenet]: 'https://haskoin.ninerealms.com/btc',
};

const rootDerivationPaths = {
  mainnet: `84'/0'/0'/0/`, //note this isn't bip44 compliant, but it keeps the wallets generated compatible to pre HD wallets
  testnet: `84'/1'/0'/0/`,
};

export const getExplorerUrl = (net: Network): string => {
  const networkPath = Utils.isTestnet(net) ? '/testnet' : '';
  return `https://blockstream.info${networkPath}`;
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

  /**
   * do not spend pending UTXOs when adding a memo
   * https://github.com/xchainjs/xchainjs-lib/issues/330
   */
  const spendPendingUTXO: boolean = !memo;

  const sender = await getAddress({
    network: network,
    phrase: phrase,
  });

  if (sender === null) {
    throw new Error('Wallet is in watching mode');
  }

  const {psbt} = await Utils.buildTx({
    asset,
    amount,
    recipient,
    memo: memo ?? undefined,
    feeRate: feeRate || (await getFeeRates()).fast,
    sender,
    sochainUrl: sochainUrl,
    haskoinUrl: haskoinUrl[network],
    network,
    spendPendingUTXO,
  });

  const btcKeys = getBtcKeys({
    phrase: phrase.seedPhrase,
    index: phrase.walletIndex,
    network,
  });
  psbt.signAllInputs(await btcKeys); // Sign all inputs
  psbt.finalizeAllInputs(); // Finalise inputs
  const txHex = psbt.extractTransaction().toHex(); // TX extracted and formatted to hex

  return await Utils.broadcastTx({
    network,
    txHex,
    blockstreamUrl: blockstreamUrl,
  });
};

export const getFeesWithRates = async (
  memo: string | null,
): Promise<FeesWithRates> => {
  const txFee = await sochain.getSuggestedTxFee();
  const rates: FeeRates = {
    fastest: txFee * 5,
    fast: txFee * 1,
    average: txFee * 0.5,
  };

  const fees: Fees = {
    type: 'byte',
    fast: calcUtxoFee(rates.fast, memo, Chain.Bitcoin),
    average: calcUtxoFee(rates.average, memo, Chain.Bitcoin),
    fastest: calcUtxoFee(rates.fastest, memo, Chain.Bitcoin),
  };

  return {fees, rates};
};

export const getFeeRates = async (): Promise<FeeRates> => {
  try {
    const {rates} = await getFeesWithRates(null);
    return rates;
  } catch (error) {
    return Promise.reject(error);
  }
};

export const getFees = async ({
  data,
}: {
  data?: string | null;
}): Promise<Fees> => {
  const {fees} = await getFeesWithRates(data ?? null);
  return fees;
};

export const getTransactions = async ({
  network,
  params,
}: {
  network: Network;
  params?: TxHistoryParams;
}): Promise<TxsPage> => {
  // Sochain API doesn't have pagination parameter
  const offset = params?.offset ?? 0;
  const limit = params?.limit || 10;

  try {
    const response = await sochain.getAddress({
      address: params?.address + '',
      sochainUrl: sochainUrl,
      network,
    });
    const total = response.txs.length;
    const transactions: Tx[] = [];

    for (const txItem of response.txs) {
      const rawTx = await sochain.getTx({
        sochainUrl: sochainUrl,
        network: network,
        hash: txItem.txid,
      });
      const tx: Tx = {
        asset: AssetBTC,
        from: rawTx.inputs.map((i) => ({
          from: i.address,
          amount: assetToBase(assetAmount(i.value, Utils.BTC_DECIMAL)),
        })),
        to: rawTx.outputs
          .filter((i) => i.type !== 'nulldata')
          .map((i) => ({
            to: i.address,
            amount: assetToBase(assetAmount(i.value, Utils.BTC_DECIMAL)),
          })),
        date: new Date(rawTx.time * 1000),
        type: 'transfer',
        hash: rawTx.txid,
        binanceFee: null,
        memo: extractMemoFromSochainBtc(rawTx),
        confirmations: rawTx.confirmations,
        ethCumulativeGasUsed: null,
        ethGas: null,
        ethGasPrice: null,
        ethGasUsed: null,
        ethTokenName: null,
        ethTokenSymbol: null,
      };
      transactions.push(tx);
    }

    const result: TxsPage = {
      total,
      txs: transactions,
    };
    return result;
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
    const rawTx = await sochain.getTx({
      sochainUrl: sochainUrl,
      network,
      hash: txId,
    });
    return {
      asset: AssetBTC,
      from: rawTx.inputs.map((i) => ({
        from: i.address,
        amount: assetToBase(assetAmount(i.value, Utils.BTC_DECIMAL)),
      })),
      to: rawTx.outputs.map((i) => ({
        to: i.address,
        amount: assetToBase(assetAmount(i.value, Utils.BTC_DECIMAL)),
      })),
      date: new Date(rawTx.time * 1000),
      type: 'transfer',
      hash: rawTx.txid,
      binanceFee: null,
      memo: null,
      confirmations: rawTx.confirmations,
      ethCumulativeGasUsed: null,
      ethGas: null,
      ethGasPrice: null,
      ethGasUsed: null,
      ethTokenName: null,
      ethTokenSymbol: null,
    };
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
    throw new Error('Wallet is in watching mode');
  }

  const keys = await getBtcKeys({
    phrase: phrase.seedPhrase,
    index: phrase.walletIndex,
    network,
  });
  const signature = keys.sign(msgBuffer).toString('hex');
  const pubKey = keys.publicKey.toString('hex');

  return {signature, pubKey};
};

export const getFeesWithMemo = (memo: string): Promise<Fees> => {
  throw new Error('Method not implemented.');
};

export type {Network};
