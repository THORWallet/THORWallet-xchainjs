import {parseUnits} from '@ethersproject/units';
import {estimateGasPrices as original} from '../estimate-gas-prices';

export const estimateGasPrices: typeof original = () => {
  const result = {
    LastBlock: '14313227',
    SafeGasPrice: '50',
    ProposeGasPrice: '51',
    FastGasPrice: '51',
    suggestBaseFee: '49.827317076',
    gasUsedRatio:
      '0,0.999706925803903,0.960057837761572,0.996605738212893,0.99983711780488',
  };
  const baseFee = parseUnits(result.suggestBaseFee, 'gwei');
  const averageWei = parseUnits(result.SafeGasPrice, 'gwei').sub(baseFee);
  const fastWei = parseUnits(result.ProposeGasPrice, 'gwei').sub(baseFee);
  const fastestWei = parseUnits(result.FastGasPrice, 'gwei').sub(baseFee);

  return Promise.resolve({
    baseFee,
    priorityFees: {
      average: averageWei,
      fast: fastWei,
      fastest: fastestWei,
    },
  });
};
