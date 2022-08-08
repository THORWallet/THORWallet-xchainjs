import {Asset, assetToString} from '@xchainjs/xchain-util';
import {baseAmount} from '../../../helpers/amount-helper';
import {Balance, Network} from '../../xchain-client/src';
import {
  AssetAtom,
  COSMOS_DECIMAL,
  getAsset,
  getDefaultChainIds,
  getDefaultClientUrls,
} from '../src';
import {getSdkBalance} from '../src/cosmos/get-sdk-balance';

export const getBalance = async ({
  address,
  assets,
  network,
}: {
  address: string;
  assets?: Asset[];
  network: Network;
}): Promise<Balance[]> => {
  const networkId = getDefaultChainIds()[network];
  const balances = await getSdkBalance({
    address,
    server: getDefaultClientUrls()[network],
    chainId: networkId,
    prefix: 'cosmos',
  });

  let newBalances = balances.map((balance) => ({
    asset: (balance.denom && getAsset(balance.denom)) || AssetAtom,
    amount: baseAmount(balance.amount, COSMOS_DECIMAL),
  }));

  // make sure we always have the bnb asset as balance in the array
  if (newBalances.length === 0) {
    newBalances = [
      {
        asset: AssetAtom,
        amount: baseAmount(0, COSMOS_DECIMAL),
      },
    ];
  }

  // filter the asset which was asked for
  return newBalances.filter(
    (balance) =>
      !assets ||
      assets.filter(
        (asset) => assetToString(balance.asset) === assetToString(asset),
      ).length,
  );
};
