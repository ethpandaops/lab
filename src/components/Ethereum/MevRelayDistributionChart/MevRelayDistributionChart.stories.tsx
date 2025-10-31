import type { Meta, StoryObj } from '@storybook/react-vite';
import { MevRelayDistributionChart } from './MevRelayDistributionChart';

const meta = {
  title: 'Components/Ethereum/MevRelayDistributionChart',
  component: MevRelayDistributionChart,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MevRelayDistributionChart>;

export default meta;
type Story = StoryObj<typeof meta>;

// Common relay names for realistic data
const RELAY_NAMES = [
  'Flashbots',
  'BloXroute Max Profit',
  'BloXroute Ethical',
  'BloXroute Regulated',
  'Ultrasound',
  'Aestus',
  'Agnostic Gnosis',
  'bloXroute',
  'Eden Network',
  'Manifold',
  'SecureRpc',
  'Titan',
];

/**
 * Default story showing relay distribution for a single epoch (32 slots)
 */
export const Default: Story = {
  args: {
    data: [
      ...Array.from({ length: 18 }, () => ({ relay: 'Flashbots' })),
      ...Array.from({ length: 8 }, () => ({ relay: 'BloXroute Max Profit' })),
      ...Array.from({ length: 3 }, () => ({ relay: 'Ultrasound' })),
      ...Array.from({ length: 2 }, () => ({ relay: 'Aestus' })),
      ...Array.from({ length: 1 }, () => ({ relay: 'Agnostic Gnosis' })),
    ],
    countAxisName: 'Blocks',
    subtitle: 'Top relays by block count in epoch',
  },
};

/**
 * Distribution with many relays - shows top 10 by default
 */
export const ManyRelays: Story = {
  args: {
    data: RELAY_NAMES.flatMap(relay => Array.from({ length: Math.floor(Math.random() * 20) + 1 }, () => ({ relay }))),
    countAxisName: 'Blocks',
    subtitle: 'Diverse relay ecosystem',
  },
};

/**
 * Custom topN - show only top 5 relays
 */
export const TopFive: Story = {
  args: {
    data: RELAY_NAMES.flatMap(relay => Array.from({ length: Math.floor(Math.random() * 15) + 1 }, () => ({ relay }))),
    topN: 5,
    countAxisName: 'Blocks',
    title: 'Top 5 Relays',
    subtitle: 'Leading relays by volume',
  },
};

/**
 * Highly concentrated - one dominant relay
 */
export const DominantRelay: Story = {
  args: {
    data: [
      ...Array.from({ length: 28 }, () => ({ relay: 'Flashbots' })),
      ...Array.from({ length: 2 }, () => ({ relay: 'BloXroute Max Profit' })),
      ...Array.from({ length: 1 }, () => ({ relay: 'Ultrasound' })),
      ...Array.from({ length: 1 }, () => ({ relay: 'Aestus' })),
    ],
    countAxisName: 'Blocks',
    title: 'Centralized Distribution',
    subtitle: '87.5% market share by single relay',
  },
};

/**
 * Balanced distribution - multiple competitive relays
 */
export const BalancedDistribution: Story = {
  args: {
    data: [
      ...Array.from({ length: 8 }, () => ({ relay: 'Flashbots' })),
      ...Array.from({ length: 7 }, () => ({ relay: 'BloXroute Max Profit' })),
      ...Array.from({ length: 6 }, () => ({ relay: 'Ultrasound' })),
      ...Array.from({ length: 6 }, () => ({ relay: 'Aestus' })),
      ...Array.from({ length: 5 }, () => ({ relay: 'Agnostic Gnosis' })),
    ],
    countAxisName: 'Blocks',
    title: 'Healthy Competition',
    subtitle: 'Well-distributed relay usage',
  },
};

/**
 * Custom axis name - using "Proposals" instead of "Blocks"
 */
export const ProposalsAxisName: Story = {
  args: {
    data: [
      ...Array.from({ length: 15 }, () => ({ relay: 'Flashbots' })),
      ...Array.from({ length: 10 }, () => ({ relay: 'BloXroute Max Profit' })),
      ...Array.from({ length: 8 }, () => ({ relay: 'Ultrasound' })),
      ...Array.from({ length: 5 }, () => ({ relay: 'Aestus' })),
    ],
    countAxisName: 'Proposals',
    subtitle: 'Relay usage by validator proposals',
  },
};

/**
 * Custom axis name - using "Slots" for granularity
 */
export const SlotsAxisName: Story = {
  args: {
    data: [
      ...Array.from({ length: 20 }, () => ({ relay: 'Flashbots' })),
      ...Array.from({ length: 12 }, () => ({ relay: 'BloXroute Max Profit' })),
      ...Array.from({ length: 6 }, () => ({ relay: 'Ultrasound' })),
    ],
    countAxisName: 'Slots',
    subtitle: 'Relay usage per slot',
  },
};

/**
 * Data with null relays - demonstrates filtering
 */
export const WithNullRelays: Story = {
  args: {
    data: [
      ...Array.from({ length: 12 }, () => ({ relay: 'Flashbots' })),
      ...Array.from({ length: 8 }, () => ({ relay: 'BloXroute Max Profit' })),
      ...Array.from({ length: 5 }, () => ({ relay: null })), // Non-MEV blocks
      ...Array.from({ length: 4 }, () => ({ relay: 'Ultrasound' })),
      ...Array.from({ length: 3 }, () => ({ relay: null })), // Non-MEV blocks
    ],
    countAxisName: 'Blocks',
    subtitle: 'Only MEV blocks counted (null relays filtered)',
  },
};

/**
 * Single relay - edge case
 */
export const SingleRelay: Story = {
  args: {
    data: Array.from({ length: 32 }, () => ({ relay: 'Flashbots' })),
    countAxisName: 'Blocks',
    subtitle: '100% single relay usage',
  },
};

/**
 * Two relays only
 */
export const TwoRelays: Story = {
  args: {
    data: [
      ...Array.from({ length: 20 }, () => ({ relay: 'Flashbots' })),
      ...Array.from({ length: 12 }, () => ({ relay: 'BloXroute Max Profit' })),
    ],
    countAxisName: 'Blocks',
    subtitle: 'Duopoly scenario',
  },
};

/**
 * Large dataset - multiple epochs aggregated
 */
export const LargeDataset: Story = {
  args: {
    data: RELAY_NAMES.flatMap(relay => Array.from({ length: Math.floor(Math.random() * 100) + 50 }, () => ({ relay }))),
    topN: 10,
    countAxisName: 'Blocks',
    title: 'Multi-Epoch Analysis',
    subtitle: 'Aggregated relay distribution across 100 epochs',
  },
};

/**
 * Empty state - no data
 */
export const NoData: Story = {
  args: {
    data: [],
    countAxisName: 'Blocks',
    subtitle: 'No relay data available',
  },
};

/**
 * Only null relays - no MEV blocks
 */
export const OnlyNullRelays: Story = {
  args: {
    data: Array.from({ length: 32 }, () => ({ relay: null })),
    countAxisName: 'Blocks',
    title: 'No MEV Activity',
    subtitle: 'All blocks produced without MEV relays',
  },
};

/**
 * Custom title and subtitle
 */
export const CustomTitleSubtitle: Story = {
  args: {
    data: [
      ...Array.from({ length: 15 }, () => ({ relay: 'Flashbots' })),
      ...Array.from({ length: 10 }, () => ({ relay: 'BloXroute Max Profit' })),
      ...Array.from({ length: 7 }, () => ({ relay: 'Ultrasound' })),
    ],
    title: 'MEV Relay Market Share',
    subtitle: 'Analysis of relay preferences by block builders',
    countAxisName: 'Blocks',
  },
};
