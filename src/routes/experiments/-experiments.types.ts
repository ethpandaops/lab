import { type ComponentType } from 'react';

export interface ExperimentConfig {
  id: string;
  title: string;
  description: string;
  color: string;
  component: ComponentType;
  layout: {
    type: 'standard' | 'sidebar' | 'none';
    showNavbar: boolean;
    showNetworkSelector: boolean;
    fullWidth?: boolean;
    sidebarPosition?: 'left' | 'right';
  };
}
