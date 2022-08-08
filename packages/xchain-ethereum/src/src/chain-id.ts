import {Network} from '../../xchain-client/src';

export const SupportedChainIds = {
  Ethereum: 1 as const,
  EthereumRopsten: 3 as const,
  BinanceSmartChain: 56 as const,
  Polygon: 137 as const,
  Avalanche: 43114 as const,
  Moonbeam: 1284 as const,
  Moonriver: 1285 as const,
  Fantom: 250 as const,
  ArbitrumOne: 42161 as const,
};

export const ethNetworkToChainId = (network: Network) => {
  if (network === Network.Mainnet) {
    return SupportedChainIds.Ethereum;
  }

  if (network === Network.Testnet) {
    return SupportedChainIds.EthereumRopsten;
  }
};
