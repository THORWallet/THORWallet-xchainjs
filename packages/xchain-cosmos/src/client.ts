import {cosmosclient, proto} from '@cosmos-client/core';
// eslint-disable-next-line no-restricted-imports
import {Asset, baseAmount} from '@xchainjs/xchain-util';
import {BaseAmount} from '@xchainjs/xchain-util/lib';
import BigNumber from 'bignumber.js';
import {assetEqualsAsset} from '../../../helpers/asset-helper';
import {DecryptedWallet} from '../../../store/phrase/phrase-state';
import {
  Address,
  Fees,
  Network,
  Tx,
  TxHash,
  TxHistoryParams,
  TxsPage,
} from '../../xchain-client/src';
import {getAddress, getCosmosDerivationPath} from '../interface/get-address';
import {getBalance} from '../interface/get-balance';
import {AssetAtom, AssetMuon, COSMOS_DECIMAL} from './const';
import {CosmosSDKClient, RPCTxResult} from './cosmos';
import {MAINNET_SDK, TESTNET_SDK} from './sdk-clients';
import {getAsset, getDenom, getTxsFromHistory} from './util';

const getSdk = (network: Network): CosmosSDKClient => {
  if (network === Network.Testnet) {
    return TESTNET_SDK;
  }

  if (network === Network.Mainnet) {
    return MAINNET_SDK;
  }

  throw new Error('unknown network');
};

export const getPrivateKey = ({
  network,
  phrase,
  index,
}: {
  network: Network;
  phrase: string;
  index: number;
}): Promise<proto.cosmos.crypto.secp256k1.PrivKey> => {
  return getSdk(network).getPrivKeyFromMnemonic(
    phrase,
    getCosmosDerivationPath(network, index),
  );
};

/**
 * Get the explorer url.
 *
 * @returns {string} The explorer url.
 */
export const getExplorerUrl = (network: Network): string => {
  switch (network) {
    case Network.Testnet:
      return 'https://explorer.theta-testnet.polypore.xyz';
    case Network.Mainnet:
    case Network.Stagenet:
    default:
      return 'https://cosmos.bigdipper.live';
  }
};

/**
 * Get the explorer url for the given address.
 *
 * @param {Address} address
 * @returns {string} The explorer url for the given address.
 */
export const getExplorerAddressUrl = (
  network: Network,
  address: Address,
): string => {
  return `${getExplorerUrl(network)}/account/${address}`;
};

/**
 * Get the explorer url for the given transaction id.
 *
 * @param {string} txID
 * @returns {string} The explorer url for the given transaction id.
 */
export const getExplorerTxUrl = ({
  network,
  txID,
}: {
  network: Network;
  txID: string;
}): string => {
  return `${getExplorerUrl(network)}/transactions/${txID}`;
};

/**
 * Validate the given address.
 *
 * @param {Address} address
 * @returns {boolean} `true` or `false`
 */
export const validateAddress = ({
  network,
  address,
}: {
  network: Network;
  address: Address;
}): boolean => {
  return getSdk(network).checkAddress(address);
};

/**
 * Get the main asset based on the network.
 *
 * @returns {string} The main asset based on the network.
 */
export const getMainAsset = (network: Network): Asset => {
  return network === Network.Testnet ? AssetMuon : AssetAtom;
};

export const getTransactions = async ({
  network,
  params,
}: {
  network: Network;
  params: TxHistoryParams & {filterFn?: (tx: RPCTxResult) => boolean};
}): Promise<TxsPage> => {
  const messageAction = undefined;
  const page = params?.offset || undefined;
  const limit = params?.limit || undefined;
  const txMinHeight = undefined;
  const txMaxHeight = undefined;
  const asset = getAsset(params?.asset ?? '') || AssetAtom;

  const txHistory = await getSdk(network).searchTx({
    messageAction,
    messageSender: params.address,
    page,
    limit,
    txMinHeight,
    txMaxHeight,
  });

  return {
    total: parseInt(txHistory.pagination?.total || '0', 10),
    txs: getTxsFromHistory(txHistory.tx_responses || [], asset),
  };
};

export const getTransactionData = async ({
  network,
  txId,
}: {
  network: Network;
  txId: string;
}): Promise<Tx> => {
  const txResult = await getSdk(network).txsHashGet(txId);

  if (!txResult || txResult.txhash === '') {
    throw new Error('transaction not found');
  }

  const txs = getTxsFromHistory([txResult], AssetAtom);
  if (txs.length === 0 || !txs[0]) throw new Error('transaction not found');

  return txs[0];
};

/**
 * Transfer balances.
 *
 * @param {TxParams} params The transfer options.
 * @returns {TxHash} The transaction hash.
 */
export const transfer = async ({
  network,
  phrase,
  asset,
  amount,
  recipient,
  memo,
  feeAmount,
  feeAsset,
  gasLimit,
}: {
  network: Network;
  phrase: DecryptedWallet;
  asset: Asset;
  amount: BaseAmount;
  recipient: string;
  memo: string | null;
  feeAmount: BaseAmount;
  feeAsset: Asset;
  gasLimit: BigNumber;
}): Promise<TxHash> => {
  const address = await getAddress({
    network,
    phrase,
  });
  if (!address) {
    throw new Error(
      'Wallet is in watching mode and no Cosmos address was provided',
    );
  }

  const assetBalance = await getBalance({
    address,
    assets: [asset],
    network,
  });

  if (assetEqualsAsset(asset, AssetAtom)) {
    if (
      !assetBalance[0]?.amount
        .amount()
        .gte(amount.amount().plus(feeAmount.amount()))
    ) {
      throw new Error('insufficient funds');
    }
  } else {
    const atomBalance = await getBalance({
      address,
      assets: [AssetAtom],
      network,
    });
    if (
      !assetBalance[0]?.amount.amount().gte(amount.amount()) ||
      !atomBalance[0]?.amount.amount().gte(feeAmount.amount())
    ) {
      throw new Error('insufficient funds');
    }
  }

  if (phrase.type !== 'from-seed') {
    throw new Error(
      'Wallet is in watching mode and this operation requires seed phrase',
    );
  }

  const privKey = await getPrivateKey({
    network,
    phrase: phrase.seedPhrase,
    index: phrase.walletIndex,
  });

  const fee = new proto.cosmos.tx.v1beta1.Fee({
    amount: [
      new proto.cosmos.base.v1beta1.Coin({
        denom: getDenom(feeAsset),
        amount: feeAmount.amount().toFixed(),
      }),
    ],
    gas_limit: cosmosclient.Long.fromString(gasLimit.toFixed()),
  });

  const transferResult = await getSdk(network).transfer({
    privkey: privKey,
    from: address,
    to: recipient,
    amount: amount.amount().toString(),
    asset: getDenom(asset || AssetAtom),
    memo: memo ?? undefined,
    fee,
  });

  return transferResult || '';
};

/**
 * Get the current fee.
 *
 * @returns {Fees} The current fee.
 */
export const getFees = (): Promise<Fees> => {
  // there is no fixed fee, we set fee amount when creating a transaction.
  return Promise.resolve({
    type: 'base',
    fast: baseAmount(2500, COSMOS_DECIMAL),
    fastest: baseAmount(3200, COSMOS_DECIMAL),
    average: baseAmount(2000, COSMOS_DECIMAL),
  });
};
