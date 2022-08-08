// eslint-disable-next-line no-restricted-imports
import {BigNumber} from 'ethers';
import {FeeOptionKey} from '../../xchain-client/src';
import {GasPrices} from './types/client-types';

export const getEthereumPriorityFee = ({
  gasPrices,
  feeOptionKey,
}: {
  gasPrices: GasPrices;
  feeOptionKey: FeeOptionKey;
}): BigNumber => {
  if (feeOptionKey.customEthPriorityFee === null) {
    return gasPrices.priorityFees[feeOptionKey.basicFee];
  }

  return feeOptionKey.customEthPriorityFee;
};
