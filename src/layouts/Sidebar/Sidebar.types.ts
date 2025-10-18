import { type ReactNode } from 'react';

export interface SidebarProps {
  children: ReactNode;
  showNavbar?: boolean;
  showNetworkSelector?: boolean;
  fullWidth?: boolean;
  sidebarPosition?: 'left' | 'right';
}
