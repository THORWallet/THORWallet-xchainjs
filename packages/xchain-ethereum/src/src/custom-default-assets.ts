import {Asset, Chain} from '@xchainjs/xchain-util';
import {truthy} from '../../../helpers/truthy';
import {EnabledToken} from '../../../store/enabled-tokens';

export const customDefaultAssetsForChain = ({
  chain,
  chainId,
  enabledTokens,
}: {
  chain: Chain;
  chainId?: number;
  enabledTokens: EnabledToken[];
}): Asset[] => {
  if (chain === Chain.Ethereum) {
    if (!chainId) {
      throw new Error('expected chainId when Chain.Ethereum');
    }

    return enabledTokens
      .filter((token) => {
        if (token.type !== 'evm-token') {
          return false;
        }

        if (token.chainId !== chainId) {
          return false;
        }

        return true;
      })
      .map((token): Asset | null => {
        if (token.type !== 'evm-token') {
          return null;
        }

        return {
          chain: Chain.Ethereum,
          ticker: token.ticker,
          symbol: `${token.ticker}-${token.contract}`,
          synth: false,
          chainId: token.chainId,
        };
      })
      .filter(truthy);
  }

  if (chain === Chain.TerraClassic) {
    return enabledTokens
      .filter(
        (token) =>
          token.type === 'cw20-token' && token.chain === Chain.TerraClassic,
      )
      .map((token): Asset | null => {
        if (token.type !== 'cw20-token') {
          return null;
        }

        return {
          chain: token.chain,
          ticker: token.ticker,
          symbol: `${token.ticker}-${token.contract}`,
          synth: false,
        };
      })
      .filter(truthy);
  }

  if (chain === Chain.Terra) {
    return enabledTokens
      .filter(
        (token) => token.type === 'cw20-token' && token.chain === Chain.Terra,
      )
      .map((token): Asset | null => {
        if (token.type !== 'cw20-token') {
          return null;
        }

        return {
          chain: token.chain,
          ticker: token.ticker,
          symbol: `${token.ticker}-${token.contract}`,
          synth: false,
        };
      })
      .filter(truthy);
  }

  throw new Error(
    'custom default assets only supported for EVM chains and Terra',
  );
};
