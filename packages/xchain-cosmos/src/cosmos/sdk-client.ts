import {cosmosclient, proto, rest} from '@cosmos-client/core';
import axios from 'axios';
import {TxHash, TxHistoryParams} from '../../../xchain-client/src';
import * as xchainCrypto from '../../../xchain-crypto/src';
import {DEFAULT_GAS_LIMIT} from '../const';
import {getQueryString} from '../util';
import {
  APIQueryParam,
  CosmosSDKClientParams,
  GetTxByHashResponse,
  RPCResponse,
  RPCTxSearchResult,
  SearchTxParams,
  TransferOfflineParams,
  TransferParams,
  TxHistoryResponse,
  TxResponse,
  UnsignedTxParams,
} from './types';

const DEFAULT_FEE = new proto.cosmos.tx.v1beta1.Fee({
  amount: [],
  gas_limit: cosmosclient.Long.fromString(DEFAULT_GAS_LIMIT),
});

export class CosmosSDKClient {
  sdk: cosmosclient.CosmosSDK;

  server: string;
  chainId: string;

  prefix = '';

  // by default, cosmos chain
  constructor({server, chainId, prefix = 'cosmos'}: CosmosSDKClientParams) {
    this.server = server;
    this.chainId = chainId;
    this.sdk = new cosmosclient.CosmosSDK(server, this.chainId);

    this.updatePrefix(prefix);
  }

  updatePrefix(prefix: string) {
    this.prefix = prefix;
    this.setPrefix();
  }

  setPrefix(): void {
    cosmosclient.config.setBech32Prefix({
      accAddr: this.prefix,
      accPub: this.prefix + 'pub',
      valAddr: this.prefix + 'valoper',
      valPub: this.prefix + 'valoperpub',
      consAddr: this.prefix + 'valcons',
      consPub: this.prefix + 'valconspub',
    });
  }

  getAddressFromPrivKey(
    privkey: proto.cosmos.crypto.secp256k1.PrivKey,
  ): string {
    this.setPrefix();

    return cosmosclient.AccAddress.fromPublicKey(privkey.pubKey()).toString();
  }

  getAddressFromMnemonic = async (
    mnemonic: string,
    derivationPath: string,
  ): Promise<string> => {
    this.setPrefix();
    const privKey = await this.getPrivKeyFromMnemonic(mnemonic, derivationPath);
    let address = cosmosclient.AccAddress.fromPublicKey(
      privKey.pubKey(),
    ).toString();

    // this block below is far from ideal, there seems to be an issue with the
    // cosmos client method fromPublicKey() which sometimes (ramdomly) ignores the
    // prefix (cosmos/thor) and so it computes the wrong address.
    // This while loop tries to get the address several times until the prefix matches
    // the expectation. Usually it only takes 1 more try to get it right.
    // NOTE: This should be reported to the cosmos devs or upgrade the version of cosmos we
    // use to v0.46.0 when released (several changes to the codebase will be required though).
    let attempts = 0;
    while (!address.includes(this.prefix) && attempts < 4) {
      attempts += 1;
      this.setPrefix();
      address = cosmosclient.AccAddress.fromPublicKey(
        privKey.pubKey(),
      ).toString();
    }

    return address;
  };

  async getPrivKeyFromMnemonic(
    mnemonic: string,
    derivationPath: string,
  ): Promise<proto.cosmos.crypto.secp256k1.PrivKey> {
    this.setPrefix();
    const seed = await xchainCrypto.getSeed(mnemonic);
    const node = await xchainCrypto.bip32.fromSeed(seed);
    const child = await node.derivePath(derivationPath);

    if (!child.privateKey) throw new Error('child does not have a privateKey');

    return new proto.cosmos.crypto.secp256k1.PrivKey({key: child.privateKey});
  }

  checkAddress(address: string): boolean {
    this.setPrefix();

    if (!address.startsWith(this.prefix)) return false;

    try {
      return cosmosclient.AccAddress.fromString(address).toString() === address;
    } catch (err) {
      return false;
    }
  }

  getUnsignedTxBody({
    from,
    to,
    amount,
    asset,
    memo = '',
  }: UnsignedTxParams): proto.cosmos.tx.v1beta1.TxBody {
    const msgSend = new proto.cosmos.bank.v1beta1.MsgSend({
      from_address: from,
      to_address: to,
      amount: [
        {
          amount,
          denom: asset,
        },
      ],
    });

    return new proto.cosmos.tx.v1beta1.TxBody({
      messages: [cosmosclient.codec.packAny(msgSend)],
      memo,
    });
  }

  async getBalance(address: string): Promise<proto.cosmos.base.v1beta1.Coin[]> {
    this.setPrefix();

    const accAddress = cosmosclient.AccAddress.fromString(address);
    const response = await rest.bank.allBalances(this.sdk, accAddress);
    const balances: proto.cosmos.base.v1beta1.Coin[] =
      response.data.balances?.reduce(
        (acc: proto.cosmos.base.v1beta1.Coin[], {amount, denom}) =>
          Boolean(amount) && Boolean(denom)
            ? [...acc, new proto.cosmos.base.v1beta1.Coin({amount, denom})]
            : acc,
        [],
      ) || [];
    return balances;
  }

  async getAccount(
    address: cosmosclient.AccAddress,
  ): Promise<proto.cosmos.auth.v1beta1.IBaseAccount> {
    const account = await rest.auth
      .account(this.sdk, address)
      .then(
        (res) =>
          res.data.account &&
          cosmosclient.codec.unpackCosmosAny(res.data.account),
      )
      .catch(() => undefined);
    if (!(account instanceof proto.cosmos.auth.v1beta1.BaseAccount)) {
      throw Error('could not get account');
    }

    return account;
  }

  async searchTx({
    messageAction,
    messageSender,
    page,
    limit,
  }: SearchTxParams): Promise<TxHistoryResponse> {
    const queryParameter: APIQueryParam = {};

    if (!messageAction && !messageSender) {
      throw new Error(
        'One of messageAction or messageSender must be specified',
      );
    }

    let eventsParam = '';

    if (messageAction !== undefined) {
      eventsParam = `message.action='${messageAction}'`;
    }

    if (messageSender !== undefined) {
      const prefix = eventsParam.length > 0 ? ',' : '';
      eventsParam = `${eventsParam}${prefix}message.sender='${messageSender}'`;
    }

    if (page !== undefined) {
      queryParameter.page = page.toString();
    }

    if (limit !== undefined) {
      queryParameter.limit = limit.toString();
    }

    queryParameter.events = eventsParam;

    this.setPrefix();

    return (
      await axios.get<TxHistoryParams>(
        `${this.server}/cosmos/tx/v1beta1/txs?${getQueryString(
          queryParameter,
        )}`,
      )
    ).data;
  }

  async searchTxFromRPC({
    messageAction,
    messageSender,
    transferSender,
    transferRecipient,
    page,
    limit,
    txMinHeight,
    txMaxHeight,
    rpcEndpoint,
  }: SearchTxParams & {
    rpcEndpoint: string;
  }): Promise<RPCTxSearchResult> {
    const queryParameter: string[] = [];
    if (messageAction !== undefined) {
      queryParameter.push(`message.action='${messageAction}'`);
    }

    if (messageSender !== undefined) {
      queryParameter.push(`message.sender='${messageSender}'`);
    }

    if (transferSender !== undefined) {
      queryParameter.push(`transfer.sender='${transferSender}'`);
    }

    if (transferRecipient !== undefined) {
      queryParameter.push(`transfer.recipient='${transferRecipient}'`);
    }

    if (txMinHeight !== undefined) {
      queryParameter.push(`tx.height>='${txMinHeight}'`);
    }

    if (txMaxHeight !== undefined) {
      queryParameter.push(`tx.height<='${txMaxHeight}'`);
    }

    const searchParameter: string[] = [];
    searchParameter.push(`query="${queryParameter.join(' AND ')}"`);

    if (page !== undefined) {
      searchParameter.push(`page="${page}"`);
    }

    if (limit !== undefined) {
      searchParameter.push(`per_page="${limit}"`);
    }

    searchParameter.push(`order_by="desc"`);

    const response: RPCResponse<RPCTxSearchResult> = (
      await axios.get(`${rpcEndpoint}/tx_search?${searchParameter.join('&')}`)
    ).data;

    return response.result;
  }

  async txsHashGet(hash: string): Promise<TxResponse> {
    this.setPrefix();

    return (
      await axios.get<GetTxByHashResponse>(
        `${this.server}/cosmos/tx/v1beta1/txs/${hash}`,
      )
    ).data.tx_response;
  }

  async transfer({
    privkey,
    from,
    to,
    amount,
    asset,
    memo = '',
    fee = DEFAULT_FEE,
  }: TransferParams): Promise<TxHash> {
    this.setPrefix();

    const msgSend = new proto.cosmos.bank.v1beta1.MsgSend({
      from_address: from,
      to_address: to,
      amount: [
        {
          amount,
          denom: asset,
        },
      ],
    });

    const pubKey = privkey.pubKey();
    const signer = cosmosclient.AccAddress.fromPublicKey(pubKey);

    const account = await this.getAccount(signer);

    const txBody = new proto.cosmos.tx.v1beta1.TxBody({
      messages: [cosmosclient.codec.packAny(msgSend)],
      memo,
    });

    const authInfo = new proto.cosmos.tx.v1beta1.AuthInfo({
      signer_infos: [
        {
          public_key: cosmosclient.codec.packAny(pubKey),
          mode_info: {
            single: {
              mode: proto.cosmos.tx.signing.v1beta1.SignMode.SIGN_MODE_DIRECT,
            },
          },
          sequence: account.sequence,
        },
      ],
      fee,
    });

    const txBuilder = new cosmosclient.TxBuilder(this.sdk, txBody, authInfo);

    return this.signAndBroadcast(txBuilder, privkey, account);
  }

  async transferSignedOffline({
    privkey,
    from,
    from_account_number = '0',
    from_sequence = '0',
    to,
    amount,
    asset,
    memo = '',
    fee = DEFAULT_FEE,
  }: TransferOfflineParams): Promise<string> {
    const txBody = this.getUnsignedTxBody({from, to, amount, asset, memo});

    const authInfo = new proto.cosmos.tx.v1beta1.AuthInfo({
      signer_infos: [
        {
          public_key: cosmosclient.codec.packAny(privkey.pubKey()),
          mode_info: {
            single: {
              mode: proto.cosmos.tx.signing.v1beta1.SignMode.SIGN_MODE_DIRECT,
            },
          },
          sequence: cosmosclient.Long.fromString(from_sequence),
        },
      ],
      fee,
    });

    const txBuilder = new cosmosclient.TxBuilder(this.sdk, txBody, authInfo);

    const signDocBytes = txBuilder.signDocBytes(
      cosmosclient.Long.fromString(from_account_number),
    );
    txBuilder.addSignature(privkey.sign(signDocBytes));
    return txBuilder.txBytes();
  }

  async signAndBroadcast(
    txBuilder: cosmosclient.TxBuilder,
    privKey: proto.cosmos.crypto.secp256k1.PrivKey,
    signerAccount: proto.cosmos.auth.v1beta1.IBaseAccount,
  ): Promise<string> {
    this.setPrefix();

    if (!signerAccount || !signerAccount.account_number)
      throw new Error('Invalid Account');

    // sign
    const signDocBytes = txBuilder.signDocBytes(signerAccount.account_number);
    txBuilder.addSignature(privKey.sign(signDocBytes));

    // broadcast
    const res = await rest.tx.broadcastTx(this.sdk, {
      tx_bytes: txBuilder.txBytes(),
      mode: rest.tx.BroadcastTxMode.Sync,
    });

    if (res?.data?.tx_response?.code !== 0) {
      throw new Error(
        // eslint-disable-next-line no-unsafe-optional-chaining
        'Error broadcasting: ' + res?.data?.tx_response?.raw_log ??
          'unknown error',
      );
    }

    if (!res.data?.tx_response.txhash || res.data?.tx_response.txhash === '') {
      throw new Error('Error broadcasting, txhash not present on response');
    }

    return res.data.tx_response.txhash;
  }
}
