import type { Meta, StoryObj } from '@storybook/react-vite';
import { BaseFeeChart } from './BaseFeeChart';

const meta = {
  title: 'Components/Ethereum/BaseFeeChart',
  component: BaseFeeChart,
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
} satisfies Meta<typeof BaseFeeChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Base fee per slot over a single epoch (32 slots)
 */
export const SlotGranularity: Story = {
  args: {
    data: Array.from({ length: 32 }, (_, i) => ({
      x: 10000000 + i,
      value: Number((Math.random() * 10 + 15).toFixed(2)), // 15-25 Gwei
    })),
    xAxis: {
      name: 'Slot',
      min: 10000000,
    },
    subtitle: undefined, // Will auto-calculate average
  },
};

/**
 * Average base fee per epoch over time
 */
export const EpochGranularity: Story = {
  args: {
    data: Array.from({ length: 100 }, (_, i) => ({
      x: 300000 + i,
      value: Number((Math.random() * 20 + 10).toFixed(2)), // 10-30 Gwei
    })),
    xAxis: {
      name: 'Epoch',
    },
    subtitle: undefined, // Will auto-calculate average
  },
};

/**
 * Base fee per block with block number x-axis
 */
export const BlockGranularity: Story = {
  args: {
    data: Array.from({ length: 100 }, (_, i) => ({
      x: 20000000 + i,
      value: Number((Math.random() * 15 + 12).toFixed(2)), // 12-27 Gwei
    })),
    xAxis: {
      name: 'Block Number',
    },
    subtitle: 'Base fee per execution layer block',
  },
};

/**
 * Average base fee per day with date formatting
 */
export const TimestampGranularity: Story = {
  args: {
    data: Array.from({ length: 30 }, (_, i) => ({
      x: Date.now() / 1000 - (30 - i) * 86400, // Last 30 days
      value: Number((Math.random() * 30 + 10).toFixed(2)), // 10-40 Gwei
    })),
    xAxis: {
      name: 'Date',
      formatter: (timestamp: number | string) => {
        const ts = typeof timestamp === 'string' ? parseFloat(timestamp) : timestamp;
        const date = new Date(ts * 1000);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      },
    },
    subtitle: '30-day average base fee',
  },
};

/**
 * High gas prices - network congestion
 */
export const HighFees: Story = {
  args: {
    data: Array.from({ length: 32 }, (_, i) => ({
      x: 10000000 + i,
      value: Number((Math.random() * 50 + 100).toFixed(2)), // 100-150 Gwei (high!)
    })),
    xAxis: {
      name: 'Slot',
      min: 10000000,
    },
    title: 'Network Congestion',
    subtitle: 'High base fee period',
  },
};

/**
 * Low gas prices - minimal activity
 */
export const LowFees: Story = {
  args: {
    data: Array.from({ length: 32 }, (_, i) => ({
      x: 10000000 + i,
      value: Number((Math.random() * 2 + 1).toFixed(2)), // 1-3 Gwei (low)
    })),
    xAxis: {
      name: 'Slot',
      min: 10000000,
    },
    title: 'Low Network Activity',
    subtitle: 'Minimal base fee',
  },
};

/**
 * Volatile base fee - rapid changes
 */
export const VolatileFees: Story = {
  args: {
    data: Array.from({ length: 32 }, (_, i) => {
      // Simulate volatility with sudden spikes
      const isSpike = i % 8 === 0;
      return {
        x: 10000000 + i,
        value: Number((isSpike ? Math.random() * 50 + 50 : Math.random() * 10 + 10).toFixed(2)),
      };
    }),
    xAxis: {
      name: 'Slot',
      min: 10000000,
    },
    title: 'Volatile Base Fee',
    subtitle: 'Rapid price changes',
  },
};

/**
 * Empty state - no base fee data
 */
export const NoData: Story = {
  args: {
    data: [],
    xAxis: {
      name: 'Slot',
    },
    subtitle: 'No base fee data available',
  },
};
