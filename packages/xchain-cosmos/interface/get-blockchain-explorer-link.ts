import {Network} from '../../xchain-client/src';
import {getExplorerTxUrl} from '../src/client';

export const getBlockchainExplorerLink = ({
  network,
  tx,
}: {
  network: Network;
  tx: string;
}) => {
  return {
    url: getExplorerTxUrl({network, txID: tx}),
    providerName: 'Cosmos Big Dipper',
  };
};
