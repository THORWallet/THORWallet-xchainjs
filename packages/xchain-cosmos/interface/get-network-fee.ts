import {baseToAsset} from '@xchainjs/xchain-util';
import BigNumber from 'bignumber.js';
import {
  NetworkFeeInfo,
  NETWORK_FEE_MULTIPLIER,
} from '../../../clients/chains/methods/estimate-network-fee';
import {baseAmount} from '../../../helpers/amount-helper';
import {MIDGARD_DECIMAL} from '../../../helpers/chain-decimals';
import {AssetAtom} from '../src';

export const getNetworkFee = ({
  gasRate,
}: {
  gasRate: BigNumber;
}): Promise<NetworkFeeInfo> => {
  // https://viewblock.io/thorchain/txs?type=networkFee -> copy txHash
  // and then: https://stagenet-thornode.ninerealms.com/txs/2B26454573BF98F3BA34DA2AC1FE7ED26F3C9E68404DA114666B21031C6CD2FE
  const transactionSize = new BigNumber(1);

  return Promise.resolve({
    gasRate,
    gasRateType: 'fixed',
    transactionSize,
    networkFee: baseToAsset(
      baseAmount(gasRate, MIDGARD_DECIMAL)
        .times(transactionSize)
        .times(NETWORK_FEE_MULTIPLIER),
    ),
    networkFeeAsset: AssetAtom,
  });
};
