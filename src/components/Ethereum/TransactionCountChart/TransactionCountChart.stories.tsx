import type { Meta, StoryObj } from '@storybook/react-vite';
import { TransactionCountChart } from './TransactionCountChart';

const meta = {
  title: 'Components/Ethereum/TransactionCountChart',
  component: TransactionCountChart,
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
} satisfies Meta<typeof TransactionCountChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Transaction count per slot over a single epoch (32 slots)
 */
export const SlotGranularity: Story = {
  args: {
    data: Array.from({ length: 32 }, (_, i) => ({
      x: 10000000 + i,
      value: Math.floor(Math.random() * 100 + 50), // 50-150 transactions per slot
    })),
    xAxis: {
      name: 'Slot',
      min: 10000000,
    },
    subtitle: undefined, // Will auto-calculate average
  },
};

/**
 * Total transactions per epoch over multiple epochs
 */
export const EpochGranularity: Story = {
  args: {
    data: Array.from({ length: 100 }, (_, i) => ({
      x: 300000 + i,
      value: Math.floor(Math.random() * 2000 + 3000), // 3000-5000 transactions per epoch
    })),
    xAxis: {
      name: 'Epoch',
    },
    subtitle: undefined, // Will auto-calculate average
  },
};

/**
 * Transactions per block with block number x-axis
 */
export const BlockGranularity: Story = {
  args: {
    data: Array.from({ length: 100 }, (_, i) => ({
      x: 20000000 + i,
      value: Math.floor(Math.random() * 150 + 50), // 50-200 transactions per block
    })),
    xAxis: {
      name: 'Block Number',
    },
    subtitle: 'Transactions per execution layer block',
  },
};

/**
 * Average transactions per day over time with date formatting
 */
export const TimestampGranularity: Story = {
  args: {
    data: Array.from({ length: 30 }, (_, i) => ({
      x: Date.now() / 1000 - (30 - i) * 86400, // Last 30 days
      value: Math.floor(Math.random() * 50000 + 900000), // 900k-950k daily transactions
    })),
    xAxis: {
      name: 'Date',
      formatter: (timestamp: number | string) => {
        const ts = typeof timestamp === 'string' ? parseFloat(timestamp) : timestamp;
        const date = new Date(ts * 1000);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      },
    },
    subtitle: '30-day average transaction volume',
  },
};

/**
 * Network congestion - high transaction counts
 */
export const HighActivity: Story = {
  args: {
    data: Array.from({ length: 32 }, (_, i) => ({
      x: 10000000 + i,
      value: Math.floor(Math.random() * 50 + 150), // 150-200 transactions (congested)
    })),
    xAxis: {
      name: 'Slot',
      min: 10000000,
    },
    title: 'Network Congestion Period',
    subtitle: 'High transaction volume',
  },
};

/**
 * Low activity period - fewer transactions
 */
export const LowActivity: Story = {
  args: {
    data: Array.from({ length: 32 }, (_, i) => ({
      x: 10000000 + i,
      value: Math.floor(Math.random() * 30 + 10), // 10-40 transactions (quiet)
    })),
    xAxis: {
      name: 'Slot',
      min: 10000000,
    },
    title: 'Low Activity Period',
    subtitle: 'Minimal transaction volume',
  },
};

/**
 * Empty state - no transaction data
 */
export const NoData: Story = {
  args: {
    data: [],
    xAxis: {
      name: 'Slot',
    },
    subtitle: 'No transaction data available',
  },
};
