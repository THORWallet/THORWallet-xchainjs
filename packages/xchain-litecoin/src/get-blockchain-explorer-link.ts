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
      url: `https://blockexplorer.one/litecoin/testnet/tx/${tx}`,
      providerName: 'blockexplorer.one',
    };
  }

  return {
    url: `https://blockexplorer.one/litecoin/mainnet/tx/${tx}`,
    providerName: 'blockexplorer.one',
  };
};
