import {DecryptedWallet} from '../../../store/phrase/phrase-state';
import {Network} from '../../xchain-client/src';
import {getHdNode} from './get-hd-node';
import {getJsonRpcProvider} from './get-json-rpc-provider';
import {Wallet} from './wallet/wallet';

const rootDerivationPaths = {
  mainnet: `m/44'/60'/0'/0/`,
  stagenet: `m/44'/60'/0'/0/`,
  testnet: `m/44'/60'/0'/0/`, // this is INCORRECT but makes the unit tests pass
};

export const getFullDerivationPath = ({
  index,
  network,
}: {
  index: number;
  network: Network;
}) => {
  return rootDerivationPaths[network] + `${index}`;
};

const walletKey = ({
  phrase,
  index,
  chainId,
  network,
}: {
  phrase: string;
  index: number;
  network: Network;
  chainId: number;
}) => {
  return [phrase, index, network, chainId].join('-');
};

const walletCache: {[key: string]: Wallet} = {};

export const getWallet = async ({
  chainId,
  phrase,
  network,
}: {
  chainId: number;
  phrase: DecryptedWallet;
  network: Network;
}): Promise<Wallet> => {
  if (phrase.type !== 'from-seed') {
    throw new Error(
      'wallet is in watching mode, but this operation requires seed phrase',
    );
  }

  const provider = getJsonRpcProvider(chainId);
  const key = walletKey({
    index: phrase.walletIndex,
    network,
    phrase: phrase.seedPhrase,
    chainId,
  });
  if (walletCache[key]) {
    return walletCache[key] as Wallet;
  }

  const hdNode = await getHdNode(phrase.seedPhrase);
  const derivationPath = getFullDerivationPath({
    index: phrase.walletIndex,
    network,
  });
  const newHdNode = await hdNode.derivePath(derivationPath);
  const wallet = new Wallet(newHdNode).connect(provider);
  walletCache[key] = wallet;
  return wallet;
};
