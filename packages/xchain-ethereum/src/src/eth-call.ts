import {
  Contract,
  ContractInterface,
  ContractTransaction,
} from '@ethersproject/contracts';
import {
  TransactionRequest,
  TransactionResponse,
} from '@ethersproject/providers';
import {Wallet} from '@ethersproject/wallet';
// eslint-disable-next-line no-restricted-imports
import {BigNumber} from 'ethers';
import {removeUndefinedValues} from '../../../helpers/remove-undefined-values';
import {clearCustomNonce} from '../../../store/custom-nonce';
import {modalState} from '../../../store/modals';
import {ReplaceTransactionMethods} from '../../multichain/types/replace-transactions';
import {Address} from '../../xchain-client/src';
import {getJsonRpcProvider} from './get-json-rpc-provider';
import {EvmChainId} from './types/client-types';
import {ETHNullAddress, SIMPLE_GAS_COST} from './utils';

export type EthCallResult = {
  tx: TransactionResponse;
} & ReplaceTransactionMethods;

export const ethCall = async ({
  wallet,
  contractAddress,
  abi,
  func,
  params,
  maxFeePerGas,
  maxPriorityFeePerGas,
  gasLimit,
  value,
  chainId,
  nonce,
}: {
  chainId: number;
  wallet: Wallet;
  contractAddress: Address;
  abi: ContractInterface;
  func: string;
  params: Array<unknown>;
  maxPriorityFeePerGas: BigNumber | undefined;
  maxFeePerGas: BigNumber | undefined;
  gasLimit: BigNumber;
  nonce: number | null;
  value?: BigNumber;
}): Promise<EthCallResult> => {
  const provider = getJsonRpcProvider(chainId);
  const contract = new Contract(contractAddress, abi, provider).connect(wallet);
  const result: ContractTransaction = await contract[func](
    ...params,
    removeUndefinedValues({
      gasLimit,
      maxFeePerGas: maxFeePerGas ? maxFeePerGas.toString() : undefined,
      maxPriorityFeePerGas: maxPriorityFeePerGas
        ? maxPriorityFeePerGas.toString()
        : undefined,
      value,
      nonce: nonce ?? undefined,
    }),
  );
  clearCustomNonce();

  const speedUpTx = (callback: (newTx: TransactionResponse) => void) => {
    if (!maxFeePerGas || !maxPriorityFeePerGas) {
      throw new TypeError(
        'Cannot speed up TX because no dynamic gas is supported',
      );
    }

    modalState.setGlobalState('modal', {
      type: 'replace-eth-tx',
      gasLimit,
      prevMaxBaseFee: maxFeePerGas.sub(maxPriorityFeePerGas),
      prevPriorityFee: maxPriorityFeePerGas,
      execute: async ({maxBaseFee, priorityFee}) => {
        const newResult = await contract[func](
          ...params,
          removeUndefinedValues({
            gasLimit,
            maxFeePerGas: maxBaseFee.add(priorityFee).toString(),
            maxPriorityFeePerGas: priorityFee.toString(),
            nonce: result.nonce,
          }),
        );
        callback(newResult);
      },
      replaceType: 'speed-up',
      chainId: chainId as EvmChainId,
    });
  };

  const cancelTx = (callback: (newTx: TransactionResponse) => void) => {
    if (!maxFeePerGas || !maxPriorityFeePerGas) {
      throw new TypeError(
        'Cannot speed up TX because no dynamic gas is supported',
      );
    }

    modalState.setGlobalState('modal', {
      type: 'replace-eth-tx',
      gasLimit: SIMPLE_GAS_COST,
      prevMaxBaseFee: maxFeePerGas.sub(maxPriorityFeePerGas),
      prevPriorityFee: maxPriorityFeePerGas,
      execute: async ({maxBaseFee, priorityFee}) => {
        const emptyTxRequest: TransactionRequest = {
          to: ETHNullAddress,
          value: '0',
          data: undefined,
          maxFeePerGas: maxBaseFee.add(priorityFee),
          maxPriorityFeePerGas: priorityFee,
          nonce: result.nonce,
        };

        const newResponse = await wallet.sendTransaction(
          removeUndefinedValues(emptyTxRequest),
        );
        callback(newResponse);
      },
      replaceType: 'cancel',
      chainId: chainId as EvmChainId,
    });
  };

  return {tx: result, cancelTx, speedUpTx};
};

export const readEthContract = <T = BigNumber>({
  contractAddress,
  abi,
  func,
  params,
  chainId,
  from,
}: {
  chainId: number;
  contractAddress: Address;
  abi: ContractInterface;
  func: string;
  params: Array<unknown>;
  from: string;
}): Promise<T> => {
  const provider = getJsonRpcProvider(chainId);
  const contract = new Contract(contractAddress, abi, provider);
  return contract[func](...params, {
    from,
  });
};
