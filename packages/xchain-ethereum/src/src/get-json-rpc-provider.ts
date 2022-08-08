import {InfuraProvider, StaticJsonRpcProvider} from '@ethersproject/providers';
// import {INFURA_PROJECT_ID, INFURA_PROJECT_SECRET} from 'react-native-dotenv';
import {ethRpcs} from '../../../helpers/eth-rpcs';
import {SupportedChainIds} from './chain-id';
import {EvmChainId} from './types/client-types';

const INFURA_PROJECT_ID = '7f4ed83d54564643b0b9e4738758fb13';
const INFURA_PROJECT_SECRET = '59e9cad7686f48378ce6818cef97917c';

const getJsonRpcProviderRaw = (
  chainId: EvmChainId,
  rpcUrl?: string,
  networkName?: string,
): StaticJsonRpcProvider => {
  if (chainId === SupportedChainIds.Ethereum) {
    return new InfuraProvider('homestead', {
      projectId: INFURA_PROJECT_ID,
      projectSecret: INFURA_PROJECT_SECRET,
    });
  }

  if (chainId === SupportedChainIds.EthereumRopsten) {
    return new InfuraProvider('ropsten', {
      projectId: INFURA_PROJECT_ID,
      projectSecret: INFURA_PROJECT_SECRET,
    });
  }

  const rpcInfo = ethRpcs[chainId];

  if (rpcInfo) {
    return new StaticJsonRpcProvider(rpcInfo.rpcUrl, {
      chainId,
      name: networkName || rpcInfo.networkName,
    });
  }

  if (rpcUrl) {
    return new StaticJsonRpcProvider(rpcUrl, {
      chainId,
      name: networkName || 'Custom Network',
    });
  }

  throw new Error(`Unknown Chain ID ${chainId}, rpc URL must be set`);
};

const cache: Record<string, StaticJsonRpcProvider> = {};

export const getJsonRpcProvider = (
  chainId: number,
  rpcUrl?: string,
  networkName?: string,
): StaticJsonRpcProvider => {
  const key = [chainId, rpcUrl, networkName].join('-');
  if (cache[key]) {
    return cache[key] as StaticJsonRpcProvider;
  }

  const provider = getJsonRpcProviderRaw(
    chainId as EvmChainId,
    rpcUrl,
    networkName,
  );
  cache[key] = provider;

  return provider;
};
