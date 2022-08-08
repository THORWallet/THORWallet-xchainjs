'use strict';

import {arrayify, BytesLike, hexlify} from '@ethersproject/bytes';
import {defineReadOnly} from '@ethersproject/properties';
import {EC} from './elliptic';

// @ts-expect-error
let _curve: EC = null;
function getCurve() {
  if (!_curve) {
    _curve = new EC('secp256k1');
  }

  return _curve;
}

const fromPrivateCache: {[key: string]: string} = {};

const getPublicFromPrivate = (
  bytes: Uint8Array | string,
  compressed: boolean,
) => {
  const key = bytes.toString() + String(compressed);
  if (!fromPrivateCache[key]) {
    fromPrivateCache[key] = getCurve()
      .keyFromPrivate(arrayify(bytes))
      .getPublic(compressed, 'hex');
  }

  return fromPrivateCache[key];
};

export class SigningKey {
  // @ts-expect-error
  readonly curve: string;

  // @ts-expect-error
  readonly privateKey: string;
  // @ts-expect-error
  readonly compressedPublicKey: string;

  // @ts-expect-error
  readonly _isSigningKey: boolean;

  constructor(privateKey: BytesLike) {
    defineReadOnly(this, 'curve', 'secp256k1');

    defineReadOnly(this, 'privateKey', hexlify(privateKey));

    defineReadOnly(
      this,
      'compressedPublicKey',
      // @ts-expect-error
      '0x' + getPublicFromPrivate(this.privateKey, true),
    );

    defineReadOnly(this, '_isSigningKey', true);
  }
}
