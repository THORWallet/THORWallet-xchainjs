'use strict';

import {Provider, TransactionRequest} from '@ethersproject/abstract-provider';
import {
  ExternallyOwnedAccount,
  Signer,
  TypedDataDomain,
  TypedDataField,
  TypedDataSigner,
} from '@ethersproject/abstract-signer';
import {getAddress} from '@ethersproject/address';
import {
  arrayify,
  Bytes,
  BytesLike,
  concat,
  hexDataSlice,
  isHexString,
  joinSignature,
  SignatureLike,
} from '@ethersproject/bytes';
import {hashMessage, _TypedDataEncoder} from '@ethersproject/hash';
import {
  decryptJsonWallet,
  decryptJsonWalletSync,
  encryptKeystore,
  ProgressCallback,
} from '@ethersproject/json-wallets';
import {keccak256} from '@ethersproject/keccak256';
import {Logger} from '@ethersproject/logger';
import {defineReadOnly, resolveProperties} from '@ethersproject/properties';
import {randomBytes} from '@ethersproject/random';
import {SigningKey} from '@ethersproject/signing-key';
import {
  computeAddress,
  recoverAddress,
  serialize,
  UnsignedTransaction,
} from '@ethersproject/transactions';
import {Wordlist} from '@ethersproject/wordlists';
import {
  defaultPath,
  entropyToMnemonic,
  HDNode,
  Mnemonic,
} from '../hdnode/hdnode';

const logger = new Logger('THORWALLET_ETHERS_WALLET');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isAccount(value: any): value is ExternallyOwnedAccount {
  return (
    value !== null &&
    value !== undefined &&
    isHexString(value.privateKey, 32) &&
    value.address !== null &&
    value.address !== undefined
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hasMnemonic(value: any): value is {mnemonic: Mnemonic} {
  const {mnemonic} = value;
  return mnemonic?.phrase;
}

export class Wallet
  extends Signer
  implements ExternallyOwnedAccount, TypedDataSigner
{
  // @ts-expect-error
  readonly address: string;
  // @ts-expect-error
  readonly provider: Provider;

  // Wrapping the _signingKey and _mnemonic in a getter function prevents
  // leaking the private key in console.log; still, be careful! :)
  // @ts-expect-error
  readonly _signingKey: () => SigningKey;
  // @ts-expect-error
  readonly _mnemonic: () => Mnemonic;

  constructor(
    privateKey: BytesLike | ExternallyOwnedAccount | SigningKey,
    provider?: Provider,
  ) {
    logger.checkNew(new.target, Wallet);

    super();

    if (isAccount(privateKey)) {
      const signingKey = new SigningKey(privateKey.privateKey);
      defineReadOnly(this, '_signingKey', () => signingKey);
      defineReadOnly(this, 'address', computeAddress(this.publicKey));

      // @ts-expect-error
      if (this.address !== getAddress(privateKey.address)) {
        logger.throwArgumentError(
          'privateKey/address mismatch',
          'privateKey',
          '[REDACTED]',
        );
      }

      if (hasMnemonic(privateKey)) {
        const srcMnemonic = privateKey.mnemonic;
        defineReadOnly(this, '_mnemonic', () => ({
          phrase: srcMnemonic.phrase,
          path: srcMnemonic.path || defaultPath,
          locale: srcMnemonic.locale || 'en',
        }));
      } else {
        // @ts-expect-error
        defineReadOnly(this, '_mnemonic', (): Mnemonic => null);
      }
    } else {
      if (SigningKey.isSigningKey(privateKey)) {
        /* istanbul ignore if */
        if (privateKey.curve !== 'secp256k1') {
          logger.throwArgumentError(
            'unsupported curve; must be secp256k1',
            'privateKey',
            '[REDACTED]',
          );
        }

        defineReadOnly(this, '_signingKey', () => <SigningKey>privateKey);
      } else {
        // A lot of common tools do not prefix private keys with a 0x (see: #1166)
        if (typeof privateKey === 'string') {
          if (privateKey.match(/^[0-9a-f]*$/i) && privateKey.length === 64) {
            privateKey = '0x' + privateKey;
          }
        }

        const signingKey = new SigningKey(privateKey);
        defineReadOnly(this, '_signingKey', () => signingKey);
      }

      // @ts-expect-error
      defineReadOnly(this, '_mnemonic', (): Mnemonic => null);
      defineReadOnly(this, 'address', computeAddress(this.publicKey));
    }

    /* istanbul ignore if */
    if (provider && !Provider.isProvider(provider)) {
      logger.throwArgumentError('invalid provider', 'provider', provider);
    }

    // @ts-expect-error
    defineReadOnly(this, 'provider', provider || null);
  }

  get mnemonic(): Mnemonic {
    return this._mnemonic();
  }

  get privateKey(): string {
    return this._signingKey().privateKey;
  }

  get publicKey(): string {
    return this._signingKey().publicKey;
  }

  getAddress(): Promise<string> {
    return Promise.resolve(this.address);
  }

  connect(provider: Provider): Wallet {
    return new Wallet(this, provider);
  }

  signTransaction(transaction: TransactionRequest): Promise<string> {
    return resolveProperties(transaction).then((tx) => {
      if (tx.from !== null && tx.from !== undefined) {
        if (getAddress(tx.from) !== this.address) {
          logger.throwArgumentError(
            'transaction from address mismatch',
            'transaction.from',
            transaction.from,
          );
        }

        delete tx.from;
      }

      const signature = this._signingKey().signDigest(
        keccak256(serialize(<UnsignedTransaction>tx)),
      );
      return serialize(<UnsignedTransaction>tx, signature);
    });
  }

  signMessage(message: Bytes | string): Promise<string> {
    return Promise.resolve(
      joinSignature(this._signingKey().signDigest(hashMessage(message))),
    );
  }

  async _signTypedData(
    domain: TypedDataDomain,
    types: Record<string, Array<TypedDataField>>,
    value: Record<string, unknown>,
  ): Promise<string> {
    // Populate any ENS names
    const populated = await _TypedDataEncoder.resolveNames(
      domain,
      types,
      value,
      (name: string) => {
        if (this.provider === null || this.provider === undefined) {
          logger.throwError(
            'cannot resolve ENS names without a provider',
            Logger.errors.UNSUPPORTED_OPERATION,
            {
              operation: 'resolveName',
              value: name,
            },
          );
        }

        return this.provider.resolveName(name) as Promise<string>;
      },
    );

    return joinSignature(
      this._signingKey().signDigest(
        _TypedDataEncoder.hash(populated.domain, types, populated.value),
      ),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  encrypt(
    password: Bytes | string,
    options?: any,
    progressCallback?: ProgressCallback,
  ): Promise<string> {
    if (typeof options === 'function' && !progressCallback) {
      progressCallback = options;
      options = {};
    }

    if (progressCallback && typeof progressCallback !== 'function') {
      throw new Error('invalid callback');
    }

    if (!options) {
      options = {};
    }

    return encryptKeystore(this, password, options, progressCallback);
  }

  /**
   *  Static methods to create Wallet instances.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async createRandom(options?: any): Promise<Wallet> {
    let entropy: Uint8Array = randomBytes(16);

    if (!options) {
      options = {};
    }

    if (options.extraEntropy) {
      entropy = arrayify(
        hexDataSlice(keccak256(concat([entropy, options.extraEntropy])), 0, 16),
      );
    }

    const mnemonic = await entropyToMnemonic(entropy, options.locale);
    return Wallet.fromMnemonic(mnemonic, options.path, options.locale);
  }

  static fromEncryptedJson(
    json: string,
    password: Bytes | string,
    progressCallback?: ProgressCallback,
  ): Promise<Wallet> {
    return decryptJsonWallet(json, password, progressCallback).then(
      (account) => {
        return new Wallet(account);
      },
    );
  }

  static fromEncryptedJsonSync(json: string, password: Bytes | string): Wallet {
    return new Wallet(decryptJsonWalletSync(json, password));
  }

  static async fromMnemonic(
    mnemonic: string,
    path?: string,
    wordlist?: Wordlist,
  ): Promise<Wallet> {
    if (!path) {
      path = defaultPath;
    }

    return new Wallet(
      await // @ts-expect-error
      (await HDNode.fromMnemonic(mnemonic, null, wordlist)).derivePath(path),
    );
  }
}

export function verifyMessage(
  message: Bytes | string,
  signature: SignatureLike,
): string {
  return recoverAddress(hashMessage(message), signature);
}

export function verifyTypedData(
  domain: TypedDataDomain,
  types: Record<string, Array<TypedDataField>>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: Record<string, any>,
  signature: SignatureLike,
): string {
  return recoverAddress(
    _TypedDataEncoder.hash(domain, types, value),
    signature,
  );
}
