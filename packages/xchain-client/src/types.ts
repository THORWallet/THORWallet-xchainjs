import {Asset, BaseAmount} from '@xchainjs/xchain-util';
import {BigNumber as EthBigNumber} from 'ethers';

export type Address = string;

export enum Network {
  Mainnet = 'mainnet',
  Stagenet = 'stagenet',
  Testnet = 'testnet',
}

export type Balance = {
  asset: Asset;
  amount: BaseAmount;
};

export type Balances = Balance[];

export type TxType = 'transfer' | 'unknown';

export type TxHash = string;

export type TxTo = {
  to: Address; // address
  amount: BaseAmount; // amount
};

export type TxFrom = {
  from: Address | TxHash; // address or tx id
  amount: BaseAmount; // amount
};

export type Tx = {
  asset: Asset; // asset
  from: TxFrom[]; // list of "from" txs. BNC will have one `TxFrom` only, `BTC` might have many transactions going "in" (based on UTXO)
  to: TxTo[]; // list of "to" transactions. BNC will have one `TxTo` only, `BTC` might have many transactions going "out" (based on UTXO)
  date: Date; // timestamp of tx
  type: TxType; // type
  hash: string; // Tx hash
  ethTokenSymbol: string | null;
  ethTokenName: string | null;
  ethGasPrice: string | null;
  ethGas: string | null;
  ethGasUsed: string | null;
  ethCumulativeGasUsed: string | null;
  confirmations: number | null;
  binanceFee: string | null;
  memo: string | null;
};

export type Txs = Tx[];

export type TxsPage = {
  total: number;
  txs: Txs;
};

export type TxHistoryParams = {
  address: Address; // Address to get history for
  offset?: number; // Optional Offset
  limit?: number; // Optional Limit of transactions
  startTime?: Date; // Optional start time
  asset?: string; // Optional asset. Result transactions will be filtered by this asset
};

export type TxParams = {
  walletIndex?: number; // send from this HD index
  asset?: Asset;
  amount: BaseAmount;
  recipient: Address;
  memo?: string; // optional memo to pass
  gasPrice?: string;
  gasLimit?: string;
};

export type BasicFeeOption = 'average' | 'fast' | 'fastest';

export type FeeOptionKey = {
  basicFee: BasicFeeOption;
  maxBaseFeeSlippage: EthBigNumber | null;
  customEthPriorityFee: EthBigNumber | null;
};
export type FeeOption = Record<BasicFeeOption, BaseAmount>;

export type FeeType =
  | 'byte' // fee will be measured as `BaseAmount` per `byte`
  | 'base'; // fee will be "flat" measured in `BaseAmount`

export type Fees = FeeOption & {
  type: FeeType;
};

export type RootDerivationPaths = {
  mainnet: string;
  stagenet: string;
  testnet: string;
};

export type XChainClientParams = Record<string, never>;

export interface XChainClient {}
