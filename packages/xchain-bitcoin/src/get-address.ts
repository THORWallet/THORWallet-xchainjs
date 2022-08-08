import * as Bitcoin from 'bitcoinjs-lib';
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
  mainnet: `84'/0'/0'/0/`, //note this isn't bip44 compliant, but it keeps the wallets generated compatible to pre HD wallets
  stagenet: `84'/0'/0'/0/`, //note this isn't bip44 compliant, but it keeps the wallets generated compatible to pre HD wallets
  testnet: `84'/1'/0'/0/`,
};

const getFullDerivationPath = (network: Network, index: number): string => {
  return rootDerivationPaths[network] + `${index}`;
};

export const getBtcKeys = async ({
  network,
  phrase,
  index,
}: {
  network: Network;
  phrase: string;
  index: number;
}): Promise<Bitcoin.ECPairInterface> => {
  const btcNetwork = Utils.btcNetwork(network);

  const seed = await getSeed(phrase);
  const master = await (
    await bip32.fromSeed(seed, btcNetwork)
  ).derivePath(getFullDerivationPath(network, index));

  if (!master.privateKey) {
    throw new Error('Could not get private key from phrase');
  }

  return Bitcoin.ECPair.fromPrivateKey(master.privateKey, {
    network: btcNetwork,
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
    return phrase.addresses.BTC ?? null;
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
  const btcNetwork = Utils.btcNetwork(network);
  const btcKeys = await getBtcKeys({
    network,
    phrase: phrase.seedPhrase,
    index: phrase.walletIndex,
  });

  const {address} = Bitcoin.payments.p2wpkh({
    pubkey: btcKeys.publicKey,
    network: btcNetwork,
  });
  if (!address) {
    throw new Error('Address not defined');
  }
  addrCache[cacheKey] = address;
  return address;
};
