import {SupportedChainIds} from './chain-id';

export const getEtherscanishApiBaseUrl = (chainId: number) => {
  if (chainId === SupportedChainIds.Ethereum) {
    return 'https://api.etherscan.io';
  }

  if (chainId === SupportedChainIds.EthereumRopsten) {
    return 'https://api-ropsten.etherscan.io';
  }

  if (chainId === SupportedChainIds.ArbitrumOne) {
    return 'https://api.arbiscan.io';
  }

  if (chainId === SupportedChainIds.Moonbeam) {
    return 'https://api-moonbeam.moonscan.io/';
  }

  if (chainId === SupportedChainIds.Moonriver) {
    return 'https://api-moonriver.moonscan.io/';
  }

  if (chainId === SupportedChainIds.Polygon) {
    return 'https://api.polygonscan.com/';
  }

  if (chainId === SupportedChainIds.Avalanche) {
    return 'https://api.snowtrace.io/';
  }

  if (chainId === SupportedChainIds.Fantom) {
    return 'https://api.ftmscan.com/';
  }

  if (chainId === SupportedChainIds.BinanceSmartChain) {
    return 'https://api.bscscan.com/';
  }

  throw new TypeError('Unsupported network');
};
