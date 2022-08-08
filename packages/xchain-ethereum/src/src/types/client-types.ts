// eslint-disable-next-line no-restricted-imports
// eslint-disable-next-line no-restricted-imports
import {BigNumber, BigNumberish} from '@ethersproject/bignumber';
import {BytesLike} from '@ethersproject/bytes';
import * as C from '../../../xchain-client/src';
import {SupportedChainIds} from '../chain-id';

export type Address = string;

export enum Network {
  TEST = 'ropsten',
  MAIN = 'homestead',
}

export type ClientUrl = {
  testnet: string;
  mainnet: string;
};

export type ExplorerUrl = {
  testnet: string;
  mainnet: string;
};

export type TxOverrides = {
  nonce?: BigNumberish;

  // mandatory: https://github.com/ethers-io/ethers.js/issues/469#issuecomment-475926538
  gasLimit: BigNumberish;
  gasPrice?: BigNumberish;
  data?: BytesLike;
  value?: BigNumberish;
};

export type InfuraCreds = {
  projectId: string;
  projectSecret?: string;
};

export type GasPrices = {
  baseFee: BigNumber;
  priorityFees: {
    average: BigNumber;
    fast: BigNumber;
    fastest: BigNumber;
  };
};

export type EvmChainId =
  typeof SupportedChainIds[keyof typeof SupportedChainIds];

export type AllGasPrices = {
  [key in EvmChainId]: GasPrices;
};

export type GasLimit = BigNumber;

export type FeesWithGasPricesAndLimits = {
  fees: C.Fees;
  gasPrices: GasPrices;
  gasLimit: BigNumber;
};
