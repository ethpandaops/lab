import { ReactNode } from 'react';

import NetworkProvider, { Props as NetworkProps } from '@/providers/network';
import ConfigProvider, { Props as ConfigProps } from '@/providers/config';
import ApiProvider, { Props as ApiProps } from '@/providers/api';

interface Props {
  children: ReactNode;
  network: Omit<NetworkProps, 'children'>;
  config: Omit<ConfigProps, 'children'>;
  api: Omit<ApiProps, 'children'>;
}

function Provider({ children, network, config, api }: Props) {
  return (
    <NetworkProvider {...network}>
      <ConfigProvider {...config}>
        <ApiProvider {...api}>{children}</ApiProvider>
      </ConfigProvider>
    </NetworkProvider>
  );
}

export default Provider;
