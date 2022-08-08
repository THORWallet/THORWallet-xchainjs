import {Chain} from '@xchainjs/xchain-util';
import {TokenInTokenList} from '../../../clients/coingecko/tokenlist';
import {SupportedChainIds} from './chain-id';

export const defaultAssetsForChain = (chainId: number): TokenInTokenList[] => {
  if (chainId === SupportedChainIds.Polygon) {
    return [
      {
        chain: Chain.Ethereum,
        reasonForBeingInList: 'popular',
        ticker: 'WETH',
        contractAddress: '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
        chainId: SupportedChainIds.Polygon,
        decimals: 18,
        coingeckoId: 'weth',
        icon: 'https://assets.coingecko.com/coins/images/2518/large/weth.png?1628852295',
        name: 'Wrapped Ether',
      },
      {
        chain: Chain.Ethereum,
        reasonForBeingInList: 'popular',
        ticker: 'USDT',
        contractAddress: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
        chainId: SupportedChainIds.Polygon,
        coingeckoId: 'tether',
        decimals: 6,
        icon: 'https://assets.coingecko.com/coins/images/325/large/Tether-logo.png?1598003707',
        name: 'Tether',
      },
      {
        chain: Chain.Ethereum,
        reasonForBeingInList: 'popular',
        ticker: 'BNB',
        contractAddress: '0x3BA4c387f786bFEE076A58914F5Bd38d668B42c3',
        chainId: SupportedChainIds.Polygon,
        coingeckoId: 'bnb',
        decimals: 18,
        icon: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png?1644979850',
        name: 'BNB',
      },
      {
        chain: Chain.Ethereum,
        reasonForBeingInList: 'popular',
        ticker: 'USDC',
        contractAddress: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
        chainId: SupportedChainIds.Polygon,
        coingeckoId: 'usd-coin',
        decimals: 6,
        icon: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png?1547042389',
        name: 'USD Coin',
      },
    ];
  }

  if (chainId === SupportedChainIds.ArbitrumOne) {
    return [
      {
        chain: Chain.Ethereum,
        reasonForBeingInList: 'popular',
        ticker: 'USDT',
        contractAddress: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9',
        chainId: SupportedChainIds.ArbitrumOne,
        coingeckoId: 'tether',
        decimals: 6,
        icon: 'https://assets.coingecko.com/coins/images/325/large/Tether-logo.png?1598003707',
        name: 'Tether',
      },
      {
        chain: Chain.Ethereum,
        reasonForBeingInList: 'popular',
        ticker: 'USDC',
        contractAddress: '0xff970a61a04b1ca14834a43f5de4533ebddb5cc8',
        chainId: SupportedChainIds.ArbitrumOne,
        coingeckoId: 'usd-coin',
        decimals: 6,
        icon: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png?1547042389',
        name: 'USD Coin',
      },
    ];
  }

  if (chainId === SupportedChainIds.Moonbeam) {
    return [
      {
        chain: Chain.Ethereum,
        reasonForBeingInList: 'popular',
        ticker: 'WGLMR',
        contractAddress: '0xacc15dc74880c9944775448304b263d191c6077f',
        chainId: SupportedChainIds.Moonbeam,
        name: 'Wrapped GLMR',
        decimals: 18,
        coingeckoId: 'wrapped-moonbeam',
        icon: 'https://assets.coingecko.com/coins/images/23688/large/wglmr.jpg?1645008579',
      },
    ];
  }

  if (chainId === SupportedChainIds.Avalanche) {
    return [
      {
        chain: Chain.Ethereum,
        reasonForBeingInList: 'popular',
        ticker: 'USDT',
        contractAddress: '0xc7198437980c041c805a1edcba50c1ce5db95118',
        chainId: SupportedChainIds.Avalanche,
        coingeckoId: 'tether',
        decimals: 6,
        icon: 'https://assets.coingecko.com/coins/images/325/large/Tether-logo.png?1598003707',
        name: 'Tether',
      },
      {
        chain: Chain.Ethereum,
        reasonForBeingInList: 'popular',
        ticker: 'USDC',
        contractAddress: '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e',
        chainId: SupportedChainIds.Avalanche,
        coingeckoId: 'usd-coin',
        decimals: 6,
        icon: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png?1547042389',
        name: 'USD Coin',
      },
      {
        chain: Chain.Ethereum,
        reasonForBeingInList: 'popular',
        ticker: 'WAVAX',
        contractAddress: '0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
        chainId: SupportedChainIds.Avalanche,
        coingeckoId: 'wrapped-avax',
        decimals: 18,
        icon: 'https://assets.coingecko.com/coins/images/15075/large/wrapped-avax.png?1629873618',
        name: 'Wrapped AVAX',
      },
    ];
  }

  if (chainId === SupportedChainIds.Moonriver) {
    return [
      {
        chain: Chain.Ethereum,
        reasonForBeingInList: 'popular',
        ticker: 'USDC',
        contractAddress: '0xe3f5a90f9cb311505cd691a46596599aa1a0ad7d',
        chainId: SupportedChainIds.Moonriver,
        coingeckoId: 'usd-coin',
        decimals: 6,
        icon: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png?1547042389',
        name: 'USD Coin',
      },
      {
        chain: Chain.Ethereum,
        reasonForBeingInList: 'popular',
        ticker: 'SOLAR',
        contractAddress: '0x6bd193ee6d2104f14f94e2ca6efefae561a4334b',
        chainId: SupportedChainIds.Moonriver,
        coingeckoId: 'solarbeam',
        decimals: 18,
        icon: 'https://assets.coingecko.com/coins/images/18260/large/solarbeamlogo.png?1636080005',
        name: 'Solarbeam',
      },
      {
        chain: Chain.Ethereum,
        reasonForBeingInList: 'popular',
        ticker: 'WMOVR',
        contractAddress: '0x98878b06940ae243284ca214f92bb71a2b032b8a',
        chainId: SupportedChainIds.Moonriver,
        coingeckoId: 'wrapped-moonriver',
        decimals: 18,
        icon: 'https://assets.coingecko.com/coins/images/17984/large/9285.png?1630028620',
        name: 'Wrapped Moonriver',
      },
    ];
  }

  if (chainId === SupportedChainIds.Fantom) {
    return [
      {
        chain: Chain.Ethereum,
        reasonForBeingInList: 'popular',
        ticker: 'USDC',
        contractAddress: '0x04068DA6C83AFCFA0e13ba15A6696662335D5B75',
        chainId: SupportedChainIds.Fantom,
        coingeckoId: 'usd-coin',
        decimals: 6,
        icon: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png?1547042389',
        name: 'USD Coin',
      },
      {
        chain: Chain.Ethereum,
        reasonForBeingInList: 'popular',
        ticker: 'DAI',
        contractAddress: '0x8D11eC38a3EB5E956B052f67Da8Bdc9bef8Abf3E',
        chainId: SupportedChainIds.Fantom,
        coingeckoId: 'dai',
        decimals: 18,
        icon: 'https://assets.coingecko.com/coins/images/9956/large/4943.png?1636636734',
        name: 'Dai Stablecoin',
      },
      {
        chain: Chain.Ethereum,
        reasonForBeingInList: 'popular',
        ticker: 'WBTC',
        contractAddress: '0x321162Cd933E2Be498Cd2267a90534A804051b11',
        chainId: SupportedChainIds.Fantom,
        coingeckoId: 'wrapped-bitcoin',
        decimals: 8,
        icon: 'https://assets.coingecko.com/coins/images/7598/large/wrapped_bitcoin_wbtc.png?1548822744',
        name: 'Wrapped Bitcoin',
      },
      {
        chain: Chain.Ethereum,
        reasonForBeingInList: 'popular',
        ticker: 'WETH',
        contractAddress: '0x74b23882a30290451A17c44f4F05243b6b58C76d',
        chainId: SupportedChainIds.Fantom,
        coingeckoId: 'weth',
        decimals: 18,
        icon: 'https://assets.coingecko.com/coins/images/2518/large/weth.png?1628852295',
        name: 'Wrapped Ether',
      },
    ];
  }

  if (chainId === SupportedChainIds.BinanceSmartChain) {
    return [
      {
        chain: Chain.Ethereum,
        reasonForBeingInList: 'popular',
        ticker: 'WBNB',
        contractAddress: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        chainId: SupportedChainIds.BinanceSmartChain,
        coingeckoId: 'wbnb',
        decimals: 18,
        icon: 'https://assets.coingecko.com/coins/images/12591/large/binance-coin-logo.png?1600947313',
        name: 'Wrapped BNB',
      },
      {
        chain: Chain.Ethereum,
        reasonForBeingInList: 'popular',
        ticker: 'BUSD',
        contractAddress: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
        chainId: SupportedChainIds.BinanceSmartChain,
        coingeckoId: 'binance-usd',
        decimals: 18,
        icon: 'https://assets.coingecko.com/coins/images/9576/large/BUSD.png?1568947766',
        name: 'Binance-Peg BUSD Token',
      },
      {
        chain: Chain.Ethereum,
        reasonForBeingInList: 'popular',
        ticker: 'ETH',
        contractAddress: '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
        chainId: SupportedChainIds.BinanceSmartChain,
        coingeckoId: 'ethereum',
        decimals: 18,
        icon: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png?1595348880',
        name: 'Binance-Peg Ethereum Token',
      },
    ];
  }

  return [];
};
