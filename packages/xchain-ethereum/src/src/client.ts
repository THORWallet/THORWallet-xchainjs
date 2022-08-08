import {baseAmount} from '../../../helpers/amount-helper';
import {FeeOptionKey, Fees} from '../../xchain-client/src';
import {getGweiRange} from './get-ideal-eth-fees';
import {GasLimit, GasPrices} from './types/client-types';
import {ETH_DECIMAL} from './utils';

export const gasPricesToFees = (
  gasLimit: GasLimit,
  gasPrices: GasPrices,
  feeOptionKey: FeeOptionKey,
  chainId: number,
): Fees => {
  const [lower, upper] = getGweiRange({
    feeOptionKey,
    gasPrices,
    chainId,
  });
  const averageGwei = lower.add(upper).div(2);
  const amount = baseAmount(averageGwei.mul(gasLimit).toString(), ETH_DECIMAL);
  return {
    average: amount,
    fast: amount,
    fastest: amount,
    type: 'byte',
  };
};
