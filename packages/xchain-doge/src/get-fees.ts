import {Chain} from '@xchainjs/xchain-util';
import {calcUtxoFee} from '../../../helpers/calculate-utxo-fee';
import {Fees} from '../../xchain-client/src';
import {FeeRates} from './types/common';

// const DEFAULT_SUGGESTED_TRANSACTION_FEE = 450000;

export const getDogeFeeRates = (): FeeRates => {
  /*   try {
     const response = await fetch(`https://api.blockcypher.com/v1/doge/main`);
     const json = await response.json();
     return {
       fastest: json.high_fee_per_kb / 1000,
       fast: json.medium_fee_per_kb / 1000,
       average: json.low_fee_per_kb / 1000,
     }; */

  // current recommendations are to fix to 0.01 Doge/kb
  // https://github.com/dogecoin/dogecoin/blob/master/doc/fee-recommendation.md
  return {
    fastest: (1 * 10 ** 8) / 1000,
    fast: (0.011 * 10 ** 8) / 1000,
    average: (0.01 * 10 ** 8) / 1000,
  };
  /* } catch (error) {
    console.log('error estimating doge fee, falling back to default', error);
    return {
      fast: DEFAULT_SUGGESTED_TRANSACTION_FEE,
      average: DEFAULT_SUGGESTED_TRANSACTION_FEE,
      fastest: DEFAULT_SUGGESTED_TRANSACTION_FEE,
    };
  } */
};

export const getDogeFees = ({
  feeRates,
  memo,
}: {
  feeRates: FeeRates;
  memo: string | null;
}): Fees => {
  return {
    type: 'byte',
    fast: calcUtxoFee(feeRates.fast, memo, Chain.Doge),
    average: calcUtxoFee(feeRates.average, memo, Chain.Doge),
    fastest: calcUtxoFee(feeRates.fastest, memo, Chain.Doge),
  };
};
