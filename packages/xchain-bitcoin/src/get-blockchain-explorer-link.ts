import {BlockchainExplorerLink} from '../../../clients/chains/multichain/get-blockchain-explorer-link';
import {Network} from '../../xchain-client/src';

export const getBlockchainExplorerLink = ({
  network,
  tx,
}: {
  network: Network;
  tx: string;
}): BlockchainExplorerLink => {
  if (network === Network.Testnet) {
    return {
      url: `https://www.blockchain.com/btc-testnet/tx/${tx}`,
      providerName: 'Blockchain.com',
    };
  }

  return {
    url: `https://www.blockchain.com/btc/tx/${tx}`,
    providerName: 'Blockchain.com',
  };
};
