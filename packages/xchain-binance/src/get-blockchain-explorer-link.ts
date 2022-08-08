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
      url: `https://testnet-explorer.binance.org/tx/${tx}`,
      providerName: 'Binance Explorer',
    };
  }

  return {
    url: `https://explorer.binance.org/tx/${tx}`,
    providerName: 'Binance Explorer',
  };
};
