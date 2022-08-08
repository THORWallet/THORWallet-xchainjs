import * as Litecoin from 'bitcoinjs-lib'; // https://github.com/bitcoinjs/bitcoinjs-lib
import {DecryptedWallet} from '../../../store/phrase/phrase-state';
import {Address, Network} from '../../xchain-client/src';
import {bip32, getSeed} from '../../xchain-crypto/src';
import * as Utils from './utils';

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
  mainnet: `m/84'/2'/0'/0/`,
  stagenet: `m/84'/2'/0'/0/`,
  testnet: `m/84'/1'/0'/0/`,
};

export const getLitecoinderivationPath = ({
  index,
  network,
}: {
  network: Network;
  index: number;
}): string => {
  return rootDerivationPaths[network] + `${index}`;
};

export const getLtcKeys = async ({
  network,
  phrase,
  index,
}: {
  network: Network;
  phrase: string;
  index: number;
}): Promise<Litecoin.ECPairInterface> => {
  const ltcNetwork = Utils.ltcNetwork(network);

  const seed = await getSeed(phrase);
  const master = await (
    await bip32.fromSeed(seed, ltcNetwork)
  ).derivePath(getLitecoinderivationPath({network, index}));

  if (!master.privateKey) {
    throw new Error('Could not get private key from phrase');
  }

  return Litecoin.ECPair.fromPrivateKey(master.privateKey, {
    network: ltcNetwork,
  });
};

export const getAddress = async ({
  network,
  phrase,
}: {
  network: Network;
  phrase: DecryptedWallet;
}): Promise<Address | null> => {
  if (phrase.type === 'watching-address') {
    return phrase.addresses.LTC ?? null;
  }
  if (phrase.walletIndex < 0) {
    throw new Error('index must be greater than zero');
  }
  const cacheKey = getCacheKey({
    index: phrase.walletIndex,
    network,
    phrase: phrase.seedPhrase,
  });

  if (addrCache[cacheKey]) {
    return addrCache[cacheKey] as string;
  }
  const ltcNetwork = Utils.ltcNetwork(network);
  const ltcKeys = await getLtcKeys({
    network,
    phrase: phrase.seedPhrase,
    index: phrase.walletIndex,
  });

  const {address} = Litecoin.payments.p2wpkh({
    pubkey: ltcKeys.publicKey,
    network: ltcNetwork,
  });

  if (!address) {
    throw new Error('Address not defined');
  }
  addrCache[cacheKey] = address;
  return address;
};
