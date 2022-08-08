import {
  assetAmount,
  assetToBase,
  BaseAmount,
  Chain,
} from '@xchainjs/xchain-util';
import axios from 'axios';
import {Network} from '../../xchain-client/src';
import {
  AddressParams,
  BtcAddressDTO,
  BtcAddressUTXO,
  BtcAddressUTXOs,
  BtcGetBalanceDTO,
  BtcUnspentTxsDTO,
  SochainResponse,
  Transaction,
  TxConfirmedStatus,
  TxHashParams,
} from './types/sochain-api-types';
import {BTC_DECIMAL} from './utils';

const DEFAULT_SUGGESTED_TRANSACTION_FEE = 127;

const toSochainNetwork = (net: string): string => {
  return net === Network.Testnet ? 'BTCTEST' : Chain.Bitcoin;
};

/**
 * Get address information.
 *
 * @see https://sochain.com/api#get-display-data-address
 *
 * @param {string} sochainUrl The sochain node url.
 * @param {string} network
 * @param {string} address
 * @returns {BtcAddressDTO}
 */
export const getAddress = async ({
  sochainUrl,
  network,
  address,
}: AddressParams): Promise<BtcAddressDTO> => {
  try {
    const url = `${sochainUrl}/address/${toSochainNetwork(network)}/${address}`;
    const response = await axios.get(url);
    const addressResponse: SochainResponse<BtcAddressDTO> = response.data;
    return addressResponse.data;
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Get transaction by hash.
 *
 * @see https://sochain.com/api#get-tx
 *
 * @param {string} sochainUrl The sochain node url.
 * @param {string} network network id
 * @param {string} hash The transaction hash.
 * @returns {Transactions}
 */
export const getTx = async ({
  sochainUrl,
  network,
  hash,
}: TxHashParams): Promise<Transaction> => {
  try {
    const url = `${sochainUrl}/get_tx/${toSochainNetwork(
      network,
    )}/${hash.toLowerCase()}`;
    const response = await axios.get(url);
    const tx: SochainResponse<Transaction> = response.data;
    return tx.data;
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Get address balance.
 *
 * @see https://sochain.com/api#get-balance
 *
 * @param {string} sochainUrl The sochain node url.
 * @param {string} network
 * @param {string} address
 * @returns {number}
 */
export const getBalance = async ({
  sochainUrl,
  network,
  address,
}: AddressParams): Promise<BaseAmount> => {
  try {
    const url = `${sochainUrl}/get_address_balance/${toSochainNetwork(
      network,
    )}/${address}`;
    const response = await axios.get(url);
    const balanceResponse: SochainResponse<BtcGetBalanceDTO> = response.data;
    const confirmed = assetAmount(
      balanceResponse.data.confirmed_balance,
      BTC_DECIMAL,
    );
    const unconfirmed = assetAmount(
      balanceResponse.data.unconfirmed_balance,
      BTC_DECIMAL,
    );
    const netAmt = confirmed.amount().plus(unconfirmed.amount());
    const result = assetToBase(assetAmount(netAmt, BTC_DECIMAL));
    return result;
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Get unspent txs
 *
 * @see https://sochain.com/api#get-unspent-tx
 *
 * @param {string} sochainUrl The sochain node url.
 * @param {string} network
 * @param {string} address
 * @returns {BtcAddressUTXOs}
 */
export const getUnspentTxs = async ({
  sochainUrl,
  network,
  address,
  startingFromTxId,
}: AddressParams): Promise<BtcAddressUTXOs> => {
  try {
    let resp = null;
    if (startingFromTxId) {
      resp = await axios.get(
        `${sochainUrl}/get_tx_unspent/${toSochainNetwork(
          network,
        )}/${address}/${startingFromTxId}`,
      );
    } else {
      resp = await axios.get(
        `${sochainUrl}/get_tx_unspent/${toSochainNetwork(network)}/${address}`,
      );
    }
    const response: SochainResponse<BtcUnspentTxsDTO> = resp.data;
    const txs = response.data.txs;
    if (txs.length === 100 && txs[99]) {
      //fetch the next batch
      const lastTxId = txs[99].txid;

      const nextBatch = await getUnspentTxs({
        sochainUrl,
        network,
        address,
        startingFromTxId: lastTxId,
      });
      return txs.concat(nextBatch);
    } else {
      return txs;
    }
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Get Tx Confirmation status
 *
 * @see https://sochain.com/api#get-is-tx-confirmed
 *
 * @param {string} sochainUrl The sochain node url.
 * @param {string} network mainnet | testnet
 * @param {string} hash tx id
 * @returns {TxConfirmedStatus}
 */
export const getIsTxConfirmed = async ({
  sochainUrl,
  network,
  hash,
}: TxHashParams): Promise<TxConfirmedStatus> => {
  try {
    const {data} = await axios.get<SochainResponse<TxConfirmedStatus>>(
      `${sochainUrl}/is_tx_confirmed/${toSochainNetwork(
        network,
      )}/${hash.toLowerCase()}`,
    );
    return data.data;
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Get unspent txs and filter out pending UTXOs
 *
 * @see https://sochain.com/api#get-unspent-tx
 *
 * @param {string} sochainUrl The sochain node url.
 * @param {string} network
 * @param {string} address
 * @returns {BtcAddressUTXOs}
 */
export const getConfirmedUnspentTxs = async ({
  sochainUrl,
  network,
  address,
}: AddressParams): Promise<BtcAddressUTXOs> => {
  try {
    const txs = await getUnspentTxs({
      sochainUrl,
      network,
      address,
    });

    const confirmedUTXOs: BtcAddressUTXOs = [];

    await Promise.all(
      txs.map(async (tx: BtcAddressUTXO) => {
        const {is_confirmed: isTxConfirmed} = await getIsTxConfirmed({
          sochainUrl,
          network,
          hash: tx.txid,
        });

        if (isTxConfirmed) {
          confirmedUTXOs.push(tx);
        }
      }),
    );

    return confirmedUTXOs;
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Get Bitcoin suggested transaction fee.
 *
 * @returns {number} The Bitcoin suggested transaction fee per bytes in sat.
 */
export const getSuggestedTxFee = async (): Promise<number> => {
  //Note: sochain does not provide fee rate related data
  //So use Bitgo API for fee estimation
  //Refer: https://app.bitgo.com/docs/#operation/v2.tx.getfeeestimate
  try {
    const response = await axios.get('https://app.bitgo.com/api/v2/btc/tx/fee');
    return response.data.feePerKb / 1000; // feePerKb to feePerByte
  } catch (error) {
    return DEFAULT_SUGGESTED_TRANSACTION_FEE;
  }
};
