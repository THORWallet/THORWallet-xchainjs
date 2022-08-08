// eslint-disable-next-line no-restricted-imports
// eslint-disable-next-line no-restricted-imports
import {BigNumber} from '@ethersproject/bignumber';
import {BaseAmount} from '@xchainjs/xchain-util';
import {estimateCallGasLimit} from '../../../clients/chains/Ethereum/estimate-eth-call';
import {Address} from '../../xchain-client/src';
import erc20ABI from './data/erc20.json';

export const estimateApprove = async ({
  spender,
  sender,
  amount,
  from,
  chainId,
}: {
  spender: Address;
  sender: Address;
  from: Address;
  amount: BaseAmount;
  chainId: number;
}): Promise<BigNumber> => {
  const txAmount = amount.amount().toFixed();
  const gasLimit = await estimateCallGasLimit({
    contractAddress: sender,
    abi: erc20ABI,
    fnName: 'approve',
    params: [spender, txAmount],
    from,
    chainId,
  });

  return gasLimit;
};
