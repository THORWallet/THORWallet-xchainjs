import {bnOrZero} from '@xchainjs/xchain-util';
import axios, {AxiosResponse} from 'axios';
import {getEtherscanishApiKey} from '../../../clients/chains/helpers/get-ethereum-config';
import {Txs} from '../../xchain-client/src';
import {getEtherscanishApiBaseUrl} from './eth-explorer-urls';
import {
  ETHTransactionInfo,
  GasOracleResponse,
  TokenTransactionInfo,
  TransactionHistoryParam,
} from './types/etherscan-api-types';
import {getTxFromEthTransaction, getTxFromTokenTransaction} from './utils';

const getApiKeyQueryParameter = (apiKey?: string): string =>
  apiKey ? `&apiKey=${apiKey}` : '';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getAxiosWithRateLimitHandling = async (
  url: string,
): Promise<AxiosResponse<any>> => {
  const response = await axios.get(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36',
    },
  });

  if (JSON.stringify(response.data).includes('Max rate limit reached')) {
    console.log(
      'reached rate limit for',
      url,
      'waiting 2s then trying again...',
    );
    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });
    return getAxiosWithRateLimitHandling(url);
  }

  return response;
};

/**
 * SafeGasPrice, ProposeGasPrice And FastGasPrice returned in string-Gwei
 *
 * @see https://etherscan.io/apis#gastracker
 *
 * @param {string} baseUrl The etherscan node url.
 * @param {string} apiKey The etherscan API key. (optional)
 * @returns {GasOracleResponse} LastBlock, SafeGasPrice, ProposeGasPrice, FastGasPrice
 */
export const getGasOracle = (
  baseUrl: string,
  apiKey?: string,
): Promise<GasOracleResponse> => {
  const url = baseUrl + '/api?module=gastracker&action=gasoracle';

  return getAxiosWithRateLimitHandling(
    url + getApiKeyQueryParameter(apiKey),
  ).then((response) => response.data.result);
};

/**
 * Get ETH transaction history
 *
 * @see https://etherscan.io/apis#accounts
 *
 * @param {string} baseUrl The etherscan node url.
 * @param {string} address The address.
 * @param {TransactionHistoryParam} params The search options.
 * @param {string} apiKey The etherscan API key. (optional)
 * @returns {Array<ETHTransactionInfo>} The ETH transaction history
 */
export const getETHTransactionHistory = async ({
  address,
  page,
  offset,
  startblock,
  endblock,
  chainId,
}: TransactionHistoryParam & {
  chainId: number;
}): Promise<Txs> => {
  let url =
    getEtherscanishApiBaseUrl(chainId) +
    `/api?module=account&action=txlist&sort=desc` +
    getApiKeyQueryParameter(getEtherscanishApiKey(chainId));
  if (address) url += `&address=${address}`;
  if (offset) url += `&offset=${offset}`;
  if (page) url += `&page=${page}`;
  if (startblock) url += `&startblock=${startblock}`;
  if (endblock) url += `&endblock=${endblock}`;

  try {
    const result: ETHTransactionInfo[] = await getAxiosWithRateLimitHandling(
      url,
    ).then((response) => response.data.result);
    if (JSON.stringify(result).includes('Invalid API Key')) {
      return Promise.reject(new Error('Invalid API Key'));
    }

    if (typeof result !== typeof []) {
      throw new Error(JSON.stringify(result));
    }

    return result
      .filter((tx) => !bnOrZero(tx.value).isZero())
      .map((tx) => getTxFromEthTransaction(tx, chainId));
  } catch (error) {
    return Promise.reject(error);
  }
};

/**
 * Get token transaction history
 *
 * @see https://etherscan.io/apis#accounts
 *
 * @param {string} baseUrl The etherscan node url.
 * @param {string} address The address.
 * @param {TransactionHistoryParam} params The search options.
 * @param {string} apiKey The etherscan API key. (optional)
 * @returns {Array<Tx>} The token transaction history
 */
export const getTokenTransactionHistory = async ({
  address,
  assetAddress,
  page,
  offset,
  startblock,
  endblock,
  chainId,
}: TransactionHistoryParam & {
  chainId: number;
}): Promise<Txs> => {
  let url =
    getEtherscanishApiBaseUrl(chainId) +
    `/api?module=account&action=tokentx&sort=desc` +
    getApiKeyQueryParameter(getEtherscanishApiKey(chainId));
  if (address) url += `&address=${address}`;
  if (assetAddress) url += `&contractaddress=${assetAddress}`;
  if (offset) url += `&offset=${offset}`;
  if (page) url += `&page=${page}`;
  if (startblock) url += `&startblock=${startblock}`;
  if (endblock) url += `&endblock=${endblock}`;

  try {
    const result: TokenTransactionInfo[] = await getAxiosWithRateLimitHandling(
      url,
    ).then((response) => response.data.result);
    if (JSON.stringify(result).includes('Invalid API Key')) {
      return Promise.reject(new Error('Invalid API Key'));
    }

    return result
      .filter((tx) => !bnOrZero(tx.value).isZero())
      .reduce((acc, cur) => {
        const tx = getTxFromTokenTransaction(chainId, cur);
        return tx ? [...acc, tx] : acc;
      }, [] as Txs);
  } catch (error) {
    return Promise.reject(error);
  }
};
