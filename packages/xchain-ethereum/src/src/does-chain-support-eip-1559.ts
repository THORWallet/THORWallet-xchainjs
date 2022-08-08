import {SupportedChainIds} from './chain-id';

export const doesChainSupportEIP1559 = (chainId: number): boolean => {
  const map: {
    [key in typeof SupportedChainIds[keyof typeof SupportedChainIds]]: boolean;
  } = {
    '1': true,
    '1284': false,
    '1285': false,
    '137': true,
    '3': false,
    '42161': false,
    '43114': true,
    '250': false,
    '56': false,
  };

  return map[
    chainId as typeof SupportedChainIds[keyof typeof SupportedChainIds]
  ];
};

export const doesChainSupportEtherscanGasOracle = (
  chainId: number,
): boolean => {
  const map: {
    [key in typeof SupportedChainIds[keyof typeof SupportedChainIds]]: boolean;
  } = {
    '1': true,
    '1284': false,
    '1285': false,
    '137': true,
    '3': false,
    '42161': false,
    '43114': false,
    '250': false,
    '56': true,
  };

  return map[
    chainId as typeof SupportedChainIds[keyof typeof SupportedChainIds]
  ];
};
