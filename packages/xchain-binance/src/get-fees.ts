import axios from 'axios';
import {baseAmount} from '../../../helpers/amount-helper';
import {Network} from '../../xchain-client/src';
import {Fees} from '../../xchain-client/src/types';
import {BinanceFees as BinanceFee, TransferFee} from './types/binance';
import {BNB_DECIMAL, isTransferFee} from './util';

export const getClientUrl = (network: Network): string => {
  return network === Network.Testnet
    ? 'https://testnet-dex.binance.org'
    : 'https://dex.binance.org';
};

const getTransferFee = async (network: Network): Promise<TransferFee> => {
  const feesArray = await axios
    .get<BinanceFee>(`${getClientUrl(network)}/api/v1/fees`)
    .then((response) => response.data);

  const [transferFee] = feesArray.filter(isTransferFee);
  if (!transferFee) {
    throw new Error('failed to get transfer fees');
  }

  return transferFee;
};

export const getFees = async ({network}: {network: Network}): Promise<Fees> => {
  const transferFee = await getTransferFee(network);
  const singleTxFee = baseAmount(transferFee.fixed_fee_params.fee, BNB_DECIMAL);

  return {
    type: 'base',
    fast: singleTxFee,
    fastest: singleTxFee,
    average: singleTxFee,
  } as Fees;
};
