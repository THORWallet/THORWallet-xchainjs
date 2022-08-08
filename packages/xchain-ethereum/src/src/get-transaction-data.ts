import {Address, Tx} from '../../xchain-client/src';
import {SupportedChainIds} from './chain-id';
import * as etherscanAPI from './etherscan-api';
import * as ethplorerAPI from './ethplorer-api';
import {ethplorerApiKey, ethplorerUrl} from './ethplorer-api';
import {getJsonRpcProvider} from './get-json-rpc-provider';
import {TransactionOperation} from './types/ethplorer-api-types';
import {
  getTxFromEthplorerEthTransaction,
  getTxFromEthplorerTokenOperation,
} from './utils';

/**
 * Get the transaction details of a given transaction id.
 *
 * @param {string} txId The transaction id.
 * @param {string} assetAddress The asset address. (optional)
 * @returns {Tx} The transaction details of the given transaction id.
 *
 * @throws {"Need to provide valid txId"}
 * Thrown if the given txId is invalid.
 */
export const getTransactionData = async ({
  txId,
  assetAddress,
  chainId,
}: {
  txId: string;
  assetAddress?: Address;
  chainId: number;
}): Promise<Tx> => {
  if (chainId === SupportedChainIds.Ethereum) {
    // use ethplorerAPI for mainnet - ignore assetAddress
    const _txInfo = await ethplorerAPI.getTxInfo(
      ethplorerUrl,
      txId,
      ethplorerApiKey,
    );

    if (_txInfo.operations && _txInfo.operations.length > 0) {
      const _tx = getTxFromEthplorerTokenOperation(
        chainId,
        _txInfo.operations[0] as TransactionOperation,
      );
      if (!_tx) {
        throw new Error('Could not parse transaction data');
      }

      return _tx;
    }

    return getTxFromEthplorerEthTransaction(_txInfo);
  }

  let tx;
  const etherscan = getJsonRpcProvider(chainId);
  const txInfo = await etherscan.getTransaction(txId);
  if (txInfo) {
    if (assetAddress) {
      tx =
        (
          await etherscanAPI.getTokenTransactionHistory({
            assetAddress,
            startblock: txInfo.blockNumber,
            endblock: txInfo.blockNumber,
            chainId,
          })
        ).filter((info) => info.hash === txId)[0] ?? null;
    } else {
      tx =
        (
          await etherscanAPI.getETHTransactionHistory({
            startblock: txInfo.blockNumber,
            endblock: txInfo.blockNumber,
            address: txInfo.from,
            chainId,
          })
        ).filter((info) => info.hash === txId)[0] ?? null;
    }
  }

  if (!tx) {
    throw new Error('Could not get transaction history');
  }

  return tx;
};
