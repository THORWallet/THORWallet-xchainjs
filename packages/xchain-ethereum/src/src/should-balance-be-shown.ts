import {isEVMNativeAsset} from '../../../helpers/asset-helper';
import {getContractAddressFromErc20Asset} from '../../../helpers/get-contract-address-from-erc20-asset';
import {EnabledToken} from '../../../store/enabled-tokens';
import {Balance} from '../../xchain-client/src';

export const shouldBalanceBeShown = (
  b: Balance,
  chainId: number,
  enabledTokens: EnabledToken[],
) => {
  if (isEVMNativeAsset(b.asset)) {
    return true;
  }

  if (b.amount.gt('0.0')) {
    return true;
  }

  const erc20 = getContractAddressFromErc20Asset(b.asset);
  if (!erc20) {
    return true;
  }

  return Boolean(
    enabledTokens.find((e) => {
      if (e.type === 'evm-token') {
        return (
          e.chainId === chainId &&
          e.contract.toLowerCase() === erc20.address.toLowerCase() &&
          e.ticker.toUpperCase() === erc20.ticker.toUpperCase()
        );
      }

      return false;
    }),
  );
};
