import {Network} from '../../xchain-client/src';

/**
 * Get Dogecoin suggested transaction fee.
 *
 * @returns {number} The Dogecoin suggested transaction fee per bytes in sat.
 */

export const getSendTxUrl = ({
  blockcypherUrl,
  network,
}: {
  blockcypherUrl: string;
  network: Network;
}) => {
  if (network === Network.Testnet) {
    throw new Error('Testnet URL is not available for blockcypher');
  }

  return `${blockcypherUrl}/doge/main/txs/push`;
};
