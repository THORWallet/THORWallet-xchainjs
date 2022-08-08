import {FeeRate} from '../../../xchain-bitcoin/src';
import {BasicFeeOption, Fees, Network} from '../../../xchain-client/src';

export type BroadcastTxParams = {
  network: Network;
  txHex: string;
  nodeUrl: string;
};

export type FeeRates = Record<BasicFeeOption, FeeRate>;

export type FeesWithRates = {rates: FeeRates; fees: Fees};
