/**
 * Type definitions for Binance Chain API
 * @see https://docs.binance.org/api-reference/dex-api/
 *
 */
import {NETWORK_PREFIX_MAPPING} from '@binance-chain/javascript-sdk/lib/client';
import {Msg, StdSignature} from '@binance-chain/javascript-sdk/lib/types';

/**
 * Address
 */
type Address = string;

/**
 * TxPage
 * @see https://docs.binance.org/api-reference/dex-api/paths.html#txpage
 */
export type TxPage = {
  /**
   * total sum of transactions
   */
  total: number;
  /**
   * List of transactions
   */
  tx: Txs;
};

type FeeType =
  | 'submit_proposal'
  | 'deposit'
  | 'vote'
  | 'create_validator'
  | 'remove_validator'
  | 'dexList'
  | 'orderNew'
  | 'orderCancel'
  | 'issueMsg'
  | 'mintMsg'
  | 'tokensBurn'
  | 'tokensFreeze'
  | 'send'
  | 'timeLock'
  | 'timeUnlock'
  | 'timeRelock'
  | 'setAccountFlags'
  | 'HTLT'
  | 'depositHTLT'
  | 'claimHTLT'
  | 'refundHTLT';

export type Fee = {
  msg_type: FeeType;
  fee: number;
  fee_for: number;
};

export type TransferFee = {
  fixed_fee_params: Fee;
  multi_transfer_fee: number;
  lower_limit_as_multi: number;
};

type DexFeeName =
  | 'ExpireFee'
  | 'ExpireFeeNative'
  | 'CancelFee'
  | 'CancelFeeNative'
  | 'FeeRate'
  | 'FeeRateNative'
  | 'IOCExpireFee'
  | 'IOCExpireFeeNative';

type DexFee = {
  fee_name: DexFeeName;
  fee_value: number;
};

export type DexFees = {
  dex_fee_fields: DexFee[];
};

export type BinanceFees = Array<Fee | TransferFee | DexFees>;

/**
 * Tx
 * @see https://docs.binance.org/api-reference/dex-api/paths.html#tx
 */
export type Tx = {
  /**
   * block height
   */
  blockHeight: number;
  /**
   * transaction result code
   */
  code: number;
  /**
   * _no offical description_
   */
  confirmBlocks: number;
  /**
   * _no offical description_
   */
  data: string | null;
  /**
   * From address
   */
  fromAddr: Address;
  /**
   * Order ID
   */
  orderId: string | null;
  /**
   * Time of transaction
   */
  timeStamp: string;
  /**
   * To address
   */
  toAddr: Address;
  /**
   * _no offical description_
   */
  txAge: number;
  /**
   * _no offical description_
   */
  txAsset: string;
  /**
   * _no offical description_
   */
  txFee: string;
  /**
   * hash of transaction
   */
  txHash: string;
  /**
   * Type of transaction
   */
  txType: TxType;
  /**
   * memo
   */
  memo: string;
  /**
   * Value of transaction
   */
  value: string;
  /**
   * _no offical description_
   */
  source: number;
  /**
   * _no offical description_
   */
  sequence: number;
  /**
   * Optional. Available when the transaction type is one of HTL_TRANSFER, CLAIM_HTL, REFUND_HTL, DEPOSIT_HTL
   */
  swapId?: string;
  /**
   * _no offical description_
   */
  proposalId: string | null;
};

type Txs = Tx[];

/**
 * Type of transactions
 * @see https://docs.binance.org/api-reference/dex-api/paths.html#apiv1transactions
 */
export type TxType =
  | 'NEW_ORDER'
  | 'ISSUE_TOKEN'
  | 'BURN_TOKEN'
  | 'LIST_TOKEN'
  | 'CANCEL_ORDER'
  | 'FREEZE_TOKEN'
  | 'UN_FREEZE_TOKEN'
  | 'TRANSFER'
  | 'PROPOSAL'
  | 'VOTE'
  | 'MINT'
  | 'DEPOSIT'
  | 'CREATE_VALIDATOR'
  | 'REMOVE_VALIDATOR'
  | 'TIME_LOCK'
  | 'TIME_UNLOCK'
  | 'TIME_RELOCK'
  | 'SET_ACCOUNT_FLAG'
  | 'HTL_TRANSFER'
  | 'CLAIM_HTL'
  | 'DEPOSIT_HTL'
  | 'REFUND_HTL';

/**
 * Balance
 * @see https://docs.binance.org/api-reference/dex-api/paths.html#balance
 */
type Balance = {
  /**
   * asset symbol, e.g. BNB
   */
  symbol: string;
  /**
   * In decimal form, e.g. 0.00000000
   */
  free: string;
  /**
   * In decimal form, e.g. 0.00000000
   */
  locked: string;
  /**
   * In decimal form, e.g. 0.00000000
   */
  frozen: string;
};

export type Balances = Balance[];

export type Network = keyof typeof NETWORK_PREFIX_MAPPING;

type AminoWrapping<T> = {
  type: string;
  value: T;
};

type StdTransaction = {
  msg: Array<AminoWrapping<Msg>>;
  signatures: Array<StdSignature>;
  memo: string;
  source: number;
  data?: Buffer | null | string;
};

export type TransactionResult = {
  hash: string;
  log: string;
  data?: string;
  height: string;
  code: number;
  tx: AminoWrapping<StdTransaction>;
};

export type Account = {
  /**
   * Account number
   */
  account_number: number;
  /**
   * Address of the account
   */
  address: Address;
  /**
   * List of balances
   */
  balances: Balance[];
  /**
   * Public key bytes
   */
  public_key: number[];
  /**
   * sequence is for preventing replay attack
   */
  sequence: number;
};
