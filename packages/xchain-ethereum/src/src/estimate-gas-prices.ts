// eslint-disable-next-line no-restricted-imports
import {BigNumber} from '@ethersproject/bignumber';
import {parseUnits} from '@ethersproject/units';
import {getEtherscanishApiKey} from '../../../clients/chains/helpers/get-ethereum-config';
import {SupportedChainIds} from './chain-id';
import {doesChainSupportEtherscanGasOracle} from './does-chain-support-eip-1559';
import {getEtherscanishApiBaseUrl} from './eth-explorer-urls';
import {getGasOracle} from './etherscan-api';
import {getJsonRpcProvider} from './get-json-rpc-provider';
import {GasPrices} from './types/client-types';
import {GasOracleResponse} from './types/etherscan-api-types';

export const estimateGasPrices = async ({
  chainId,
}: {
  chainId: number;
}): Promise<GasPrices> => {
  if (!doesChainSupportEtherscanGasOracle(chainId)) {
    const sidechainBaseFee = await getJsonRpcProvider(chainId).getGasPrice();

    const nothing = parseUnits('0', 'gwei');

    return {
      baseFee: sidechainBaseFee,
      priorityFees: {
        average: nothing,
        fast: nothing,
        fastest: nothing,
      },
    };
  }

  const response: GasOracleResponse = await getGasOracle(
    getEtherscanishApiBaseUrl(chainId),
    getEtherscanishApiKey(chainId),
  );

  let baseFee;
  if (SupportedChainIds.BinanceSmartChain !== chainId) {
    // Convert result of gas prices: `Gwei` -> `Wei`
    baseFee = parseUnits(response.suggestBaseFee, 'gwei');
  } else {
    baseFee = BigNumber.from(0);
  }

  const averageWei = parseUnits(response.SafeGasPrice, 'gwei').sub(baseFee);
  const fastWei = parseUnits(response.ProposeGasPrice, 'gwei').sub(baseFee);
  const fastestWei = parseUnits(response.FastGasPrice, 'gwei').sub(baseFee);

  return {
    baseFee,
    priorityFees: {
      average: averageWei,
      fast: fastWei,
      fastest: fastestWei,
    },
  };
};
