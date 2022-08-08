import {AssetDOGE, assetToBase} from '@xchainjs/xchain-util';
import * as Dogecoin from 'bitcoinjs-lib';
import coininfo from 'coininfo';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import accumulative from 'coinselect/accumulative';
import {assetAmount} from '../../../helpers/amount-helper';
import {compileMemo} from '../../../helpers/calculate-utxo-fee';
import {UTXO} from '../../xchain-bitcoin/src';
import {
  Address,
  Balance,
  Network,
  TxHash,
  TxParams,
} from '../../xchain-client/src';
import {DOGE_DECIMAL} from './const';
import * as nodeApi from './node-api';
import * as sochain from './sochain-api';
import {BroadcastTxParams} from './types/common';
import {AddressParams, DogeAddressUTXO} from './types/sochain-api-types';

/**
 * Get the average value of an array.
 *
 * @param {number[]} array
 * @returns {number} The average value.
 */
export function arrayAverage(array: number[]): number {
  let sum = 0;
  array.forEach((value) => {
    sum += value;
  });
  return sum / array.length;
}

/**
 * Get Dogecoin network to be used with bitcoinjs.
 *
 * @param {Network} network
 * @returns {Dogecoin.networks.Network} The Doge network.
 */
export const dogeNetwork = (network: Network): Dogecoin.networks.Network => {
  switch (network) {
    case Network.Mainnet:
      return coininfo.dogecoin.main.toBitcoinJS();
    case Network.Testnet: {
      // Latest coininfo on NPM doesn't contain dogetest config information
      const bip32 = {
        private: 0x04358394,
        public: 0x043587cf,
      };
      const {test} = coininfo.dogecoin;
      test.versions.bip32 = bip32;
      return test.toBitcoinJS();
    }

    default:
      throw new Error('unknown network: ' + network);
  }
};

/**
 * Get the balances of an address.
 *
 * @param {AddressParams} params
 * @returns {Balance[]} The balances of the given address.
 */
export const getBalance = async (params: AddressParams): Promise<Balance[]> => {
  try {
    const balance = await sochain.getBalance(params);
    return [
      {
        asset: AssetDOGE,
        amount: balance,
      },
    ];
  } catch (error) {
    throw new Error(`Could not get balances for address ${params.address}`);
  }
};

/**
 * Validate the Doge address.
 *
 * @param {string} address
 * @param {Network} network
 * @returns {boolean} `true` or `false`.
 */
export const validateAddress = (
  network: Network,
  address: Address,
): boolean => {
  try {
    Dogecoin.address.toOutputScript(address, dogeNetwork(network));
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Scan UTXOs from sochain.
 *
 * @param {AddressParams} params
 * @returns {UTXO[]} The UTXOs of the given address.
 */
export const scanUTXOs = async (params: AddressParams): Promise<UTXO[]> => {
  const unspent: DogeAddressUTXO[] = await sochain.getUnspentTxs(params);
  const utxos: UTXO[] = [];
  for (const utxo of unspent) {
    utxos.push({
      hash: utxo.txid,
      index: utxo.output_no,
      value: assetToBase(assetAmount(utxo.value, DOGE_DECIMAL))
        .amount()
        .toNumber(),
      txHex: utxo.txid,
      witnessUtxo: null,
    });
  }

  return utxos;
};

/**
 * Build transcation.
 *
 * @param {BuildParams} params The transaction build options.
 * @returns {Transaction}
 */
export const buildTx = async ({
  amount,
  recipient,
  memo,
  feeRate,
  sender,
  network,
  sochainUrl,
}: TxParams & {
  feeRate: number;
  sender: Address;
  network: Network;
  sochainUrl: string;
}): Promise<{psbt: Dogecoin.Psbt; utxos: UTXO[]}> => {
  if (!validateAddress(network, recipient)) throw new Error('Invalid address');

  const utxos = await scanUTXOs({sochainUrl, network, address: sender});
  if (utxos.length === 0) throw new Error('No utxos to send');

  const feeRateWhole = Number(feeRate.toFixed(0));
  const compiledMemo = memo ? compileMemo(memo) : null;

  const targetOutputs = [];
  // 1. output to recipient
  targetOutputs.push({
    address: recipient,
    value: amount.amount().toNumber(),
  });
  // 2. add output memo to targets (optional)
  if (compiledMemo) {
    targetOutputs.push({script: compiledMemo, value: 0});
  }

  const {inputs, outputs} = accumulative(utxos, targetOutputs, feeRateWhole);

  // .inputs and .outputs will be undefined if no solution was found
  if (!inputs || !outputs)
    throw new Error('Balance insufficient for transaction');

  const psbt = new Dogecoin.Psbt({network: dogeNetwork(network)}); // Network-specific
  psbt.setMaximumFeeRate(5500000);
  const params = {sochainUrl, network, address: sender};

  for (const utxo of inputs) {
    psbt.addInput({
      hash: utxo.hash,
      index: utxo.index,
      nonWitnessUtxo: Buffer.from(
        (await sochain.getTx({hash: utxo.hash, ...params})).tx_hex,
        'hex',
      ),
    });
  }

  // Outputs
  outputs.forEach((output: Dogecoin.PsbtTxOutput) => {
    if (!output.address) {
      // an empty address means this is the  change address
      output.address = sender;
    }

    if (!output.script) {
      psbt.addOutput(output);
      return;
    }

    if (compiledMemo) {
      // we need to add the compiled memo this way to
      // avoid dust error tx when accumulating memo output with 0 value
      psbt.addOutput({script: compiledMemo, value: 0});
    }
  });

  return {psbt, utxos};
};

/**
 * Broadcast the transaction.
 *
 * @param {BroadcastTxParams} params The transaction broadcast options.
 * @returns {TxHash} The transaction hash.
 */
export const broadcastTx = (params: BroadcastTxParams): Promise<TxHash> => {
  if (params.network === Network.Testnet) {
    return nodeApi.broadcastTxToSochain(params);
  }

  return nodeApi.broadcastTxToBlockCypher(params);
};

/**
 * Get address prefix based on the network.
 *
 *
 **/
export const getPrefix = (network: Network) => {
  switch (network) {
    case Network.Mainnet:
    case Network.Testnet:
      return 'n';
    default:
      throw new Error('unknown error');
  }
};
