import { ReactNode } from 'react';

import { Context, useValue, ValueProps } from '@/contexts/config';

export interface Props extends ValueProps {
  children: ReactNode;
}

export default function Provider({ children, ...valueProps }: Props) {
  const value = useValue(valueProps);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
