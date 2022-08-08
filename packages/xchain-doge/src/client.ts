import {Asset, AssetDOGE, assetToBase, BaseAmount} from '@xchainjs/xchain-util';
import RNSimple from 'react-native-simple-crypto';
import {assetAmount} from '../../../helpers/amount-helper';
import {extractMemoFromSochainDoge} from '../../../helpers/extract-memo';
import {DecryptedWallet} from '../../../store/phrase/phrase-state';
import {Signature} from '../../xchain-bitcoin/src';
import {FeeRate} from '../../xchain-bitcoincash/src';
import {
  Address,
  Fees,
  Network,
  Tx,
  TxHash,
  TxHistoryParams,
  TxsPage,
} from '../../xchain-client/src';
import * as blockcypher from './blockcypher-api';
import {DOGE_DECIMAL} from './const';
import {getDogecoinAddress, getDogeKeys} from './get-address';
import {getDogeFeeRates, getDogeFees} from './get-fees';
import * as sochain from './sochain-api';
import {TxIO} from './types/sochain-api-types';
import * as Utils from './utils';

const sochainUrl = 'https://sochain.com/api/v2';
const blockcypherUrl = 'https://api.blockcypher.com/v1';

export const getExplorerUrl = (network: Network): string => {
  switch (network) {
    case Network.Mainnet:
      return 'https://live.blockcypher.com/doge';
    case Network.Testnet:
      return 'https://blockexplorer.one/dogecoin/testnet';
    default:
      throw new Error('unknown network: ' + network);
  }
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
  switch (network) {
    case Network.Mainnet:
      return `${getExplorerUrl(network)}/tx/${txID}`;
    case Network.Testnet:
      return `${getExplorerUrl(network)}/tx/${txID}`;
    default:
      throw new Error('unknown network: ' + network);
  }
};

/**
 * Transfer Doge.
 *
 * @param {TxParams&FeeRate} params The transfer options.
 * @returns {TxHash} The transaction hash.
 */
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
  if (!feeRate) {
    throw new Error('has no fee rate');
  }

  const sender = await getDogecoinAddress({
    phrase,
    network,
  });
  if (sender === null) {
    throw new Error('wallet is in watching mode');
  }

  if (phrase.type === 'watching-address') {
    throw new Error('wallet is in watching mode');
  }

  console.log('has fee rate', feeRate);
  const {psbt} = await Utils.buildTx({
    asset,
    amount,
    recipient,
    memo: memo ?? undefined,
    feeRate: feeRate as number,
    sender,
    sochainUrl,
    network,
  });
  const dogeKeys = await getDogeKeys({
    phrase: phrase.seedPhrase,
    index: phrase.walletIndex,
    network,
  });
  psbt.signAllInputs(dogeKeys); // Sign all inputs
  psbt.finalizeAllInputs(); // Finalise inputs
  const txHex = psbt.extractTransaction().toHex(); // TX extracted and formatted to hex

  let nodeUrl: string;
  if (network === Network.Testnet) {
    const dogeadd = await getDogecoinAddress({
      network,
      phrase,
    });
    if (dogeadd === null) {
      throw new Error('wallet is in watching mode');
    }

    nodeUrl = sochain.getSendTxUrl({
      network,
      sochainUrl,
      address: dogeadd,
    });
  } else {
    nodeUrl = blockcypher.getSendTxUrl({
      network,
      blockcypherUrl,
    });
  }

  return Utils.broadcastTx({
    network,
    txHex,
    nodeUrl,
  });
};

export const getFees = (): Fees => {
  const feeRates = getDogeFeeRates();

  return getDogeFees({feeRates, memo: null});
};

export const validateAddress = ({
  network,
  address,
}: {
  network: Network;
  address: string;
}): boolean => {
  return Utils.validateAddress(network, address);
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
  const response = await sochain.getAddress({
    sochainUrl,
    network,
    address: `${params?.address}`,
  });
  const total = response.txs.length;
  const transactions: Tx[] = [];

  const txs = response.txs.filter(
    (_, index) => offset <= index && index < offset + limit,
  );
  for (const txItem of txs) {
    const rawTx = await sochain.getTx({
      sochainUrl,
      network,
      hash: txItem.txid,
    });
    const tx: Tx = {
      asset: AssetDOGE,
      from: rawTx.inputs.map((i: TxIO) => ({
        from: i.address,
        amount: assetToBase(assetAmount(i.value, DOGE_DECIMAL)),
      })),
      to: rawTx.outputs
        // ignore tx with type 'nulldata'
        .filter((i: TxIO) => i.type !== 'nulldata')
        .map((i: TxIO) => ({
          to: i.address,
          amount: assetToBase(assetAmount(i.value, DOGE_DECIMAL)),
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
      memo: extractMemoFromSochainDoge(rawTx),
    };
    transactions.push(tx);
  }

  const result: TxsPage = {
    total,
    txs: transactions,
  };
  return result;
};

export const getTransactionData = async ({
  network,
  txId,
}: {
  network: Network;
  txId: string;
}): Promise<Tx> => {
  const rawTx = await sochain.getTx({
    sochainUrl,
    network,
    hash: txId.toLowerCase(),
  });
  return {
    asset: AssetDOGE,
    from: rawTx.inputs.map((i) => ({
      from: i.address,
      amount: assetToBase(assetAmount(i.value, DOGE_DECIMAL)),
    })),
    to: rawTx.outputs.map((i) => ({
      to: i.address,
      amount: assetToBase(assetAmount(i.value, DOGE_DECIMAL)),
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
    memo: extractMemoFromSochainDoge(rawTx),
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
    throw new Error('wallet is in watch mode');
  }

  const keys = await getDogeKeys({
    phrase: phrase.seedPhrase,
    index: phrase.walletIndex,
    network,
  });
  const signature = keys.sign(msgBuffer).toString('hex');
  const pubKey = keys.publicKey.toString('hex');

  return {signature, pubKey};
};
