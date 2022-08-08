import {Asset} from '@xchainjs/xchain-util/lib';
import {getBlockchainExplorerLink} from '../../ethereum/interface/get-blockchain-explorer-link';
export const etherscanExplorerUrls = {
  testnet: 'https://ropsten.etherscan.io',
  mainnet: 'https://etherscan.io',
  stagenet: 'https://etherscan.io',
};

export const getExplorerTxUrl = ({
  asset,
  txID,
}: {
  asset: Asset;
  txID: string;
}): string => {
  return getBlockchainExplorerLink({asset, tx: txID}).url;
};
