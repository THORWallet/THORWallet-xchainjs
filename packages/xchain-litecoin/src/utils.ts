import {assetAmount, AssetLTC, assetToBase, Chain} from '@xchainjs/xchain-util';
import * as Litecoin from 'bitcoinjs-lib'; // https://github.com/bitcoinjs/bitcoinjs-lib
import coininfo from 'coininfo';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import accumulative from 'coinselect/accumulative';
import {calcUtxoFee, compileMemo} from '../../../helpers/calculate-utxo-fee';
import {FeeRates, UTXO, Witness} from '../../xchain-bitcoin/src';
import {
  Address,
  Balance,
  Fees,
  Network,
  TxHash,
  TxParams,
} from '../../xchain-client/src';
import * as nodeApi from './node-api';
import * as sochain from './sochain-api';
import {FeeRate, FeesWithRates} from './types/client-types';
import {BroadcastTxParams, UTXOs} from './types/common';
import {AddressParams, LtcAddressUTXOs} from './types/sochain-api-types';

export const LTC_DECIMAL = 8;

/**
 * Get the average value of an array.
 *
 * @param {Array<number>} array
 * @returns {number} The average value.
 */
export function arrayAverage(array: Array<number>): number {
  let sum = 0;
  array.forEach((value) => (sum += value));
  return sum / array.length;
}

/**
 * Check if give network is a testnet.
 *
 * @param {Network} network
 * @returns {boolean} `true` or `false`
 */
export const isTestnet = (network: Network): boolean => {
  return network === Network.Testnet;
};

/**
 * Get Litecoin network to be used with bitcoinjs.
 *
 * @param {Network} network
 * @returns {Litecoin.Network} The LTC network.
 */
export const ltcNetwork = (network: Network): Litecoin.Network => {
  return isTestnet(network)
    ? coininfo.litecoin.test.toBitcoinJS()
    : coininfo.litecoin.main.toBitcoinJS();
};

/**
 * Get the balances of an address.
 *
 * @param {AddressParams} params
 * @returns {Array<Balance>} The balances of the given address.
 */
export const getBalance = async (params: AddressParams): Promise<Balance[]> => {
  try {
    const balance = await sochain.getBalance(params);
    return [
      {
        asset: AssetLTC,
        amount: balance,
      },
    ];
  } catch (error) {
    return Promise.reject(new Error('Invalid address'));
  }
};

export const validateAddress = ({
  network,
  address,
}: {
  network: Network;
  address: string;
}): boolean => {
  try {
    Litecoin.address.toOutputScript(address, ltcNetwork(network));
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Scan UTXOs from sochain.
 *
 * @param {AddressParams} params
 * @returns {Array<UTXO>} The UTXOs of the given address.
 */
export const scanUTXOs = async (params: AddressParams): Promise<UTXOs> => {
  const utxos: LtcAddressUTXOs = await sochain.getUnspentTxs(params);

  return utxos.map(
    (utxo) =>
      ({
        hash: utxo.txid,
        index: utxo.output_no,
        value: assetToBase(assetAmount(utxo.value, LTC_DECIMAL))
          .amount()
          .toNumber(),
        witnessUtxo: {
          value: assetToBase(assetAmount(utxo.value, LTC_DECIMAL))
            .amount()
            .toNumber(),
          script: Buffer.from(utxo.script_hex, 'hex'),
        },
      } as UTXO),
  );
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
  feeRate: FeeRate;
  sender: Address;
  network: Network;
  sochainUrl: string;
}): Promise<{psbt: Litecoin.Psbt; utxos: UTXOs}> => {
  try {
    if (!validateAddress({network, address: recipient})) {
      return Promise.reject(new Error('Invalid address'));
    }

    const utxos = await scanUTXOs({sochainUrl, network, address: sender});
    if (utxos.length === 0) {
      return Promise.reject(Error('No utxos to send'));
    }

    const feeRateWhole = Number(feeRate.toFixed(0));
    const compiledMemo = memo ? compileMemo(memo) : null;

    const targetOutputs = [];
    //1. output to recipient
    targetOutputs.push({
      address: recipient,
      value: amount.amount().toNumber(),
    });
    //2. add output memo to targets (optional)
    if (compiledMemo) {
      targetOutputs.push({script: compiledMemo, value: 0});
    }
    const {inputs, outputs} = accumulative(utxos, targetOutputs, feeRateWhole);

    // .inputs and .outputs will be undefined if no solution was found
    if (!inputs || !outputs) {
      return Promise.reject(Error('Balance insufficient for transaction'));
    }

    const psbt = new Litecoin.Psbt({network: ltcNetwork(network)}); // Network-specific
    //Inputs
    inputs.forEach((utxo: UTXO) =>
      psbt.addInput({
        hash: utxo.hash,
        index: utxo.index,
        witnessUtxo: utxo.witnessUtxo as Witness,
      }),
    );

    // Outputs
    outputs.forEach((output: Litecoin.PsbtTxOutput) => {
      if (!output.address) {
        //an empty address means this is the  change ddress
        output.address = sender;
      }
      if (!output.script) {
        psbt.addOutput(output);
      } else {
        //we need to add the compiled memo this way to
        //avoid dust error tx when accumulating memo output with 0 value
        if (compiledMemo) {
          psbt.addOutput({script: compiledMemo, value: 0});
        }
      }
    });

    return {psbt, utxos};
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * Broadcast the transaction.
 *
 * @param {BroadcastTxParams} params The transaction broadcast options.
 * @returns {TxHash} The transaction hash.
 */
export const broadcastTx = async (
  params: BroadcastTxParams,
): Promise<TxHash> => {
  return await nodeApi.broadcastTx(params);
};

/**
 * Get the default fees with rates.
 *
 * @returns {FeesWithRates} The default fees and rates.
 */
export const getDefaultFeesWithRates = (): FeesWithRates => {
  const rates: FeeRates = {
    fastest: 50,
    fast: 20,
    average: 10,
  };

  const fees: Fees = {
    type: 'byte',
    fast: calcUtxoFee(rates.fast, null, Chain.Litecoin),
    average: calcUtxoFee(rates.average, null, Chain.Litecoin),
    fastest: calcUtxoFee(rates.fastest, null, Chain.Litecoin),
  };

  return {
    fees,
    rates,
  };
};

/**
 * Get the default fees.
 *
 * @returns {Fees} The default fees.
 */
export const getDefaultFees = (): Fees => {
  const {fees} = getDefaultFeesWithRates();
  return fees;
};

/**
 * Get address prefix based on the network.
 *
 * @param {string} network
 * @returns {string} The address prefix based on the network.
 *
 **/
export const getPrefix = (network: Network) =>
  network === Network.Testnet ? 'tltc1' : 'ltc1';
