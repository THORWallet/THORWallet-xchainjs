// eslint-disable-next-line no-restricted-imports
import {BigNumber} from '@ethersproject/bignumber';
import {BaseAmount} from '@xchainjs/xchain-util';
import {Address} from '../../xchain-client/src';
import erc20ABI from './data/erc20.json';
import {readEthContract} from './eth-call';

export const isApproved = async ({
  spender,
  contractAddress,
  amount,
  from,
  chainId,
}: {
  spender: Address;
  contractAddress: Address;
  amount: BaseAmount;
  from: Address;
  chainId: number;
}): Promise<boolean> => {
  const txAmount = BigNumber.from(amount.amount().toFixed());
  const allowance = await readEthContract({
    chainId,
    contractAddress,
    abi: erc20ABI,
    func: 'allowance',
    params: [spender, spender],
    from,
  });
  return txAmount.lte(allowance);
};
