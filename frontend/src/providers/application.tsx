import { ReactNode } from 'react';

import ApiProvider, { Props as ApiProps } from '@/providers/api';
import BeaconProvider, { Props as BeaconProps } from '@/providers/beacon';

interface Props {
  children: ReactNode;
  api: Omit<ApiProps, 'children'>;
  beacon: Omit<BeaconProps, 'children'>;
}

function Provider({ children, api, beacon }: Props) {
  return (
    <ApiProvider {...api}>
      <BeaconProvider {...beacon}>{children}</BeaconProvider>
    </ApiProvider>
  );
}

export default Provider;
