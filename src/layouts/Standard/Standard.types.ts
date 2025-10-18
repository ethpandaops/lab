import { type ReactNode } from 'react';

export interface StandardProps {
  children: ReactNode;
  showHeader?: boolean;
  showNetworkSelector?: boolean;
  fullWidth?: boolean;
}
