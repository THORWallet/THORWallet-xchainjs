import {Network} from '../../xchain-client/src';
import * as utils from './utils';

export const getBalance = ({
  address,
  network,
}: {
  address: string;
  network: Network;
}) => {
  return utils.getBalance({
    haskoinUrl: {
      testnet: 'https://api.haskoin.com/bchtest',
      mainnet: 'https://api.haskoin.com/bch',
      stagenet: 'https://api.haskoin.com/bch',
    }[network],
    address,
  });
};
