import {getAddress} from '@ethersproject/address';
// eslint-disable-next-line no-restricted-imports
import {BigNumber} from '@ethersproject/bignumber';
import {Contract} from '@ethersproject/contracts';
import {Provider} from '@ethersproject/providers';
import {
  Asset,
  AssetETH,
  assetFromString,
  assetToBase,
  assetToString,
  ETHChain,
} from '@xchainjs/xchain-util';
import {assetAmount, baseAmount} from '../../../helpers/amount-helper';
import {Network, Network as XChainNetwork, Tx} from '../../xchain-client/src';
import erc20ABI from './data/erc20.json';
import {getNativeEVMAsset} from './native-eth-asset';
import {Network as EthNetwork} from './types/client-types';
import {
  ETHTransactionInfo,
  TokenTransactionInfo,
} from './types/etherscan-api-types';
import {
  TransactionInfo,
  TransactionOperation,
} from './types/ethplorer-api-types';

export const ETH_DECIMAL = 18;
export const ETHPLORER_FREEKEY = 'freekey';

// from https://github.com/MetaMask/metamask-extension/blob/ee205b893fe61dc4736efc576e0663189a9d23da/ui/app/pages/send/send.constants.js#L39
// and based on recommendations of https://ethgasstation.info/blog/gas-limit/
export const SIMPLE_GAS_COST: BigNumber = BigNumber.from(21000);
export const BASE_TOKEN_GAS_COST: BigNumber = BigNumber.from(100000);

// default gas price in gwei
export const DEFAULT_GAS_PRICE = 50;

export const ETHNullAddress = '0x0000000000000000000000000000000000000000';

/**
 * XChainNetwork -> EthNetwork
 *
 * @param {XChainNetwork} network
 * @returns {EthNetwork}
 */
export const xchainNetworkToEths = (network: XChainNetwork): EthNetwork => {
  switch (network) {
    // DO NOT use switch/case's default branch
    // to be sure that ALL possible cases are
    // processed in a similar way to reverted ethNetworkToXchains
    case Network.Mainnet:
      return EthNetwork.MAIN;
    case Network.Stagenet:
      return EthNetwork.MAIN;
    case Network.Testnet:
      return EthNetwork.TEST;
    default:
      throw new Error('unknown ETH network' + network);
  }
};

/**
 * EthNetwork -> XChainNetwork
 *
 * @param {EthNetwork} network
 * @returns {XChainNetwork}
 */
export const ethNetworkToXchains = (network: EthNetwork): XChainNetwork => {
  switch (network) {
    // DO NOT use switch/case's default branch
    // to be sure that ALL possible cases are
    // processed in a similar way to reverted xchainNetworkToEths
    case EthNetwork.MAIN:
      return Network.Mainnet;
    case EthNetwork.TEST:
      return Network.Testnet;
    default:
      throw new Error('unknown ETH network' + network);
  }
};

export const validateAddress = ({address}: {address: string}): boolean => {
  try {
    getAddress(address);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Get token address from asset.
 *
 * @param {Asset} asset
 * @returns {string|null} The token address.
 */
export const getTokenAddress = (asset: Asset): string | null => {
  try {
    // strip 0X only - 0x is still valid
    return getAddress(
      asset.symbol.slice(asset.ticker.length + 1).replace(/^0X/, ''),
    );
  } catch (err) {
    return null;
  }
};

/**
 * Check if the symbol is valid.
 *
 * @param {string|null|undefined} symbol
 * @returns {boolean} `true` or `false`.
 */
export const validateSymbol = (symbol?: string | null): boolean =>
  symbol ? symbol.length >= 3 : false;

/**
 * Get transactions from token tx
 *
 * @param {TokenTransactionInfo} tx
 * @returns {Tx|null} The parsed transaction.
 */
export const getTxFromTokenTransaction = (
  chainId: number,
  tx: TokenTransactionInfo,
): Tx | null => {
  const decimals = parseInt(tx.tokenDecimal, 10) || ETH_DECIMAL;
  const symbol = tx.tokenSymbol;
  const address = tx.contractAddress;
  if (validateSymbol(symbol) && validateAddress({address})) {
    const tokenAsset = assetFromString(
      `${ETHChain}.${symbol}-${address}`,
      chainId,
    );
    if (tokenAsset) {
      return {
        asset: tokenAsset,
        from: [
          {
            from: tx.from,
            amount: baseAmount(tx.value, decimals),
          },
        ],
        to: [
          {
            to: tx.to,
            amount: baseAmount(tx.value, decimals),
          },
        ],
        date: new Date(parseInt(tx.timeStamp, 10) * 1000),
        type: 'transfer',
        hash: tx.hash,
        ethTokenSymbol: tx.tokenSymbol,
        ethTokenName: tx.tokenName,
        ethGasPrice: tx.gasPrice,
        ethGas: tx.gas,
        ethGasUsed: tx.gasUsed,
        ethCumulativeGasUsed: tx.cumulativeGasUsed,
        confirmations: Number(tx.confirmations),
        binanceFee: null,
        memo: null,
      };
    }
  }

  return null;
};

/**
 * Get transactions from ETH transaction
 *
 * @param {ETHTransactionInfo} tx
 * @returns {Tx} The parsed transaction.
 */
export const getTxFromEthTransaction = (
  tx: ETHTransactionInfo,
  chainId: number,
): Tx => {
  return {
    asset: getNativeEVMAsset(chainId),
    from: [
      {
        from: tx.from,
        amount: baseAmount(tx.value, ETH_DECIMAL),
      },
    ],
    to: [
      {
        to: tx.to,
        amount: baseAmount(tx.value, ETH_DECIMAL),
      },
    ],
    date: new Date(parseInt(tx.timeStamp, 10) * 1000),
    type: 'transfer',
    hash: tx.hash,
    confirmations: null,
    binanceFee: null,
    ethCumulativeGasUsed: null,
    ethGasUsed: tx.gasUsed,
    ethGas: tx.gas,
    ethGasPrice: tx.gasPrice,
    ethTokenName: null,
    ethTokenSymbol: null,
    memo: null,
  };
};

/**
 * Get transactions from operation
 *
 * @param {TransactionOperation} operation
 * @returns {Tx|null} The parsed transaction.
 */
export const getTxFromEthplorerTokenOperation = (
  chainId: number,
  operation: TransactionOperation,
): Tx | null => {
  const decimals = parseInt(operation.tokenInfo.decimals, 10) || ETH_DECIMAL;
  const {symbol, address} = operation.tokenInfo;
  if (validateSymbol(symbol) && validateAddress({address})) {
    const tokenAsset = assetFromString(
      `${ETHChain}.${symbol}-${address}`,
      chainId,
    );
    if (tokenAsset) {
      return {
        asset: tokenAsset,
        from: [
          {
            from: operation.from,
            amount: baseAmount(operation.value, decimals),
          },
        ],
        to: [
          {
            to: operation.to,
            amount: baseAmount(operation.value, decimals),
          },
        ],
        date: new Date(operation.timestamp * 1000),
        type: operation.type === 'transfer' ? 'transfer' : 'unknown',
        hash: operation.transactionHash,
        confirmations: null,
        binanceFee: null,
        ethCumulativeGasUsed: null,
        ethGas: null,
        ethGasPrice: null,
        ethGasUsed: null,
        ethTokenName: null,
        ethTokenSymbol: null,
        // TODO Jonny: Parse ETH Memo
        memo: null,
      };
    }
  }

  return null;
};

/**
 * Get transactions from ETH transaction
 *
 * @param {TransactionInfo} txInfo
 * @returns {Tx} The parsed transaction.
 */
export const getTxFromEthplorerEthTransaction = (
  txInfo: TransactionInfo,
): Tx => {
  return {
    asset: AssetETH,
    from: [
      {
        from: txInfo.from,
        amount: assetToBase(assetAmount(txInfo.value, ETH_DECIMAL)),
      },
    ],
    to: [
      {
        to: txInfo.to,
        amount: assetToBase(assetAmount(txInfo.value, ETH_DECIMAL)),
      },
    ],
    date: new Date(txInfo.timestamp * 1000),
    type: 'transfer',
    hash: txInfo.hash,
    confirmations: txInfo.confirmations ?? null,
    binanceFee: null,
    ethCumulativeGasUsed: null,
    ethGas: null,
    ethGasUsed: String(txInfo.gasUsed),
    ethGasPrice: null,
    ethTokenName: null,
    ethTokenSymbol: null,
    // TODO Jonny: Parse ETH Memo
    memo: null,
  };
};

/**
 * Calculate fees by multiplying .
 *
 * @returns {Fees} The default gas price.
 */
export const getFeeInWei = ({
  maxFeePerGas,
  maxPriorityFeePerGas,
  gasLimit,
}: {
  maxFeePerGas: BigNumber;
  maxPriorityFeePerGas: BigNumber;
  gasLimit: BigNumber;
}): BigNumber => maxFeePerGas.add(maxPriorityFeePerGas).mul(gasLimit);

/**
 * Get address prefix based on the network.
 *
 * @returns {string} The address prefix based on the network.
 *
 **/
export const getPrefix = () => '0x';

/**
 * Filter self txs
 *
 * @returns {T[]}
 *
 **/
export const filterSelfTxs = <
  T extends {from: string; to: string; hash: string},
>(
  txs: T[],
): T[] => {
  const filterTxs = txs.filter((tx) => tx.from !== tx.to);
  let selfTxs = txs.filter((tx) => tx.from === tx.to);
  while (selfTxs.length) {
    const selfTx = selfTxs[0];
    // @ts-expect-error
    filterTxs.push(selfTx);
    // @ts-expect-error
    selfTxs = selfTxs.filter((tx) => tx.hash !== selfTx.hash);
  }

  return filterTxs;
};

/**
 * Get Decimals
 *
 * @param {Asset} asset
 * @returns {Number} the decimal of a given asset
 *
 * @throws {"Invalid asset"} Thrown if the given asset is invalid
 * @throws {"Invalid provider"} Thrown if the given provider is invalid
 */
export const getDecimal = async (
  asset: Asset,
  provider: Provider,
): Promise<number> => {
  if (assetToString(asset) === assetToString(AssetETH)) {
    return Promise.resolve(ETH_DECIMAL);
  }

  const assetAddress = getTokenAddress(asset);
  if (!assetAddress) {
    throw new Error(`Invalid asset ${assetToString(asset)}`);
  }

  try {
    const contract: Contract = new Contract(assetAddress, erc20ABI, provider);
    const decimal: BigNumber = await contract.decimals();

    return BigNumber.from(decimal).toNumber();
  } catch (err) {
    throw new Error(`Invalid provider: ${err}`);
  }
};
