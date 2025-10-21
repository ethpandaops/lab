import type { ComponentType } from 'react';

export interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export interface NavigationItem {
  name: string;
  to: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}
