import { ReactNode } from 'react';

import NetworkProvider, { Props as NetworkProps } from '@/providers/network';
import ConfigProvider, { Props as ConfigProps } from '@/providers/config';
import ApiProvider, { Props as ApiProps } from '@/providers/api';
import BeaconProvider, { Props as BeaconProps } from '@/providers/beacon';

interface Props {
  children: ReactNode;
  network: Omit<NetworkProps, 'children'>;
  config: Omit<ConfigProps, 'children'>;
  api: Omit<ApiProps, 'children'>;
  beacon: Omit<BeaconProps, 'children'>;
}

function Provider({ children, network, config, api, beacon }: Props) {
  return (
    <NetworkProvider {...network}>
      <ConfigProvider {...config}>
        <ApiProvider {...api}>
          <BeaconProvider {...beacon}>{children}</BeaconProvider>
        </ApiProvider>
      </ConfigProvider>
    </NetworkProvider>
  );
}

export default Provider;
