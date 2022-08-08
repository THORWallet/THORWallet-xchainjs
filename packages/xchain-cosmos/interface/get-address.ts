import {DecryptedWallet} from '../../../store/phrase/phrase-state';
import {Network} from '../../xchain-client/src';
import {CosmosSDKClient} from '../src/cosmos/sdk-client';
import {getDefaultChainIds, getDefaultClientUrls} from '../src/util';

const addrCache: Record<string, string> = {};

const getCacheKey = ({
  network,
  phrase,
  index,
}: {
  network: Network;
  phrase: string;
  index: number;
}) => {
  return [network, phrase, index].join('-');
};

const rootDerivationPaths = {
  [Network.Mainnet]: "44'/118'/0'/0/",
  [Network.Stagenet]: "44'/118'/0'/0/",
  [Network.Testnet]: "44'/118'/1'/0/",
};

export const getCosmosDerivationPath = (
  network: Network,
  index: number,
): string => {
  return rootDerivationPaths[network] + `${index}`;
};

export const getAddress = async ({
  network,
  phrase,
}: {
  network: Network;
  phrase: DecryptedWallet;
}): Promise<string | null> => {
  if (phrase.type === 'watching-address') {
    return phrase.addresses.GAIA ?? null;
  }

  const cacheKey = getCacheKey({
    index: phrase.walletIndex,
    network,
    phrase: phrase.seedPhrase,
  });
  if (addrCache[cacheKey]) {
    return addrCache[cacheKey] as string;
  }

  const cosmosClient = getCosmosClient(network);

  const address = await cosmosClient.getAddressFromMnemonic(
    phrase.seedPhrase,
    getCosmosDerivationPath(network, phrase.walletIndex),
  );

  if (!address) {
    throw new Error('address not defined');
  }

  addrCache[cacheKey] = address;
  return address;
};

const clientCache: {[key in Network]: CosmosSDKClient | null} = {
  mainnet: null,
  stagenet: null,
  testnet: null,
};

export const getCosmosClient = (network: Network): CosmosSDKClient => {
  if (clientCache[network]) {
    return clientCache[network] as CosmosSDKClient;
  }

  const clientUrls = getDefaultClientUrls();
  const chainIds = getDefaultChainIds();

  const client = new CosmosSDKClient({
    server: clientUrls[network],
    chainId: chainIds[network],
  });
  clientCache[network] = client;
  return client;
};
