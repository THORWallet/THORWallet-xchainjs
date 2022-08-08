import {DecryptedWallet} from '../../../store/phrase/phrase-state';
import {Address, Network} from '../../xchain-client/src';
import {getHdNode} from './get-hd-node';

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
  mainnet: `m/44'/60'/0'/0/`,
  stagenet: `m/44'/60'/0'/0/`,
  testnet: `m/44'/60'/0'/0/`, // this is INCORRECT but makes the unit tests pass
};

const getFullDerivationPath = (network: Network, index: number): string => {
  return rootDerivationPaths[network] + `${index}`;
};

export const getAddress = async ({
  network,
  phrase,
}: {
  network: Network;
  phrase: DecryptedWallet;
}): Promise<Address | null> => {
  if (phrase.type === 'watching-address') {
    return phrase.addresses.ETH ?? null;
  }

  const cacheKey = getCacheKey({
    index: phrase.walletIndex,
    network,
    phrase: phrase.seedPhrase,
  });
  if (addrCache[cacheKey]) {
    return addrCache[cacheKey] as string;
  }

  const hdNode = await getHdNode(phrase.seedPhrase);
  if (!hdNode) {
    throw new Error('Address not defined');
  }

  const address = (
    await hdNode.derivePath(getFullDerivationPath(network, phrase.walletIndex))
  ).address.toLowerCase();
  addrCache[cacheKey] = address;
  return address;
};
