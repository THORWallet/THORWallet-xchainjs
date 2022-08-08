// eslint-disable-next-line no-restricted-imports
import {BigNumber} from '@ethersproject/bignumber';
import {BaseAmount} from '@xchainjs/xchain-util';
import {ContractTransaction} from 'ethers';
import {Address, FeeOptionKey} from '../../xchain-client/src';
import erc20ABI from './data/erc20.json';
import {estimateApprove} from './estimate-approve';
import {ethCall} from './eth-call';
import {getIdealEthFees} from './get-ideal-eth-fees';
import {GasPrices} from './types/client-types';
import {Wallet} from './wallet/wallet';

export const ethApprove = async ({
  spender,
  sender,
  feeOptionKey,
  amount,
  from,
  wallet,
  chainId,
  gasPrices,
  nonce,
}: {
  spender: Address;
  sender: Address;
  feeOptionKey: FeeOptionKey;
  amount: BaseAmount;
  from: Address;
  wallet: Wallet;
  chainId: number;
  gasPrices: GasPrices;
  nonce: number | null;
}): Promise<ContractTransaction> => {
  const gasLimit = await estimateApprove({
    spender,
    sender,
    amount,
    from,
    chainId,
  });
  const {maxFeePerGas, maxPriorityFeePerGas} = getIdealEthFees({
    feeOptionKey,
    gasPrices,
  });

  const txAmount = BigNumber.from(amount.amount().toFixed());
  const {tx: txResult} = await ethCall({
    abi: erc20ABI,
    contractAddress: sender,
    func: 'approve',
    params: [spender, txAmount],
    chainId,
    wallet,
    maxFeePerGas,
    maxPriorityFeePerGas,
    gasLimit,
    nonce,
  });

  return txResult;
};
