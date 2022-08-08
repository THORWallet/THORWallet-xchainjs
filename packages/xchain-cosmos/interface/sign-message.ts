import RNSimple from 'react-native-simple-crypto';
import {Signature} from '../../../clients/chains/types/Signature';
import {DecryptedWallet} from '../../../store/phrase/phrase-state';
import {Network} from '../../xchain-client/src';
import {getPrivateKey} from '../src';

export const signMessage = async ({
  phrase,
  network,
  msg,
}: {
  phrase: DecryptedWallet;
  network: Network;
  msg: string;
}): Promise<Signature> => {
  const msgHash = await RNSimple.SHA.sha256(msg);
  const msgBuffer = Buffer.from(msgHash, 'hex');

  if (phrase.type === 'watching-address') {
    throw new Error('Wallet is in watching mode');
  }

  const pk = await getPrivateKey({
    network,
    phrase: phrase.seedPhrase,
    index: phrase.walletIndex,
  });
  const signature = Buffer.from(pk.sign(msgBuffer)).toString('hex');
  const hexPubKey = Buffer.from(pk.pubKey().bytes()).toString('hex');

  return {signature, pubKey: hexPubKey};
};
