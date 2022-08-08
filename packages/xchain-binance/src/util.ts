import {AssetBNB, assetFromString, assetToBase} from '@xchainjs/xchain-util';
import {
  DexFees,
  Fee,
  TransferFee,
  Tx as BinanceTx,
  TxType as BinanceTxType,
} from '.';
import {assetAmount} from '../../../helpers/amount-helper';
import {Network, Tx, TxType} from '../../xchain-client/src';

export const BNB_DECIMAL = 8;

/**
 * Type guard for runtime checks of `Fee`
 *
 * @param {Fee|TransferFee|DexFees} v
 * @returns {boolean} `true` or `false`.
 */
export const isFee = (v: Fee | TransferFee | DexFees): v is Fee =>
  Boolean((v as Fee)?.msg_type) &&
  (v as Fee)?.fee !== undefined &&
  (v as Fee)?.fee_for !== undefined;

/**
 * Type guard for `TransferFee`
 *
 * @param {Fee|TransferFee|DexFees} v
 * @returns {boolean} `true` or `false`.
 */
export const isTransferFee = (
  v: Fee | TransferFee | DexFees,
): v is TransferFee =>
  isFee((v as TransferFee)?.fixed_fee_params) &&
  Boolean((v as TransferFee)?.multi_transfer_fee);

/**
 * Get TxType
 *
 * @param {BinanceTxType} t
 * @returns {TxType} `transfer` or `unknown`.
 */
const getTxType = (t: BinanceTxType): TxType => {
  if (t === 'TRANSFER' || t === 'DEPOSIT') return 'transfer';
  return 'unknown';
};

/**
 * Parse Tx
 *
 * @param {BinanceTx} t The transaction to be parsed. (optional)
 * @returns {Tx|null} The transaction parsed from the binance tx.
 */
export const parseTx = (tx: BinanceTx): Tx | null => {
  const asset = assetFromString(`${AssetBNB.chain}.${tx.txAsset}`, 0);
  if (!asset) return null;

  return {
    asset,
    from: [
      {
        from: tx.fromAddr,
        amount: assetToBase(assetAmount(tx.value, BNB_DECIMAL)),
      },
    ],
    to: [
      {
        to: tx.toAddr,
        amount: assetToBase(assetAmount(tx.value, BNB_DECIMAL)),
      },
    ],
    date: new Date(tx.timeStamp),
    type: getTxType(tx.txType),
    hash: tx.txHash,
    binanceFee: tx.txFee,
    confirmations: tx.confirmBlocks,
    ethCumulativeGasUsed: null,
    ethGas: null,
    ethGasPrice: null,
    ethGasUsed: null,
    ethTokenName: null,
    ethTokenSymbol: null,
    memo: tx.memo ?? null,
  };
};

/**
 * Get address prefix based on the network.
 *
 * @param {string} network
 * @returns {string} The address prefix based on the network.
 *
 **/
export const getPrefix = (network: string) =>
  network === Network.Testnet ? 'tbnb' : 'bnb';
