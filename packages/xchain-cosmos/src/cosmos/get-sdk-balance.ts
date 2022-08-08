import {cosmosclient, proto, rest} from '@cosmos-client/core';

export const getSdkBalance = async ({
  address,
  server,
  chainId,
  prefix,
}: {
  address: string;
  server: string;
  chainId: string;
  prefix: string;
}): Promise<proto.cosmos.base.v1beta1.Coin[]> => {
  cosmosclient.config.setBech32Prefix({
    accAddr: prefix,
    accPub: prefix + 'pub',
    valAddr: prefix + 'valoper',
    valPub: prefix + 'valoperpub',
    consAddr: prefix + 'valcons',
    consPub: prefix + 'valconspub',
  });

  const accAddress = cosmosclient.AccAddress.fromString(address);
  const sdk = new cosmosclient.CosmosSDK(server, chainId);

  const response = await rest.bank.allBalances(sdk, accAddress);
  return response.data.balances as proto.cosmos.base.v1beta1.Coin[];
};
