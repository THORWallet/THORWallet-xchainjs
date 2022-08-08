import {Network} from '../../../chain-integrations/xchain-client/src';
import * as Utils from './utils';

const sochainUrl = 'https://sochain.com/api/v2';

export const getBalance = ({
  address,
  network,
}: {
  address: string;
  network: Network;
}) => {
  return Utils.getBalance({
    sochainUrl,
    network,
    address,
  });
};
