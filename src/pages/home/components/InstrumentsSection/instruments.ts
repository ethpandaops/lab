import {
  PlayCircleIcon,
  ClockIcon,
  Square3Stack3DIcon,
  UserGroupIcon,
  SignalIcon,
  CircleStackIcon,
  MagnifyingGlassIcon,
  PresentationChartLineIcon,
  CubeIcon,
  ServerStackIcon,
  ArchiveBoxXMarkIcon,
  DocumentTextIcon,
  MapIcon,
  WrenchScrewdriverIcon,
} from '@heroicons/react/24/outline';
import { type InstrumentSection } from './types';

export const instrumentSections: InstrumentSection[] = [
  {
    label: 'Consensus',
    instruments: [
      {
        name: 'Live',
        description: 'Visualize beacon chain slots and block proposals as they happen across the network.',
        to: '/ethereum/live',
        icon: PlayCircleIcon,
        size: 'featured',
      },
      {
        name: 'Epochs',
        description: 'Epoch-level summaries and participation rates.',
        to: '/ethereum/epochs',
        icon: ClockIcon,
        size: 'standard',
      },
      {
        name: 'Slots',
        description: 'Per-slot breakdowns, proposers, and timing data.',
        to: '/ethereum/slots',
        icon: Square3Stack3DIcon,
        size: 'standard',
      },
      {
        name: 'Entities',
        description: 'Validator entities and their network footprint.',
        to: '/ethereum/entities',
        icon: UserGroupIcon,
        size: 'standard',
      },
      {
        name: 'Forks',
        description: 'Fork tracking and chain reorganizations.',
        to: '/ethereum/forks',
        icon: SignalIcon,
        size: 'standard',
      },
    ],
  },
  {
    label: 'Execution',
    instruments: [
      {
        name: 'Overview',
        description: 'High-level execution layer metrics including gas usage and block utilization.',
        to: '/ethereum/execution/overview',
        icon: PresentationChartLineIcon,
        size: 'medium',
      },
      {
        name: 'Timings',
        description: 'Execution timing breakdowns.',
        to: '/ethereum/execution/timings',
        icon: ClockIcon,
        size: 'standard',
      },
      {
        name: 'Payloads',
        description: 'Payload construction and delivery analysis.',
        to: '/ethereum/execution/payloads',
        icon: CubeIcon,
        size: 'standard',
      },
      {
        name: 'State Growth',
        description: 'Track the growth of Ethereum state over time.',
        to: '/ethereum/execution/state-growth',
        icon: ServerStackIcon,
        size: 'standard',
      },
      {
        name: 'State Expiry',
        description: 'State expiry simulation and analysis.',
        to: '/ethereum/execution/state-expiry',
        icon: ArchiveBoxXMarkIcon,
        size: 'standard',
      },
      {
        name: 'Contracts',
        description: 'Contract deployment and interaction data.',
        to: '/ethereum/contracts',
        icon: DocumentTextIcon,
        size: 'standard',
      },
    ],
  },
  {
    label: 'Data Availability',
    instruments: [
      {
        name: 'Custody',
        description: 'Blob custody distribution and data availability sampling metrics.',
        to: '/ethereum/data-availability/custody',
        icon: CircleStackIcon,
        size: 'medium',
      },
      {
        name: 'Probes',
        description: 'DAS probe results and network-wide availability monitoring.',
        to: '/ethereum/data-availability/probes',
        icon: MagnifyingGlassIcon,
        size: 'medium',
      },
    ],
  },
  {
    label: 'Xatu',
    instruments: [
      {
        name: 'Contributors',
        description: 'Explore the community of Xatu contributors and their data collection footprint.',
        to: '/xatu/contributors',
        icon: UserGroupIcon,
        size: 'featured',
      },
      {
        name: 'Geo Checklist',
        description: 'Geographic distribution of monitoring coverage.',
        to: '/xatu/geographical-checklist',
        icon: MapIcon,
        size: 'standard',
      },
      {
        name: 'Local Blocks',
        description: 'Locally built block analysis.',
        to: '/xatu/locally-built-blocks',
        icon: CubeIcon,
        size: 'standard',
      },
      {
        name: 'Fork Readiness',
        description: 'Network-wide client readiness tracking for upcoming forks.',
        to: '/xatu/fork-readiness',
        icon: WrenchScrewdriverIcon,
        size: 'medium',
      },
    ],
  },
];
