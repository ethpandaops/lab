import { type ReactNode } from 'react';

export interface SidebarProps {
  children: ReactNode;
  showHeader?: boolean;
  showNetworkSelector?: boolean;
  showNetworkSummary?: boolean;
  showBreadcrumbs?: boolean;
  showNavLinks?: boolean;
  fullWidth?: boolean;
  sidebarPosition?: 'left' | 'right';
}

export interface SidebarSlotProps {
  children: ReactNode;
}
