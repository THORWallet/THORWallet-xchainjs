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
  LtcAddressDTO,
  LtcAddressUTXOs,
  LtcGetBalanceDTO,
  LtcUnspentTxsDTO,
  SochainResponse,
  Transaction,
  TxHashParams,
} from './types/sochain-api-types';
import {LTC_DECIMAL} from './utils';

const DEFAULT_SUGGESTED_TRANSACTION_FEE = 1;

const toSochainNetwork = (net: string): string => {
  return net === Network.Testnet ? 'LTCTEST' : Chain.Litecoin;
};

/**
 * Get address information.
 *
 * @see https://sochain.com/api#get-display-data-address
 *
 * @param {string} sochainUrl The sochain node url.
 * @param {string} network
 * @param {string} address
 * @returns {LtcAddressDTO}
 */
export const getAddress = async ({
  sochainUrl,
  network,
  address,
}: AddressParams): Promise<LtcAddressDTO> => {
  const url = `${sochainUrl}/address/${toSochainNetwork(network)}/${address}`;
  const response = await axios.get(url);
  const addressResponse: SochainResponse<LtcAddressDTO> = response.data;
  return addressResponse.data;
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
  const url = `${sochainUrl}/get_tx/${toSochainNetwork(
    network,
  )}/${hash.toLowerCase()}`;
  const response = await axios.get(url);
  const tx: SochainResponse<Transaction> = response.data;
  return tx.data;
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
    const balanceResponse: SochainResponse<LtcGetBalanceDTO> = response.data;
    const confirmed = assetAmount(
      balanceResponse.data.confirmed_balance,
      LTC_DECIMAL,
    );
    const unconfirmed = assetAmount(
      balanceResponse.data.unconfirmed_balance,
      LTC_DECIMAL,
    );
    const netAmt = confirmed.amount().plus(unconfirmed.amount());
    const result = assetToBase(assetAmount(netAmt, LTC_DECIMAL));
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
 * @returns {LtcAddressUTXOs}
 */
export const getUnspentTxs = async ({
  sochainUrl,
  network,
  address,
  startingFromTxId,
}: AddressParams): Promise<LtcAddressUTXOs> => {
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
    const response: SochainResponse<LtcUnspentTxsDTO> = resp.data;
    const txs = response.data.txs;
    if (txs.length === 100) {
      //fetch the next batch
      // @ts-expect-error
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
 * Get Litecoin suggested transaction fee.
 *
 * @returns {number} The Litecoin suggested transaction fee per bytes in sat.
 */
export const getSuggestedTxFee = async (): Promise<number> => {
  //Note: sochain does not provide fee rate related data
  //So use Bitgo API for fee estimation
  //Refer: https://app.bitgo.com/docs/#operation/v2.tx.getfeeestimate
  try {
    const response = await axios.get('https://app.bitgo.com/api/v2/ltc/tx/fee');
    return response.data.feePerKb / 1000; // feePerKb to feePerByte
  } catch (error) {
    return DEFAULT_SUGGESTED_TRANSACTION_FEE;
  }
};
