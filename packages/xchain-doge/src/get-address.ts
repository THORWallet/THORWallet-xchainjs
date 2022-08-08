import * as Dogecoin from 'bitcoinjs-lib';
import {DecryptedWallet} from '../../../store/phrase/phrase-state';
import {Network} from '../../xchain-client/src';
import {getSeed} from '../../xchain-crypto/src';
import * as Utils from './utils';

const rootDerivationPaths: {[key in Network]: string} = {
  mainnet: `m/44'/3'/0'/0/`,
  stagenet: `m/44'/3'/0'/0/`,
  testnet: `m/44'/1'/0'/0/`,
};

const getFullDerivationPath = (network: Network, index: number): string => {
  return rootDerivationPaths[network] + `${index}`;
};

export const getDogeKeys = async ({
  network,
  phrase,
  index,
}: {
  network: Network;
  phrase: string;
  index: number;
}): Promise<Dogecoin.ECPairInterface> => {
  const dogeNetwork = Utils.dogeNetwork(network);

  const seed = await getSeed(phrase);
  const master = Dogecoin.bip32
    .fromSeed(seed, dogeNetwork)
    .derivePath(getFullDerivationPath(network, index));

  if (!master.privateKey) {
    throw new Error('Could not get private key from phrase');
  }

  return Dogecoin.ECPair.fromPrivateKey(master.privateKey, {
    network: dogeNetwork,
  });
};

export const getDogecoinAddress = async ({
  network,
  phrase,
}: {
  network: Network;
  phrase: DecryptedWallet;
}): Promise<string | null> => {
  if (phrase.type === 'watching-address') {
    return phrase.addresses.DOGE ?? null;
  }

  const dogeNetwork = Utils.dogeNetwork(network);
  const dogeKeys = await getDogeKeys({
    network,
    phrase: phrase.seedPhrase,
    index: phrase.walletIndex,
  });

  const {address} = Dogecoin.payments.p2pkh({
    pubkey: dogeKeys.publicKey,
    network: dogeNetwork,
  });

  if (!address) {
    throw new Error('Address not defined');
  }

  return address;
};
