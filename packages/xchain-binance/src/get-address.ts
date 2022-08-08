import * as crypto from '@binance-chain/javascript-sdk/lib/crypto';
import {DecryptedWallet} from '../../../store/phrase/phrase-state';
import {Network} from '../../xchain-client/src';
import {bip32, getSeed} from '../../xchain-crypto/src';
import {getPrefix} from './util';

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

const addrCache: Record<string, string> = {};

const getPrivateKeyFromMnemonic = async (
  phrase: string,
  derive: boolean,
  index: number,
): Promise<string> => {
  const HDPATH = "44'/714'/0'/0/";
  const seed = await getSeed(phrase);
  if (derive) {
    const master = await bip32.fromSeed(seed);
    const child = await master.derivePath(HDPATH + index);
    if (!child.privateKey) {
      throw new Error('child does not have a privateKey');
    }

    return child.privateKey.toString('hex');
  }

  return seed.toString('hex');
};

export const getAddress = async ({
  network,
  phrase,
}: {
  network: Network;
  phrase: DecryptedWallet;
}): Promise<string | null> => {
  if (phrase.type === 'watching-address') {
    return phrase.addresses.BNB ?? null;
  }

  const cacheKey = getCacheKey({
    index: phrase.walletIndex,
    network,
    phrase: phrase.seedPhrase,
  });
  if (addrCache[cacheKey]) {
    return addrCache[cacheKey] as string;
  }

  const address = crypto.getAddressFromPrivateKey(
    await getPrivateKeyFromMnemonic(
      phrase.seedPhrase,
      true,
      phrase.walletIndex,
    ),
    getPrefix(network),
  );

  addrCache[cacheKey] = address;
  return address;
};
