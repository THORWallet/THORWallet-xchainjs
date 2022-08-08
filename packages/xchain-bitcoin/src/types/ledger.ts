import {Address, Network, TxParams} from '../../../xchain-client/src';
import {FeeRate} from './client-types';
import {UTXOs} from './common';

export type LedgerTxInfo = {
  utxos: UTXOs;
  newTxHex: string;
};

export type LedgerTxInfoParams = Pick<TxParams, 'amount' | 'recipient'> & {
  feeRate: FeeRate;
  sender: Address;
  network: Network;
  sochainUrl: string;
  haskoinUrl: string;
};
