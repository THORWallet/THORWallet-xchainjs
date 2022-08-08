const bitcash = require('@psf/bitcoincashjs-lib');

import {AssetBCH, baseAmount, Chain} from '@xchainjs/xchain-util';
import * as bchaddr from 'bchaddrjs';
import coininfo from 'coininfo';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error
import accumulative from 'coinselect/accumulative';
import {calcUtxoFee, compileMemo} from '../../../helpers/calculate-utxo-fee';
import {extractMemoFromHaskoin} from '../../../helpers/extract-memo';
import {FeeRates} from '../../xchain-bitcoin/src';
import {
  Address,
  Balance,
  Fees,
  Network,
  Tx,
  TxFrom,
  TxParams,
  TxTo,
} from '../../xchain-client/src';
import {
  getAccount,
  getRawTransaction,
  getUnspentTransactions,
} from './haskoin-api';
import {
  AddressParams,
  FeeRate,
  FeesWithRates,
  Transaction,
  TransactionInput,
  TransactionOutput,
  UTXO,
  UTXOs,
} from './types';
import {
  Network as BCHNetwork,
  TransactionBuilder,
} from './types/bitcoincashjs-types';

// https://github.com/bitcoin-cash-node/bitcoin-cash-node/blob/master/src/validation.h#L72
export const MIN_TX_FEE = 1000;
export const BCH_DECIMAL = 8;
export const DEFAULT_SUGGESTED_TRANSACTION_FEE = 1;

/**
 * Get the balances of an address.
 *
 * @param {AddressParams} params
 * @returns {Array<Balance>} The balances of the given address.
 */
export const getBalance = async (params: AddressParams): Promise<Balance[]> => {
  try {
    const account = await getAccount(params);
    if (!account) {
      return Promise.reject(new Error('No bchBalance found'));
    }

    const confirmed = baseAmount(account.confirmed, BCH_DECIMAL);
    const unconfirmed = baseAmount(account.unconfirmed, BCH_DECIMAL);

    account.confirmed;
    return [
      {
        asset: AssetBCH,
        amount: baseAmount(
          confirmed.amount().plus(unconfirmed.amount()),
          BCH_DECIMAL,
        ),
      },
    ];
  } catch (error) {
    return Promise.reject(new Error('Invalid address'));
  }
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
 * Get BCH network to be used with bitcore-lib.
 *
 * @param {Network} network
 * @returns {} The BCH network.
 */
export const bchNetwork = (network: Network): BCHNetwork => {
  return isTestnet(network)
    ? coininfo.bitcoincash.test.toBitcoinJS()
    : coininfo.bitcoincash.main.toBitcoinJS();
};

/**
 * BCH new addresses strategy has no any prefixes.
 * Any possible prefixes at the TX addresses will be stripped out with parseTransaction
 **/
export const getPrefix = () => '';

/**
 * Strips bchtest or bitcoincash prefix from address
 *
 * @param {Address} address
 * @returns {Address} The address with prefix removed
 *
 */
export const stripPrefix = (address: Address): Address =>
  address.replace(/(bchtest:|bitcoincash:)/, '');

/**
 * Convert to Legacy Address.
 *
 * @param {Address} address
 * @returns {Address} Legacy address.
 */
export const toLegacyAddress = (address: Address): Address => {
  return bchaddr.toLegacyAddress(address);
};

/**
 * Convert to Cash Address.
 *
 * @param {Address} address
 * @returns {Address} Cash address.
 */
export const toCashAddress = (address: Address): Address => {
  return bchaddr.toCashAddress(address);
};

/**
 * Parse transaction.
 *
 * @param {Transaction} tx
 * @returns {Tx} Parsed transaction.
 *
 **/
export const parseTransaction = (tx: Transaction): Tx => {
  return {
    asset: AssetBCH,
    from: tx.inputs
      // For correct type inference `Array.prototype.filter` needs manual type guard to be defined
      .filter(
        (
          input,
        ): input is Omit<TransactionInput, 'address'> & {address: string} =>
          !!input.address,
      )
      .map(
        (input) =>
          ({
            from: stripPrefix(input.address),
            amount: baseAmount(input.value, BCH_DECIMAL),
          } as TxFrom),
      ),
    to: tx.outputs
      // For correct type inference `Array.prototype.filter` needs manual type guard to be defined
      .filter(
        (
          output,
        ): output is Omit<TransactionOutput, 'address'> & {address: string} =>
          !!output.address,
      )
      .map(
        (output) =>
          ({
            to: stripPrefix(output.address),
            amount: baseAmount(output.value, BCH_DECIMAL),
          } as TxTo),
      ),
    date: new Date(tx.time * 1000),
    type: 'transfer',
    hash: tx.txid,
    binanceFee: null,
    confirmations: null,
    ethCumulativeGasUsed: null,
    ethGas: null,
    ethGasPrice: null,
    ethGasUsed: null,
    ethTokenName: null,
    ethTokenSymbol: null,
    memo: extractMemoFromHaskoin(tx),
  };
};

/**
 * Converts `Network` to `bchaddr.Network`
 *
 * @param {Network} network
 * @returns {string} bchaddr network
 */
export const toBCHAddressNetwork = (network: Network): string =>
  network === Network.Testnet
    ? bchaddr.Network.Testnet
    : bchaddr.Network.Mainnet;

export const validateAddress = ({
  network,
  address,
}: {
  network: Network;
  address: string;
}): boolean => {
  try {
    const toAddress = toCashAddress(address);
    return (
      bchaddr.isValidAddress(toAddress) &&
      bchaddr.detectAddressNetwork(toAddress) === toBCHAddressNetwork(network)
    );
  } catch (err) {
    return false;
  }
};
/**
 * Scan UTXOs from sochain.
 *
 * @param {string} haskoinUrl sochain Node URL.
 * @param {Address} address
 * @returns {Array<UTXO>} The UTXOs of the given address.
 */
export const scanUTXOs = async (
  haskoinUrl: string,
  address: Address,
): Promise<UTXOs> => {
  const unspents = await getUnspentTransactions({haskoinUrl, address});
  const utxos: UTXOs = [];

  for (const utxo of unspents || []) {
    utxos.push({
      hash: utxo.txid,
      value: utxo.value,
      index: utxo.index,
      witnessUtxo: {
        value: utxo.value,
        script: bitcash.script.compile(Buffer.from(utxo.pkscript, 'hex')),
      },
      address: utxo.address,
      txHex: await getRawTransaction({haskoinUrl, txId: utxo.txid}),
    } as UTXO);
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
  haskoinUrl,
}: TxParams & {
  feeRate: FeeRate;
  sender: Address;
  network: Network;
  haskoinUrl: string;
}): Promise<{
  builder: TransactionBuilder;
  inputUTXOs: UTXOs;
}> => {
  try {
    const recipientCashAddress = toCashAddress(recipient);
    if (!validateAddress({network, address: recipientCashAddress})) {
      return Promise.reject(new Error('Invalid address'));
    }

    const utxos = await scanUTXOs(haskoinUrl, sender);
    if (utxos.length === 0) {
      return Promise.reject(Error('No utxos to send'));
    }

    const feeRateWhole = Number(feeRate.toFixed(0));
    const compiledMemo = memo ? compileMemo(memo) : null;

    const targetOutputs = [];
    // output to recipient
    targetOutputs.push({
      address: recipient,
      value: amount.amount().toNumber(),
    });
    const {inputs, outputs} = accumulative(utxos, targetOutputs, feeRateWhole);

    // .inputs and .outputs will be undefined if no solution was found
    if (!inputs || !outputs) {
      return Promise.reject(Error('Balance insufficient for transaction'));
    }

    const transactionBuilder = new bitcash.TransactionBuilder(
      bchNetwork(network),
    );

    //Inputs
    inputs.forEach((utxo: UTXO) =>
      transactionBuilder.addInput(
        bitcash.Transaction.fromBuffer(Buffer.from(utxo.txHex, 'hex')),
        utxo.index,
      ),
    );

    // Outputs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    outputs.forEach((output: any) => {
      let out = undefined;
      if (!output.address) {
        //an empty address means this is the  change address
        out = bitcash.address.toOutputScript(
          toLegacyAddress(sender),
          bchNetwork(network),
        );
      } else if (output.address) {
        out = bitcash.address.toOutputScript(
          toLegacyAddress(output.address),
          bchNetwork(network),
        );
      }
      transactionBuilder.addOutput(out, output.value);
    });

    // add output for memo
    if (compiledMemo) {
      transactionBuilder.addOutput(compiledMemo, 0); // Add OP_RETURN {script, value}
    }

    return {
      builder: transactionBuilder,
      inputUTXOs: inputs,
    };
  } catch (e) {
    return Promise.reject(e);
  }
};

/**
 * Get the default fees with rates.
 *
 * @returns {FeesWithRates} The default fees and rates.
 */
export const getDefaultFeesWithRates = (): FeesWithRates => {
  const nextBlockFeeRate = 1;
  const rates: FeeRates = {
    fastest: nextBlockFeeRate * 5,
    fast: nextBlockFeeRate * 2,
    average: nextBlockFeeRate * 1,
  };

  const fees: Fees = {
    type: 'byte',
    fast: calcUtxoFee(rates.fast, null, Chain.BitcoinCash),
    average: calcUtxoFee(rates.average, null, Chain.BitcoinCash),
    fastest: calcUtxoFee(rates.fastest, null, Chain.BitcoinCash),
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
