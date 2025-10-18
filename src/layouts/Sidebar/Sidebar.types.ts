import { type ReactNode } from 'react';

export interface SidebarProps {
  children: ReactNode;
  showHeader?: boolean;
  showNetworkSelector?: boolean;
  fullWidth?: boolean;
  sidebarPosition?: 'left' | 'right';
}

export interface SidebarSlotProps {
  children: ReactNode;
}
