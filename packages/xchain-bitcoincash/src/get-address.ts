import {DecryptedWallet} from '../../../store/phrase/phrase-state';
import {Address, Network} from '../../xchain-client/src';
import {bip32, getSeed} from '../../xchain-crypto/src';
import {KeyPair} from './types/bitcoincashjs-types';
import * as utils from './utils';
const BigInteger = require('bigi');
const bitcash = require('@psf/bitcoincashjs-lib');

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
const ENABLE_FAST = true;

const rootDerivationPaths = {
  mainnet: `m/44'/145'/0'/0/`,
  stagenet: `m/44'/145'/0'/0/`,
  testnet: `m/44'/1'/0'/0/`,
};

export const getBCHKeys = async ({
  network,
  phrase,
}: {
  network: Network;
  phrase: DecryptedWallet;
}): Promise<KeyPair> => {
  if (phrase.type === 'watching-address') {
    throw new Error('wallet is in watching mode');
  }

  const derivationPath = getBchDerivationPath(network, phrase.walletIndex);
  const rootSeed = await getSeed(phrase.seedPhrase);
  if (ENABLE_FAST) {
    const master = await (
      await bip32.fromSeed(rootSeed, utils.bchNetwork(network))
    ).derivePath(derivationPath);
    const d: Buffer = BigInteger.fromBuffer(master.privateKey);
    const btcKeyPair = new bitcash.ECPair(d, null, {
      network: utils.bchNetwork(network),
      compressed: true,
    });
    return btcKeyPair;
  }

  const masterHDNode = bitcash.HDNode.fromSeedBuffer(
    rootSeed,
    utils.bchNetwork(network),
  );
  const keyPair = await masterHDNode.derivePath(derivationPath).keyPair;
  return keyPair;
};

export const getBchDerivationPath = (
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
}): Promise<Address | null> => {
  if (phrase.type === 'watching-address') {
    return phrase.addresses.BCH ?? null;
  }
  const cacheKey = getCacheKey({
    index: phrase.walletIndex,
    network,
    phrase: phrase.seedPhrase,
  });
  if (addrCache[cacheKey]) {
    return addrCache[cacheKey] as string;
  }
  const keys = await getBCHKeys({
    network,
    phrase: phrase,
  });
  const address = await keys.getAddress(phrase.walletIndex);

  const addr = utils.stripPrefix(utils.toCashAddress(address));
  addrCache[cacheKey] = addr;
  return addr;
};
