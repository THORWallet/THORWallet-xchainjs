import {arrayify, BytesLike} from '@ethersproject/bytes';
import {toUtf8Bytes, UnicodeNormalizationForm} from '@ethersproject/strings';
import RNSimple from 'react-native-simple-crypto';

function buf2hex(buffer: ArrayBuffer) {
  // buffer is an ArrayBuffer
  return [...new Uint8Array(buffer)]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('');
}

export function nativeSha256(data: BytesLike): Promise<ArrayBuffer> {
  return RNSimple.SHA.sha256(Buffer.from(arrayify(data)));
}

export async function sha256(data: BytesLike): Promise<string> {
  const hash = await RNSimple.SHA.sha256(Buffer.from(arrayify(data)));
  return '0x' + buf2hex(hash);
}

export const pbkdf2 = (mnemonic: string, salt: Uint8Array) => {
  return RNSimple.PBKDF2.hash(
    toUtf8Bytes(mnemonic, UnicodeNormalizationForm.NFKD),
    salt,
    2048,
    64,
    'SHA512',
  );
};
