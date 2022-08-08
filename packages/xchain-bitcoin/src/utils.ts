import {
  assetAmount,
  AssetBTC,
  assetToBase,
  baseAmount,
  Chain,
} from '@xchainjs/xchain-util';
import * as Bitcoin from 'bitcoinjs-lib'; // https://github.com/bitcoinjs/bitcoinjs-lib
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import accumulative from 'coinselect/accumulative';
import {calcUtxoFee, compileMemo} from '../../../helpers/calculate-utxo-fee';
import {
  Address,
  Balance,
  Fees,
  Network,
  TxHash,
  TxParams,
} from '../../xchain-client/src';
import * as blockStream from './blockstream-api';
import * as haskoinApi from './haskoin-api';
import * as sochain from './sochain-api';
import {FeeRate, FeeRates, FeesWithRates} from './types/client-types';
import {BroadcastTxParams, UTXO, UTXOs, Witness} from './types/common';
import {
  AddressParams,
  BtcAddressUTXOs,
  ScanUTXOParam,
} from './types/sochain-api-types';

export const BTC_DECIMAL = 8;

/**
 * Get the average value of an array.
 *
 * @param {Array<number>} array
 * @returns {number} The average value.
 */
export const arrayAverage = (array: Array<number>): number => {
  let sum = 0;
  array.forEach((value) => (sum += value));
  return sum / array.length;
};

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
 * Get Bitcoin network to be used with bitcoinjs.
 *
 * @param {Network} network
 * @returns {Bitcoin.Network} The BTC network.
 */
export const btcNetwork = (network: Network): Bitcoin.Network => {
  return isTestnet(network)
    ? Bitcoin.networks.testnet
    : Bitcoin.networks.bitcoin;
};

/**
 * Get the balances of an address.
 *
 * @param {string} sochainUrl sochain Node URL.
 * @param {Network} network
 * @param {Address} address
 * @returns {Array<Balance>} The balances of the given address.
 */
export const getBalance = async (params: AddressParams): Promise<Balance[]> => {
  switch (params.network) {
    case Network.Mainnet:
      return [
        {
          asset: AssetBTC,
          amount: await haskoinApi.getBalance({
            haskoinUrl: 'https://haskoin.ninerealms.com/btc',
            address: params.address,
          }),
        },
      ];
    case Network.Stagenet:
      return [
        {
          asset: AssetBTC,
          amount: await haskoinApi.getBalance({
            haskoinUrl: 'https://haskoin.ninerealms.com/btc',
            address: params.address,
          }),
        },
      ];
    case Network.Testnet:
      return [
        {
          asset: AssetBTC,
          amount: await sochain.getBalance(params),
        },
      ];
  }
};

/**
 * Validate the BTC address.
 *
 * @param {Address} address
 * @param {Network} network
 * @returns {boolean} `true` or `false`.
 */
export const validateAddress = ({
  network,
  address,
}: {
  network: Network;
  address: string;
}): boolean => {
  try {
    Bitcoin.address.toOutputScript(address, btcNetwork(network));
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Scan UTXOs from sochain.
 *
 * @param {string} sochainUrl sochain Node URL.
 * @param {Network} network
 * @param {Address} address
 * @returns {Array<UTXO>} The UTXOs of the given address.
 */
export const scanUTXOs = async ({
  sochainUrl,
  haskoinUrl,
  network,
  address,
  confirmedOnly = true, // default: scan only confirmed UTXOs
}: ScanUTXOParam): Promise<UTXOs> => {
  if (network === Network.Testnet) {
    let utxos: BtcAddressUTXOs = [];

    const addressParam: AddressParams = {
      sochainUrl,
      network,
      address,
    };

    if (confirmedOnly) {
      utxos = await sochain.getConfirmedUnspentTxs(addressParam);
    } else {
      utxos = await sochain.getUnspentTxs(addressParam);
    }

    return utxos.map(
      (utxo) =>
        ({
          hash: utxo.txid,
          index: utxo.output_no,
          value: assetToBase(assetAmount(utxo.value, BTC_DECIMAL))
            .amount()
            .toNumber(),
          witnessUtxo: {
            value: assetToBase(assetAmount(utxo.value, BTC_DECIMAL))
              .amount()
              .toNumber(),
            script: Buffer.from(utxo.script_hex, 'hex'),
          },
        } as UTXO),
    );
  }

  let utxos: haskoinApi.UtxoData[] = [];

  if (confirmedOnly) {
    utxos = await haskoinApi.getConfirmedUnspentTxs({address, haskoinUrl});
  } else {
    utxos = await haskoinApi.getUnspentTxs({address, haskoinUrl});
  }

  return utxos.map(
    (utxo) =>
      ({
        hash: utxo.txid,
        index: utxo.index,
        value: baseAmount(utxo.value, BTC_DECIMAL).amount().toNumber(),
        witnessUtxo: {
          value: baseAmount(utxo.value, BTC_DECIMAL).amount().toNumber(),
          script: Buffer.from(utxo.pkscript, 'hex'),
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
  haskoinUrl,
  spendPendingUTXO = false, // default: prevent spending uncomfirmed UTXOs
}: TxParams & {
  feeRate: FeeRate;
  sender: Address;
  network: Network;
  sochainUrl: string;
  haskoinUrl: string;
  spendPendingUTXO?: boolean;
}): Promise<{psbt: Bitcoin.Psbt; utxos: UTXO[]}> => {
  try {
    // search only confirmed UTXOs if pending UTXO is not allowed
    const confirmedOnly = !spendPendingUTXO;
    const utxos = await scanUTXOs({
      sochainUrl,
      haskoinUrl,
      network,
      address: sender,
      confirmedOnly,
    });

    if (utxos.length === 0) {
      return Promise.reject(Error('No utxos to send'));
    }

    if (!validateAddress({network, address: recipient})) {
      return Promise.reject(new Error('Invalid address'));
    }

    const feeRateWhole = Number(feeRate.toFixed(0));
    const compiledMemo = memo ? compileMemo(memo) : null;

    const targetOutputs = [];

    //1. add output amount and recipient to targets
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
      return Promise.reject(Error('Insufficient Balance for transaction'));
    }

    const psbt = new Bitcoin.Psbt({network: btcNetwork(network)}); // Network-specific

    // psbt add input from accumulative inputs
    inputs.forEach((utxo: UTXO) =>
      psbt.addInput({
        hash: utxo.hash,
        index: utxo.index,
        witnessUtxo: utxo.witnessUtxo as Witness,
      }),
    );

    // psbt add outputs from accumulative outputs
    outputs.forEach((output: Bitcoin.PsbtTxOutput) => {
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
export const broadcastTx = async ({
  network,
  txHex,
  blockstreamUrl,
}: BroadcastTxParams): Promise<TxHash> => {
  return await blockStream.broadcastTx({network, txHex, blockstreamUrl});
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
    fast: calcUtxoFee(rates.fast, null, Chain.Bitcoin),
    average: calcUtxoFee(rates.average, null, Chain.Bitcoin),
    fastest: calcUtxoFee(rates.fastest, null, Chain.Bitcoin),
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
 * @param {Network} network
 * @returns {string} The address prefix based on the network.
 *
 **/
export const getPrefix = (network: Network) =>
  network === Network.Testnet ? 'tb1' : 'bc1';
