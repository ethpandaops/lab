import { type ReactNode } from 'react';

export interface StandardProps {
  children: ReactNode;
  showHeader?: boolean;
  showNetworkSelector?: boolean;
  showNetworkSummary?: boolean;
  showBreadcrumbs?: boolean;
  showNavLinks?: boolean;
  fullWidth?: boolean;
}
