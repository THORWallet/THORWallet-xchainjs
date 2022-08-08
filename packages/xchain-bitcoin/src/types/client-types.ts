import {
  Address,
  BasicFeeOption,
  Fees,
  Network,
} from '../../../xchain-client/src';

export type FeeRate = number;
export type FeeRates = Record<BasicFeeOption, FeeRate>;

export type FeesWithRates = {rates: FeeRates; fees: Fees};

export type NormalTxParams = {
  addressTo: string;
  amount: number;
  feeRate: number;
};
export type VaultTxParams = NormalTxParams & {memo: string};

export type GetChangeParams = {
  valueOut: number;
  sochainUrl: string;
  network: Network;
  address: Address;
};

export type Signature = {
  signature: string;
  pubKey: string;
};

export type ClientUrl = Record<Network, string>;
