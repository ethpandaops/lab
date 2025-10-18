import { FullWidth } from '@/pages/experiments/FullWidth';
import { FullWidthNavbar } from '@/pages/experiments/FullWidthNavbar';
import { NavbarOnly } from '@/pages/experiments/NavbarOnly';
import { SidebarRight } from '@/pages/experiments/SidebarRight';
import { TwoColumnBasic } from '@/pages/experiments/TwoColumnBasic';
import { TwoColumnFullWidth } from '@/pages/experiments/TwoColumnFullWidth';
import { TwoColumnNavbar } from '@/pages/experiments/TwoColumnNavbar';
import { WithSelector } from '@/pages/experiments/WithSelector';
import type { ExperimentConfig } from './-experiments.types';

export const experiments: Record<string, ExperimentConfig> = {
  'hero-demo': {
    id: 'hero-demo',
    title: 'Full Width Layout',
    description: 'Full page - NO navbar, NO network selector',
    color: 'border-pink-500',
    component: FullWidth,
    layout: {
      type: 'none',
      showNavbar: false,
      showNetworkSelector: false,
      fullWidth: true,
    },
  },
  'navbar-only': {
    id: 'navbar-only',
    title: 'Navbar Only',
    description: 'Has navbar but NO network selector',
    color: 'border-slate-500',
    component: NavbarOnly,
    layout: {
      type: 'standard',
      showNavbar: true,
      showNetworkSelector: false,
      fullWidth: false,
    },
  },
  'with-selector': {
    id: 'with-selector',
    title: 'Navbar + Network Selector',
    description: 'Has navbar AND network selector + BlockList',
    color: 'border-green-500',
    component: WithSelector,
    layout: {
      type: 'standard',
      showNavbar: true,
      showNetworkSelector: true,
      fullWidth: false,
    },
  },
  'fullwidth-navbar': {
    id: 'fullwidth-navbar',
    title: 'Full Width + Navbar',
    description: 'Full width layout with navbar',
    color: 'border-blue-500',
    component: FullWidthNavbar,
    layout: {
      type: 'standard',
      showNavbar: true,
      showNetworkSelector: false,
      fullWidth: true,
    },
  },
  'two-column-basic': {
    id: 'two-column-basic',
    title: 'Two Column Basic',
    description: 'Two columns - NO navbar, NO network selector',
    color: 'border-cyan-500',
    component: TwoColumnBasic,
    layout: {
      type: 'sidebar',
      showNavbar: false,
      showNetworkSelector: false,
      fullWidth: false,
      sidebarPosition: 'left',
    },
  },
  'two-column-fullwidth': {
    id: 'two-column-fullwidth',
    title: 'Two Column Full Width',
    description: 'Two columns spanning full viewport width',
    color: 'border-orange-500',
    component: TwoColumnFullWidth,
    layout: {
      type: 'sidebar',
      showNavbar: false,
      showNetworkSelector: false,
      fullWidth: true,
    },
  },
  'two-column-navbar': {
    id: 'two-column-navbar',
    title: 'Two Column + Navbar',
    description: 'Two columns with navbar navigation',
    color: 'border-purple-500',
    component: TwoColumnNavbar,
    layout: {
      type: 'sidebar',
      showNavbar: true,
      showNetworkSelector: false,
      fullWidth: false,
    },
  },
  'sidebar-right': {
    id: 'sidebar-right',
    title: 'Sidebar Right',
    description: 'Two columns with sidebar on the RIGHT side',
    color: 'border-indigo-500',
    component: SidebarRight,
    layout: {
      type: 'sidebar',
      showNavbar: false,
      showNetworkSelector: false,
      fullWidth: false,
      sidebarPosition: 'right',
    },
  },
};

export function getExperiment(id: string): ExperimentConfig | undefined {
  return experiments[id];
}

export function getAllExperiments(): ExperimentConfig[] {
  return Object.values(experiments);
}
