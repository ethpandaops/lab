import { type ComponentType } from 'react';
import { HeroDemo } from '@/pages/experiments/HeroDemo';
import { NavbarOnly } from '@/pages/experiments/NavbarOnly';
import { WithSelector } from '@/pages/experiments/WithSelector';

export interface ExperimentConfig {
  id: string;
  title: string;
  description: string;
  color: string;
  component: ComponentType;
  layout: {
    showNavbar: boolean;
    showNetworkSelector: boolean;
  };
}

export const experiments: Record<string, ExperimentConfig> = {
  'hero-demo': {
    id: 'hero-demo',
    title: 'Hero Layout',
    description: 'Full page hero - NO navbar, NO network selector',
    color: 'border-pink-500',
    component: HeroDemo,
    layout: {
      showNavbar: false,
      showNetworkSelector: false,
    },
  },
  'navbar-only': {
    id: 'navbar-only',
    title: 'Navbar Only',
    description: 'Has navbar but NO network selector',
    color: 'border-slate-500',
    component: NavbarOnly,
    layout: {
      showNavbar: true,
      showNetworkSelector: false,
    },
  },
  'with-selector': {
    id: 'with-selector',
    title: 'Navbar + Network Selector',
    description: 'Has navbar AND network selector + BlockList',
    color: 'border-green-500',
    component: WithSelector,
    layout: {
      showNavbar: true,
      showNetworkSelector: true,
    },
  },
};

export function getExperiment(id: string): ExperimentConfig | undefined {
  return experiments[id];
}

export function getAllExperiments(): ExperimentConfig[] {
  return Object.values(experiments);
}
