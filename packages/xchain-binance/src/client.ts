import {BncClient} from '@binance-chain/javascript-sdk/lib/client';
import * as crypto from '@binance-chain/javascript-sdk/lib/crypto';
import {SignedSend} from '@binance-chain/javascript-sdk/lib/types';
import {Asset, AssetBNB, BaseAmount, baseToAsset} from '@xchainjs/xchain-util';
import axios from 'axios';
import {Signature, TransactionResult, TxPage as BinanceTxPage} from '.';
import {DecryptedWallet} from '../../../store/phrase/phrase-state';
import {
  Address,
  Network,
  Tx,
  TxHash,
  TxHistoryParams,
  Txs,
  TxsPage,
} from '../../xchain-client/src';
import {bip32, getSeed} from '../../xchain-crypto/src';
import {getAddress} from './get-address';
import {getClientUrl} from './get-fees';
import {getPrefix, parseTx} from './util';

type PrivKey = string;

const getTxWithRateLimitHandling = async (
  url: string,
): Promise<BinanceTxPage> => {
  const response = await axios.get<BinanceTxPage>(url, {
    validateStatus: (status) => {
      return (status >= 200 && status < 300) || status === 429;
    },
  });
  if (response.status === 429) {
    console.log('got 429 for ', url, 'waiting 2 seconds then retrying...');
    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });
    return getTxWithRateLimitHandling(url);
  }

  return response.data;
};

const clientCache: Record<Network, BncClient | null> = {
  mainnet: null,
  stagenet: null,
  testnet: null,
};

const getClient = (network: Network): BncClient => {
  if (clientCache[network]) {
    return clientCache[network] as BncClient;
  }

  const bncClient = new BncClient(getClientUrl(network));
  bncClient.chooseNetwork(network === Network.Testnet ? 'testnet' : 'mainnet');

  clientCache[network] = bncClient;
  return bncClient;
};

export const getExplorerUrl = (network: Network): string => {
  return network === Network.Testnet
    ? 'https://testnet-explorer.binance.org'
    : 'https://explorer.binance.org';
};

export const getExplorerAddressUrl = ({
  network,
  address,
}: {
  network: Network;
  address: Address;
}): string => {
  return `${getExplorerUrl(network)}/address/${address}`;
};

export const getExplorerTxUrl = ({
  network,
  txID,
}: {
  network: Network;
  txID: string;
}): string => {
  return `${getExplorerUrl(network)}/tx/${txID}`;
};

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

const getPrivateKey = (phrase: DecryptedWallet): Promise<PrivKey> => {
  if (phrase.type === 'watching-address') {
    throw new Error('wallet is in watching mode');
  }

  return getPrivateKeyFromMnemonic(phrase.seedPhrase, true, phrase.walletIndex);
};

export const transfer = async ({
  phrase,
  network,
  asset,
  amount,
  recipient,
  memo,
}: {
  phrase: DecryptedWallet;
  network: Network;
  asset: Asset;
  amount: BaseAmount;
  recipient: Address;
  memo: string | null;
}): Promise<TxHash> => {
  try {
    await getClient(network).initChain();
    await getClient(network)
      .setPrivateKey(await getPrivateKey(phrase))
      .catch((error: Error) => {
        throw error;
      });

    const address = await getAddress({
      phrase,
      network,
    });

    if (address === null) {
      throw new Error('wallet is in watching mode');
    }

    const transferResult = await getClient(network).transfer(
      address,
      recipient,
      baseToAsset(amount).amount().toString(),
      asset ? asset.symbol : AssetBNB.symbol,
      memo ?? undefined,
    );

    return transferResult.result.map(
      (txResult: {hash?: TxHash}) => txResult?.hash ?? '',
    )[0];
  } catch (error) {
    return Promise.reject(error);
  }
};

export const validateAddress = ({
  network,
  address,
}: {
  network: Network;
  address: string;
}): boolean => {
  return getClient(network).checkAddress(address, getPrefix(network));
};

const searchTransactions = async (
  network: Network,
  params?: {
    [x: string]: string | undefined;
  },
): Promise<TxsPage> => {
  try {
    const clientUrl = `${getClientUrl(network)}/api/v1/transactions`;
    const url = new URL(clientUrl);

    const endTime = Date.now();
    const diffTime = 90 * 24 * 60 * 60 * 1000;
    url.searchParams.set('endTime', endTime.toString());
    url.searchParams.set('startTime', (endTime - diffTime).toString());

    for (const key in params) {
      const value = params[key];
      if (value) {
        url.searchParams.set(key, value);
        if (key === 'startTime' && !params.endTime) {
          url.searchParams.set(
            'endTime',
            (parseInt(value, 10) + diffTime).toString(),
          );
        }

        if (key === 'endTime' && !params.startTime) {
          url.searchParams.set(
            'startTime',
            (parseInt(value, 10) - diffTime).toString(),
          );
        }
      }
    }

    const txHistory = await getTxWithRateLimitHandling(url.toString());

    return {
      total: txHistory.total,
      txs: txHistory.tx.map(parseTx).filter(Boolean) as Txs,
    };
  } catch (error) {
    return Promise.reject(error);
  }
};

export const getTransactions = async ({
  network,
  params,
}: {
  network: Network;
  params?: TxHistoryParams;
}): Promise<TxsPage> => {
  try {
    return await searchTransactions(network, {
      address: params?.address,
      limit: params?.limit?.toString(),
      offset: params?.offset?.toString(),
      startTime: params?.startTime?.getTime().toString(),
      txAsset: params?.asset,
    });
  } catch (error) {
    return Promise.reject(error);
  }
};

export const getTransactionData = async ({
  network,
  txId,
}: {
  network: Network;
  txId: string;
}): Promise<Tx> => {
  try {
    const txResult: TransactionResult = await axios
      .get(`${getClientUrl(network)}/api/v1/tx/${txId}?format=json`)
      .then((response) => response.data);

    const blockHeight = txResult.height;

    let address = '';
    const msgs = txResult.tx.value.msg;
    if (msgs.length > 0 && msgs[0]) {
      const msg = msgs[0].value as SignedSend;
      if (msg?.inputs && msg.inputs.length > 0 && msg.inputs[0]) {
        address = msg.inputs[0].address;
      } else if (msg?.outputs && msg.outputs.length > 0 && msg.outputs[0]) {
        address = msg.outputs[0].address;
      }
    }

    const txHistory = await searchTransactions(network, {
      address,
      blockHeight,
    });
    const [transaction] = txHistory.txs.filter((tx) => tx.hash === txId);

    if (!transaction) {
      throw new Error('transaction not found');
    }

    return transaction;
  } catch (error) {
    return Promise.reject(error);
  }
};

export const signMessage = async ({
  phrase,
  msg,
}: {
  phrase: DecryptedWallet;
  network: Network;
  msg: string;
}): Promise<Signature> => {
  const pk = await getPrivateKey(phrase);
  if (!pk) {
    throw new Error('Private Key not defined');
  }

  const signature = crypto
    .generateSignature(Buffer.from(msg).toString('hex'), pk)
    .toString('hex');
  const pubKey = crypto.getPublicKeyFromPrivateKey(pk);
  return {signature, pubKey};
};
