import {
  Asset,
  assetAmount,
  AssetLTC,
  assetToBase,
  BaseAmount,
  Chain,
} from '@xchainjs/xchain-util';
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
import {getAddress, getLtcKeys} from './get-address';
import * as sochain from './sochain-api';
import {Signature} from './types';
import {FeeRate, FeesWithRates} from './types/client-types';
import {TxIOInput, TxIOOutput} from './types/sochain-api-types';
import * as Utils from './utils';

const sochainUrl = 'https://sochain.com/api/v2';

const nodeUrls: {[key in Network]: string} = {
  mainnet: 'https://ltc.thorchain.info',
  stagenet: 'https://ltc.thorchain.info',
  testnet: 'https://testnet.ltc.thorchain.info',
};

const nodeAuth = {
  username: 'thorchain',
  password: 'password',
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

export const getExplorerUrl = (network: Network): string => {
  return Utils.isTestnet(network)
    ? 'https://tltc.bitaps.com'
    : 'https://ltc.bitaps.com';
};

export const getExplorerTxUrl = ({
  network,
  txID,
}: {
  network: Network;
  txID: string;
}): string => {
  return `${getExplorerUrl(network)}/${txID}`;
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
    throw new Error(
      'Wallet is in watching mode, but seed is required for this transaction',
    );
  }
  try {
    const sender = await getAddress({
      network: network,
      phrase: phrase,
    });
    if (!sender) {
      throw new Error(
        'Wallet is in watching mode, but seed is required for this transaction',
      );
    }
    const {psbt} = await Utils.buildTx({
      asset,
      amount,
      recipient,
      memo: memo ?? undefined,
      feeRate: feeRate || (await getFeeRates()).fast,
      sender,
      sochainUrl: sochainUrl,
      network: network,
    });
    const ltcKeys = await getLtcKeys({
      phrase: phrase.seedPhrase,
      index: phrase.walletIndex,
      network,
    });
    psbt.signAllInputs(ltcKeys); // Sign all inputs
    psbt.finalizeAllInputs(); // Finalise inputs
    const txHex = psbt.extractTransaction().toHex(); // TX extracted and formatted to hex

    return await Utils.broadcastTx({
      network,
      txHex,
      nodeUrl: nodeUrls[network],
      auth: nodeAuth,
    });
  } catch (e) {
    return Promise.reject(e);
  }
};

export const getFeesWithRates = async (
  memo: string | null,
): Promise<FeesWithRates> => {
  const nextBlockFeeRate = await sochain.getSuggestedTxFee();
  const rates: FeeRates = {
    fastest: nextBlockFeeRate * 5,
    fast: nextBlockFeeRate * 1,
    average: nextBlockFeeRate * 0.5,
  };

  const fees: Fees = {
    type: 'byte',
    fast: calcUtxoFee(rates.fast, memo, Chain.Litecoin),
    average: calcUtxoFee(rates.average, memo, Chain.Litecoin),
    fastest: calcUtxoFee(rates.fastest, memo, Chain.Litecoin),
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

export const getFees = async ({data}: {data: string | null}): Promise<Fees> => {
  const {fees} = await getFeesWithRates(data);
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
      sochainUrl: sochainUrl,
      network: network,
      address: `${params?.address}`,
    });
    const total = response.txs.length;
    const transactions: Tx[] = [];

    const txs = response.txs.filter(
      (_, index) => offset <= index && index < offset + limit,
    );
    for (const txItem of txs) {
      const rawTx = await sochain.getTx({
        sochainUrl: sochainUrl,
        network,
        hash: txItem.txid,
      });
      const tx: Tx = {
        asset: AssetLTC,
        from: rawTx.inputs.map((i: TxIOInput) => ({
          from: i.address,
          amount: assetToBase(assetAmount(i.value, Utils.LTC_DECIMAL)),
        })),
        to: rawTx.outputs
          // ignore tx with type 'nulldata'
          .filter((i: TxIOOutput) => i.type !== 'nulldata')
          .map((i: TxIOOutput) => ({
            to: i.address,
            amount: assetToBase(assetAmount(i.value, Utils.LTC_DECIMAL)),
          })),
        date: new Date(rawTx.time * 1000),
        type: 'transfer',
        hash: rawTx.txid,
        binanceFee: null,
        confirmations: rawTx.confirmations,
        ethCumulativeGasUsed: null,
        ethGas: null,
        ethGasPrice: null,
        ethGasUsed: null,
        ethTokenName: null,
        ethTokenSymbol: null,
        memo: null,
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
  const rawTx = await sochain.getTx({
    sochainUrl: sochainUrl,
    network: network,
    hash: txId,
  });
  return {
    asset: AssetLTC,
    from: rawTx.inputs.map((i) => ({
      from: i.address,
      amount: assetToBase(assetAmount(i.value, Utils.LTC_DECIMAL)),
    })),
    to: rawTx.outputs.map((i) => ({
      to: i.address,
      amount: assetToBase(assetAmount(i.value, Utils.LTC_DECIMAL)),
    })),
    date: new Date(rawTx.time * 1000),
    type: 'transfer',
    hash: rawTx.txid,
    confirmations: rawTx.confirmations,
    binanceFee: null,
    ethCumulativeGasUsed: null,
    ethGas: null,
    ethGasPrice: null,
    ethGasUsed: null,
    ethTokenName: null,
    ethTokenSymbol: null,
    memo: null,
  };
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

  const keys = await getLtcKeys({
    phrase: phrase.seedPhrase,
    network,
    index: phrase.walletIndex,
  });
  const signature = keys.sign(msgBuffer).toString('hex');
  const pubKey = keys.publicKey.toString('hex');

  return {signature, pubKey};
};

export type {Network};
