import type { ComponentType, SVGProps } from 'react';
import {
  ArchiveBoxXMarkIcon,
  CubeIcon,
  DocumentTextIcon,
  FireIcon,
  PlayCircleIcon,
  PresentationChartLineIcon,
  Square3Stack3DIcon,
  UserGroupIcon,
  ClockIcon,
  CpuChipIcon,
  MapIcon,
  WrenchScrewdriverIcon,
  ServerStackIcon,
  SignalIcon,
  CircleStackIcon,
  MagnifyingGlassIcon,
  PuzzlePieceIcon,
} from '@heroicons/react/24/outline';

export interface NavItem {
  name: string;
  to: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}

export const ethereumConsensusPages: NavItem[] = [
  { name: 'Overview', to: '/ethereum/consensus/overview', icon: PresentationChartLineIcon },
  { name: 'Live', to: '/ethereum/live', icon: PlayCircleIcon },
  { name: 'Epochs', to: '/ethereum/epochs', icon: ClockIcon },
  { name: 'Slots', to: '/ethereum/slots', icon: Square3Stack3DIcon },
  { name: 'Entities', to: '/ethereum/entities', icon: UserGroupIcon },
  { name: 'Clients', to: '/ethereum/clients', icon: CpuChipIcon },
  { name: 'Forks', to: '/ethereum/forks', icon: SignalIcon },
];

export const ethereumDataAvailabilityPages: NavItem[] = [
  { name: 'Custody', to: '/ethereum/data-availability/custody', icon: CircleStackIcon },
  { name: 'Probes', to: '/ethereum/data-availability/probes', icon: MagnifyingGlassIcon },
  { name: 'Partial Columns', to: '/ethereum/data-availability/partial-columns', icon: PuzzlePieceIcon },
];

export const ethereumExecutionPages: NavItem[] = [
  { name: 'Overview', to: '/ethereum/execution/overview', icon: PresentationChartLineIcon },
  { name: 'Timings', to: '/ethereum/execution/timings', icon: ClockIcon },
  { name: 'Payloads', to: '/ethereum/execution/payloads', icon: CubeIcon },
  { name: 'Gas Profiler', to: '/ethereum/execution/gas-profiler', icon: FireIcon },
  { name: 'State Growth', to: '/ethereum/execution/state-growth', icon: ServerStackIcon },
  { name: 'State Expiry', to: '/ethereum/execution/state-expiry', icon: ArchiveBoxXMarkIcon },
  { name: 'Contracts', to: '/ethereum/contracts', icon: DocumentTextIcon },
];

export const xatuPages: NavItem[] = [
  { name: 'Contributors', to: '/xatu/contributors', icon: UserGroupIcon },
  { name: 'Geo Checklist', to: '/xatu/geographical-checklist', icon: MapIcon },
  { name: 'Local Blocks', to: '/xatu/locally-built-blocks', icon: CubeIcon },
  { name: 'Fork Readiness', to: '/xatu/fork-readiness', icon: WrenchScrewdriverIcon },
];

/**
 * Helper function to check if a page is enabled for the current network.
 */
export function isPageEnabled(
  path: string,
  features: Array<{ path: string; disabled_networks?: string[] }> | undefined,
  networkName: string | undefined
): boolean {
  if (!features || !networkName) return true;
  const feature = features.find(f => f.path === path);
  if (!feature) return true;
  if (feature.disabled_networks?.includes(networkName)) return false;
  return true;
}

/** Top-level navigation sections, in display order */
export const NAV_SECTIONS: { name: string; pages: NavItem[] }[] = [
  { name: 'Consensus', pages: ethereumConsensusPages },
  { name: 'Data availability', pages: ethereumDataAvailabilityPages },
  { name: 'Execution', pages: ethereumExecutionPages },
  { name: 'Xatu', pages: xatuPages },
];
