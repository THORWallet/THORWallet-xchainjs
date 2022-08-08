import {Asset, AssetETH, Chain} from '@xchainjs/xchain-util';
import {SupportedChainIds} from './chain-id';

export const getNameOfEVMNativeAsset = (chainId: number) => {
  if (chainId === SupportedChainIds.Ethereum) {
    return 'Ethereum';
  }

  if (chainId === SupportedChainIds.EthereumRopsten) {
    return 'Ropsten ETH';
  }

  if (chainId === SupportedChainIds.ArbitrumOne) {
    return 'Arbitrum ETH';
  }

  if (chainId === SupportedChainIds.Moonbeam) {
    return 'Moonbeam';
  }

  if (chainId === SupportedChainIds.Moonriver) {
    return 'Moonriver';
  }

  if (chainId === SupportedChainIds.Avalanche) {
    return 'Avalanche';
  }

  if (chainId === SupportedChainIds.Polygon) {
    return 'Polygon Matic';
  }

  if (chainId === SupportedChainIds.Fantom) {
    return 'Fantom';
  }

  if (chainId === SupportedChainIds.BinanceSmartChain) {
    return 'BNB Smart Chain';
  }

  console.log("don't know about ETH native asset " + chainId);
  return 'Ethereum';
};

export const getEvmErc20Label = (chainId: number) => {
  if (chainId === SupportedChainIds.Ethereum) {
    return 'ERC20';
  }

  if (chainId === SupportedChainIds.EthereumRopsten) {
    return 'ERC20';
  }

  if (chainId === SupportedChainIds.ArbitrumOne) {
    return 'Arbitrum ERC20';
  }

  if (chainId === SupportedChainIds.Moonbeam) {
    return 'GLMR ERC20';
  }

  if (chainId === SupportedChainIds.Moonriver) {
    return 'MOVR ERC20';
  }

  if (chainId === SupportedChainIds.Avalanche) {
    return 'AVAX ERC20';
  }

  if (chainId === SupportedChainIds.Polygon) {
    return 'MATIC ERC20';
  }

  if (chainId === SupportedChainIds.Fantom) {
    return 'FTM ERC20';
  }

  if (chainId === SupportedChainIds.BinanceSmartChain) {
    return 'BEP20';
  }

  console.log("don't know about ETH native asset " + chainId);
  return 'Ethereum';
};

export const AssetETHRopsten: Asset = {
  chain: Chain.Ethereum,
  ticker: 'ETH',
  synth: false,
  symbol: 'ETH',
  chainId: SupportedChainIds.EthereumRopsten,
};

export const AssetGLMR: Asset = {
  chain: Chain.Ethereum,
  chainId: SupportedChainIds.Moonbeam,
  synth: false,
  symbol: 'GLMR',
  ticker: 'GLMR',
};
export const AssetMOVR: Asset = {
  chain: Chain.Ethereum,
  chainId: SupportedChainIds.Moonriver,
  synth: false,
  symbol: 'MOVR',
  ticker: 'MOVR',
};

export const AssetAVAX: Asset = {
  chain: Chain.Ethereum,
  chainId: SupportedChainIds.Avalanche,
  synth: false,
  symbol: 'AVAX',
  ticker: 'AVAX',
};

export const AssetETHOnArbitrum: Asset = {
  chain: Chain.Ethereum,
  chainId: SupportedChainIds.ArbitrumOne,
  synth: false,
  // when having the same symbol ('ETH') it is identical with the native AssetETH
  symbol: 'ETH-' + SupportedChainIds.ArbitrumOne,
  ticker: 'ETH',
};

export const AssetNativeMatic: Asset = {
  chain: Chain.Ethereum,
  chainId: SupportedChainIds.Polygon,
  synth: false,
  symbol: 'MATIC',
  ticker: 'MATIC',
};

export const AssetFTM: Asset = {
  chain: Chain.Ethereum,
  chainId: SupportedChainIds.Fantom,
  synth: false,
  symbol: 'FTM',
  ticker: 'FTM',
};

export const AssetBNBOnBSC: Asset = {
  chain: Chain.Ethereum,
  chainId: SupportedChainIds.BinanceSmartChain,
  synth: false,
  symbol: 'BNB-' + SupportedChainIds.BinanceSmartChain,
  ticker: 'BNB',
};

export const getNativeEVMAsset = (chainId: number): Asset => {
  if (chainId === SupportedChainIds.Ethereum) {
    return AssetETH;
  }

  if (chainId === SupportedChainIds.EthereumRopsten) {
    return AssetETHRopsten;
  }

  if (chainId === SupportedChainIds.Moonbeam) {
    return AssetGLMR;
  }

  if (chainId === SupportedChainIds.Moonriver) {
    return AssetMOVR;
  }

  if (chainId === SupportedChainIds.Avalanche) {
    return AssetAVAX;
  }

  if (chainId === SupportedChainIds.ArbitrumOne) {
    return AssetETHOnArbitrum;
  }

  if (chainId === SupportedChainIds.Polygon) {
    return AssetNativeMatic;
  }

  if (chainId === SupportedChainIds.Fantom) {
    return AssetFTM;
  }

  if (chainId === SupportedChainIds.BinanceSmartChain) {
    return AssetBNBOnBSC;
  }

  console.log('chain ' + chainId + ' does not have native Asset defined');
  return AssetETH;
};
