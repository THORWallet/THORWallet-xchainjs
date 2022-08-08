import {Network} from '../../xchain-client/src';
import {CosmosSDKClient} from './cosmos';
import {getDefaultChainIds, getDefaultClientUrls} from './util';

export const MAINNET_SDK = new CosmosSDKClient({
  server: getDefaultClientUrls()[Network.Mainnet],
  chainId: getDefaultChainIds()[Network.Mainnet],
});
export const TESTNET_SDK = new CosmosSDKClient({
  server: getDefaultClientUrls()[Network.Testnet],
  chainId: getDefaultChainIds()[Network.Testnet],
});
