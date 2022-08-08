// eslint-disable-next-line no-restricted-imports
import {BigNumber} from '@ethersproject/bignumber';
import {parseUnits} from '@ethersproject/units';
import {formatGweiWithPrecision} from '../../../helpers/format-gwei-with-precision';
import {FeeOptionKey} from '../../xchain-client/src';
import {doesChainSupportEIP1559} from './does-chain-support-eip-1559';
import {getEthereumPriorityFee} from './get-priority-fee';
import {GasPrices} from './types/client-types';

// How much the base fee may be higher than the current one by default.
// Divide to get the percentage: 6 / 5 => 120% of the current base dee
const DEFAULT_MAX_BASE_FEE_SLIPPAGE_NOMINATOR = 6;
const DEFAULT_MAX_BASE_FEE_SLIPPAGE_DENOMINATOR = 5;

export const getDefaultMaxBaseFeeSlippage = (baseFee: BigNumber) => {
  return baseFee
    .mul(DEFAULT_MAX_BASE_FEE_SLIPPAGE_NOMINATOR)
    .div(DEFAULT_MAX_BASE_FEE_SLIPPAGE_DENOMINATOR)
    .sub(baseFee);
};

export const getMaxBaseFee = ({
  feeOptionKey,
  gasPrices,
}: {
  feeOptionKey: FeeOptionKey;
  gasPrices: GasPrices;
}) => {
  if (feeOptionKey.maxBaseFeeSlippage === null) {
    return gasPrices.baseFee
      .mul(DEFAULT_MAX_BASE_FEE_SLIPPAGE_NOMINATOR)
      .div(DEFAULT_MAX_BASE_FEE_SLIPPAGE_DENOMINATOR);
  }

  const calculated = gasPrices.baseFee.add(feeOptionKey.maxBaseFeeSlippage);
  if (calculated.lte(0)) {
    return parseUnits('1', 'gwei');
  }

  return calculated;
};

export const getIdealEthFees = ({
  feeOptionKey,
  gasPrices,
}: {
  feeOptionKey: FeeOptionKey;
  gasPrices: GasPrices;
}) => {
  const maxPriorityFeePerGas = getEthereumPriorityFee({
    feeOptionKey,
    gasPrices,
  });
  const maxBaseFee = getMaxBaseFee({
    feeOptionKey,
    gasPrices,
  });
  const maxFeePerGas = maxPriorityFeePerGas.add(maxBaseFee);
  return {
    maxFeePerGas,
    maxPriorityFeePerGas,
  };
};

// Returns the minimum and maximum Gwei amount that one needs to pay
// based on base fee and maximum base fee one is willing to pay
export const getGweiRange = ({
  feeOptionKey,
  gasPrices,
  chainId,
}: {
  feeOptionKey: FeeOptionKey;
  gasPrices: GasPrices;
  chainId: number;
}): [BigNumber, BigNumber] => {
  const maxPriorityFeePerGas = getEthereumPriorityFee({
    feeOptionKey,
    gasPrices,
  });
  const minBaseFee = gasPrices.baseFee;
  const maxBaseFee = getMaxBaseFee({feeOptionKey, gasPrices});
  const minFeePerGas = maxPriorityFeePerGas.add(minBaseFee);
  const maxFeePerGas = maxPriorityFeePerGas.add(maxBaseFee);
  return [
    minFeePerGas,
    doesChainSupportEIP1559(chainId) ? maxFeePerGas : minFeePerGas,
  ];
};

export const formatGweiRange = (gweiRange: [BigNumber, BigNumber]) => {
  // Display gwei values below 5 with 1 decimal

  // "20 gwei"
  // "0.4 gwei"
  const precision = gweiRange[1].lt(parseUnits('5', 'gwei')) ? 1 : 0;

  const lower = formatGweiWithPrecision(gweiRange[0], precision);
  const upper = formatGweiWithPrecision(gweiRange[1], precision);

  if (lower === upper) {
    return lower;
  }

  return `${lower}-${upper}`;
};
