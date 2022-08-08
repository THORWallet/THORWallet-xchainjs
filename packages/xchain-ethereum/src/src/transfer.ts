import {TransactionRequest} from '@ethersproject/abstract-provider';
// eslint-disable-next-line no-restricted-imports
import {BigNumber} from '@ethersproject/bignumber';
import {TransactionResponse} from '@ethersproject/providers';
import {toUtf8Bytes} from '@ethersproject/strings';
import {Wallet} from '@ethersproject/wallet';
import {
  Asset,
  AssetETH,
  assetToString,
  BaseAmount,
} from '@xchainjs/xchain-util';
import {ERC20ABI} from '../../../clients/chains/Ethereum/ERC20ABI';
import {removeUndefinedValues} from '../../../helpers/remove-undefined-values';
import {clearCustomNonce} from '../../../store/custom-nonce';
import {modalState} from '../../../store/modals';
import {ReplaceTransactionMethods} from '../../multichain/types/replace-transactions';
import {Address} from '../../xchain-client/src';
import {doesChainSupportEIP1559} from './does-chain-support-eip-1559';
import {ethCall} from './eth-call';
import {EvmChainId} from './types/client-types';
import {ETHNullAddress, getTokenAddress, SIMPLE_GAS_COST} from './utils';

export type TransferEthResult = {
  tx: TransactionResponse;
} & ReplaceTransactionMethods;

export const ethTransfer = async ({
  amount,
  asset,
  recipient,
  gasLimit,
  maxFeePerGas,
  maxPriorityFeePerGas,
  wallet,
  memo,
  chainId,
  nonce,
}: {
  maxFeePerGas: BigNumber;
  maxPriorityFeePerGas: BigNumber;
  gasLimit: BigNumber;
  wallet: Wallet;
  memo: string | null;
  recipient: Address;
  asset: Asset;
  amount: BaseAmount;
  chainId: number;
  nonce: number | null;
}): Promise<TransferEthResult> => {
  const txAmount = BigNumber.from(amount.amount().toFixed());

  let assetAddress;
  if (asset && assetToString(asset) !== assetToString(AssetETH)) {
    assetAddress = getTokenAddress(asset);
  }

  const isETHNullAddress = assetAddress === ETHNullAddress;

  clearCustomNonce();

  if (assetAddress && !isETHNullAddress) {
    // Transfer ERC20
    const result = await ethCall({
      abi: ERC20ABI,
      contractAddress: assetAddress,
      func: 'transfer',
      params: [recipient, txAmount],
      wallet,
      maxFeePerGas: doesChainSupportEIP1559(chainId) ? maxFeePerGas : undefined,
      maxPriorityFeePerGas: doesChainSupportEIP1559(chainId)
        ? maxPriorityFeePerGas
        : undefined,
      gasLimit,
      chainId,
      nonce,
    });
    return result;
  }

  // Transfer ETH
  const transactionRequest: TransactionRequest = {
    to: recipient,
    value: txAmount,
    data: memo ? toUtf8Bytes(memo) : undefined,
    maxFeePerGas: doesChainSupportEIP1559(chainId) ? maxFeePerGas : undefined,
    maxPriorityFeePerGas: doesChainSupportEIP1559(chainId)
      ? maxPriorityFeePerGas
      : undefined,
    gasLimit,
    nonce: nonce ?? undefined,
  };

  const txResult = await wallet.sendTransaction(
    removeUndefinedValues(transactionRequest),
  );

  const cancelTx = (callback: (newTx: TransactionResponse) => void) => {
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
          maxFeePerGas: doesChainSupportEIP1559(chainId)
            ? maxBaseFee.add(priorityFee)
            : undefined,
          maxPriorityFeePerGas: doesChainSupportEIP1559(chainId)
            ? priorityFee
            : undefined,
          nonce: txResult.nonce,
        };

        clearCustomNonce();

        const newResponse = await wallet.sendTransaction(
          removeUndefinedValues(emptyTxRequest),
        );
        callback(newResponse);
      },
      replaceType: 'cancel',
      chainId: chainId as EvmChainId,
    });
  };

  const speedUpTx = (callback: (newTx: TransactionResponse) => void) => {
    modalState.setGlobalState('modal', {
      type: 'replace-eth-tx',
      gasLimit,
      prevMaxBaseFee: maxFeePerGas.sub(maxPriorityFeePerGas),
      prevPriorityFee: maxPriorityFeePerGas,
      execute: async ({maxBaseFee, priorityFee}) => {
        const newTransaction: TransactionRequest = {
          ...transactionRequest,
          maxFeePerGas: maxBaseFee.add(priorityFee),
          maxPriorityFeePerGas: priorityFee,
          nonce: txResult.nonce,
        };
        clearCustomNonce();
        const response = await wallet.sendTransaction(
          removeUndefinedValues(newTransaction),
        );

        callback(response);
      },
      replaceType: 'speed-up',
      chainId: chainId as EvmChainId,
    });
  };

  // Our replacement UI is based on EIP1559 controls.
  // Disabling Speed up / Cancel for chains that don't support it for now.
  // It is however theoretically possible to implement!
  const canReplaceTx = doesChainSupportEIP1559(chainId);

  return {
    tx: txResult,
    cancelTx: canReplaceTx ? cancelTx : null,
    speedUpTx: canReplaceTx ? speedUpTx : null,
  };
};
