import {getAddress} from '@ethersproject/address';
import {arrayify, BytesLike, hexDataSlice, hexlify} from '@ethersproject/bytes';
import {keccak256} from '../../../xchain-crypto/src/keccak256';

export function computePublicKey(key: BytesLike, compressed?: boolean): string {
  const bytes = arrayify(key);

  if (bytes.length === 32) {
    throw new Error('unexpected length 32');
  }

  if (bytes.length === 33) {
    if (compressed) {
      return hexlify(bytes);
    }

    return (
      '0x' +
      require('react-native').NativeModules.ThorCrypto.ecc(
        Buffer.from(bytes).toString('base64'),
      )
    );
  }

  if (bytes.length === 65) {
    throw new TypeError('unexpected length 65');
  }

  throw new TypeError('invalid public or private key [REDACTED]');
}

export const computeAddress = (publicKey: string) => {
  return getAddress(
    hexDataSlice(keccak256(hexDataSlice(computePublicKey(publicKey), 1)), 12),
  );
};
