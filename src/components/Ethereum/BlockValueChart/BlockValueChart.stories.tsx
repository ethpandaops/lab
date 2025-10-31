import type { Meta, StoryObj } from '@storybook/react-vite';

import { BlockValueChart } from './BlockValueChart';

const meta = {
  title: 'Components/Ethereum/BlockValueChart',
  component: BlockValueChart,
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
} satisfies Meta<typeof BlockValueChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Block value per slot over a single epoch (32 slots)
 * Shows typical MEV block values with some slots having no MEV
 */
export const SlotGranularity: Story = {
  args: {
    data: Array.from({ length: 32 }, (_, i) => ({
      x: 10000000 + i,
      // ~30% MEV slots with values between 0.01-0.5 ETH
      value: Math.random() > 0.7 ? Math.random() * 0.49 + 0.01 : 0,
    })),
    xAxis: {
      name: 'Slot',
      min: 10000000,
    },
    subtitle: undefined, // Will auto-calculate average and total
  },
};

/**
 * Total MEV value per epoch over multiple epochs
 */
export const EpochGranularity: Story = {
  args: {
    data: Array.from({ length: 100 }, (_, i) => ({
      x: 300000 + i,
      // Average ~2-8 ETH total MEV per epoch
      value: Math.random() * 6 + 2,
    })),
    xAxis: {
      name: 'Epoch',
    },
    subtitle: undefined, // Will auto-calculate average and total
  },
};

/**
 * Block value per execution layer block
 */
export const BlockGranularity: Story = {
  args: {
    data: Array.from({ length: 100 }, (_, i) => ({
      x: 20000000 + i,
      // ~40% MEV blocks with values between 0.01-0.8 ETH
      value: Math.random() > 0.6 ? Math.random() * 0.79 + 0.01 : 0,
    })),
    xAxis: {
      name: 'Block Number',
    },
    subtitle: 'MEV block value per execution layer block',
  },
};

/**
 * Average daily MEV value with date formatting
 */
export const TimestampGranularity: Story = {
  args: {
    data: Array.from({ length: 30 }, (_, i) => ({
      x: Date.now() / 1000 - (30 - i) * 86400, // Last 30 days
      // Daily MEV total: 50-200 ETH
      value: Math.random() * 150 + 50,
    })),
    xAxis: {
      name: 'Date',
      formatter: (timestamp: number | string) => {
        const ts = typeof timestamp === 'string' ? parseFloat(timestamp) : timestamp;
        const date = new Date(ts * 1000);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      },
    },
    subtitle: '30-day MEV value trends',
  },
};

/**
 * High MEV period - builder competition
 */
export const HighMEVPeriod: Story = {
  args: {
    data: Array.from({ length: 32 }, (_, i) => ({
      x: 10000000 + i,
      // 60% MEV slots with higher values (0.1-1.5 ETH)
      value: Math.random() > 0.4 ? Math.random() * 1.4 + 0.1 : 0,
    })),
    xAxis: {
      name: 'Slot',
      min: 10000000,
    },
    title: 'High MEV Activity',
    subtitle: 'Increased builder competition and block values',
  },
};

/**
 * Low MEV period - minimal builder activity
 */
export const LowMEVPeriod: Story = {
  args: {
    data: Array.from({ length: 32 }, (_, i) => ({
      x: 10000000 + i,
      // 15% MEV slots with lower values (0.001-0.05 ETH)
      value: Math.random() > 0.85 ? Math.random() * 0.049 + 0.001 : 0,
    })),
    xAxis: {
      name: 'Slot',
      min: 10000000,
    },
    title: 'Low MEV Activity',
    subtitle: 'Minimal builder participation',
  },
};

/**
 * Major MEV opportunity - sandwich attack or liquidation
 */
export const MajorMEVOpportunity: Story = {
  args: {
    data: Array.from({ length: 32 }, (_, i) => {
      // Slot 15 has a major MEV opportunity (5+ ETH)
      if (i === 15) return { x: 10000000 + i, value: Math.random() * 3 + 5 };
      // Other slots have normal MEV activity
      return {
        x: 10000000 + i,
        value: Math.random() > 0.7 ? Math.random() * 0.3 + 0.01 : 0,
      };
    }),
    xAxis: {
      name: 'Slot',
      min: 10000000,
    },
    title: 'Major MEV Event',
    subtitle: 'Large opportunity captured (liquidation or sandwich)',
  },
};

/**
 * Empty state - no MEV data
 */
export const NoData: Story = {
  args: {
    data: [],
    xAxis: {
      name: 'Slot',
    },
    subtitle: 'No MEV block data available',
  },
};

/**
 * All zero values - no MEV activity
 */
export const NoMEVActivity: Story = {
  args: {
    data: Array.from({ length: 32 }, (_, i) => ({
      x: 10000000 + i,
      value: 0,
    })),
    xAxis: {
      name: 'Slot',
      min: 10000000,
    },
    title: 'No MEV Period',
    subtitle: 'All blocks proposed locally (no MEV-Boost)',
  },
};
