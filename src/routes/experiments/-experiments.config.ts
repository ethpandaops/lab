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
    description: 'Full page - NO header, NO network selector',
    color: 'border-pink-500',
    component: FullWidth,
    layout: {
      type: 'none',
      showHeader: false,
      showNetworkSelector: false,
      fullWidth: true,
    },
  },
  'navbar-only': {
    id: 'navbar-only',
    title: 'Header Only',
    description: 'Has header but NO network selector',
    color: 'border-slate-500',
    component: NavbarOnly,
    layout: {
      type: 'standard',
      showHeader: true,
      showNetworkSelector: false,
      fullWidth: false,
    },
  },
  'with-selector': {
    id: 'with-selector',
    title: 'Header + Network Selector',
    description: 'Has header AND network selector + BlockList',
    color: 'border-green-500',
    component: WithSelector,
    layout: {
      type: 'standard',
      showHeader: true,
      showNetworkSelector: true,
      fullWidth: false,
    },
  },
  'fullwidth-navbar': {
    id: 'fullwidth-navbar',
    title: 'Full Width + Header',
    description: 'Full width layout with header',
    color: 'border-blue-500',
    component: FullWidthNavbar,
    layout: {
      type: 'standard',
      showHeader: true,
      showNetworkSelector: false,
      fullWidth: true,
    },
  },
  'two-column-basic': {
    id: 'two-column-basic',
    title: 'Two Column Basic',
    description: 'Two columns - NO header, NO network selector',
    color: 'border-cyan-500',
    component: TwoColumnBasic,
    layout: {
      type: 'sidebar',
      showHeader: false,
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
      showHeader: false,
      showNetworkSelector: false,
      fullWidth: true,
    },
  },
  'two-column-navbar': {
    id: 'two-column-navbar',
    title: 'Two Column + Header',
    description: 'Two columns with header navigation',
    color: 'border-purple-500',
    component: TwoColumnNavbar,
    layout: {
      type: 'sidebar',
      showHeader: true,
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
      showHeader: false,
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
