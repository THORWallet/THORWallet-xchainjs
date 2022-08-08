import {getAddress} from '@ethersproject/address';
// eslint-disable-next-line no-restricted-imports
import {BigNumber} from '@ethersproject/bignumber';
import {BaseProvider, Provider} from '@ethersproject/providers';
import {
  Asset,
  AssetETH,
  assetFromString,
  assetToString,
  ETHChain,
} from '@xchainjs/xchain-util';
import {Contract} from 'ethers';
import {ERC20ABI} from '../../../clients/chains/Ethereum/ERC20ABI';
import {baseAmount} from '../../../helpers/amount-helper';
import {EnabledToken} from '../../../store/enabled-tokens';
import {Address, Balance, Balances} from '../../xchain-client/src';
import {SupportedChainIds} from './chain-id';
import * as ethplorerAPI from './ethplorer-api';
import {getJsonRpcProvider} from './get-json-rpc-provider';
import {getNativeEVMAsset} from './native-eth-asset';
import {shouldBalanceBeShown} from './should-balance-be-shown';
import {
  ETH_DECIMAL,
  getTokenAddress,
  validateAddress,
  validateSymbol,
} from './utils';

const getEthereumMainnetTokenBalances = async ({
  ethplorerApiKey,
  ethplorerUrl,
  address,
}: {
  ethplorerUrl: string;
  ethplorerApiKey: string;
  address: Address;
}): Promise<Balances> => {
  // use ethplorerAPI for mainnet - ignore assets
  const account = await ethplorerAPI.getAddress(
    ethplorerUrl,
    address,
    ethplorerApiKey,
  );

  const tokenBalances = account.tokens ?? [];
  const chainId = SupportedChainIds.Ethereum;

  return tokenBalances.reduce((acc, cur) => {
    const {symbol, address: tokenAddress} = cur.tokenInfo;
    if (
      validateSymbol(symbol) &&
      validateAddress({address: tokenAddress}) &&
      cur?.tokenInfo?.decimals !== undefined
    ) {
      const decimals = parseInt(cur.tokenInfo.decimals, 10);
      const tokenAsset = assetFromString(
        `${ETHChain}.${symbol}-${getAddress(tokenAddress)}`,
        chainId,
      );
      if (tokenAsset) {
        return [
          ...acc,
          {
            asset: tokenAsset,
            amount: baseAmount(cur.balance, decimals),
          },
        ];
      }
    }

    return acc;
  }, [] as Balances);
};

const getTokenBalancesRaw = async (
  asset: Asset,
  chainId: number,
  address: Address,
): Promise<Balance | null> => {
  try {
    if (assetToString(asset) === assetToString(AssetETH)) {
      return null;
    }

    // Handle token balances
    const assetAddress = getTokenAddress(asset);
    if (!assetAddress) {
      console.log({asset});
      throw new Error(`Invalid asset ${asset}`);
    }

    const provider = getJsonRpcProvider(chainId);
    const contract = new Contract(assetAddress, ERC20ABI, provider);
    const balance = (await contract.balanceOf(address)).toString();
    const decimals = Number((await contract.decimals()).toString());

    if (Number.isNaN(decimals)) {
      return null;
    }

    return {
      asset,
      amount: baseAmount(balance.toString(), decimals),
    };
  } catch (err) {
    console.log(
      'ERROR in getTokenBalancesRaw - loading the eth token balance with chain id',
      chainId,
      err,
    );
    return null;
  }
};

export const getTokenBalances = async ({
  chainId,
  address,
  assets,
}: {
  address: Address;
  assets: Asset[];
  chainId: number;
}): Promise<Balances> => {
  const balances = await Promise.all(
    assets.map((asset) => getTokenBalancesRaw(asset, chainId, address)),
  );

  return balances.filter((b) => b !== null) as Balance[];
};

const getEthBalance = async ({
  provider,
  address,
  chainId,
}: {
  provider: Provider;
  address: Address;
  chainId: number;
}): Promise<Balances> => {
  try {
    // get ETH balance directly from provider
    const ethBalance: BigNumber = await provider.getBalance(address);
    const ethBalanceAmount = baseAmount(ethBalance.toString(), ETH_DECIMAL);

    return [
      {
        asset: getNativeEVMAsset(chainId),
        amount: ethBalanceAmount,
      },
    ];
  } catch (err) {
    console.log('ERROR loading the eth balance with chain id', chainId, err);
    return [];
  }
};

export const getTokenBalance = async ({
  address,
  assets,
  ethplorerUrl,
  ethplorerApiKey,
  chainId,
}: {
  address: Address;
  assets: Asset[];
  ethplorerUrl: string;
  ethplorerApiKey: string;
  chainId: number;
}): Promise<Balances> => {
  try {
    if (chainId === SupportedChainIds.Ethereum) {
      return getEthereumMainnetTokenBalances({
        ethplorerApiKey,
        address,
        ethplorerUrl,
      });
    }

    return getTokenBalances({address, assets, chainId});
  } catch (err) {
    console.log(
      'ERROR loading the eth token balance with chain id',
      chainId,
      err,
    );
    return [];
  }
};

export const getBalances = async ({
  address,
  assets,
  ethplorerUrl,
  ethplorerApiKey,
  provider,
  chainId,
  enabledTokens,
}: {
  address: Address;
  assets: Asset[];
  ethplorerUrl: string;
  ethplorerApiKey: string;
  provider: BaseProvider;
  chainId: number;
  enabledTokens: EnabledToken[];
}): Promise<Balances> => {
  const [ethBalance, tokenBalances] = await Promise.all([
    getEthBalance({provider, address, chainId}),
    getTokenBalance({
      address,
      assets,
      ethplorerApiKey,
      ethplorerUrl,
      chainId,
    }),
  ]);
  return [...ethBalance, ...tokenBalances].filter((b) =>
    shouldBalanceBeShown(b, chainId, enabledTokens),
  );
};
