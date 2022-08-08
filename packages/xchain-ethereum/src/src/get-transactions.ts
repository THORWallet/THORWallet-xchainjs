import {TxHistoryParams, TxsPage} from '../../xchain-client/src';
import * as etherscanAPI from './etherscan-api';

export const getTransactions = async ({
  chainId,
  params,
}: {
  chainId: number;
  params?: TxHistoryParams;
}): Promise<TxsPage> => {
  const assetAddress = params?.asset;

  const maxCount = 10000;

  let transactions;

  if (assetAddress) {
    transactions = await etherscanAPI.getTokenTransactionHistory({
      address: params?.address,
      assetAddress,
      page: 0,
      offset: maxCount,
      chainId,
    });
  } else {
    transactions = await etherscanAPI.getETHTransactionHistory({
      address: params?.address,
      page: 0,
      offset: maxCount,
      chainId,
    });
  }

  return {
    total: transactions.length,
    txs: transactions,
  };
};
