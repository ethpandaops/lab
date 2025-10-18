import { type ReactNode } from 'react';

export interface StandardProps {
  children: ReactNode;
  showNavbar?: boolean;
  showNetworkSelector?: boolean;
  fullWidth?: boolean;
}
