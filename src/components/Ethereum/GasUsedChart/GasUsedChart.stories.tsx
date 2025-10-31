import type { Meta, StoryObj } from '@storybook/react-vite';
import { GasUsedChart } from './GasUsedChart';

const meta = {
  title: 'Components/Ethereum/GasUsedChart',
  component: GasUsedChart,
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
} satisfies Meta<typeof GasUsedChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Gas usage per slot with gas limit
 */
export const WithGasLimit: Story = {
  args: {
    data: Array.from({ length: 32 }, (_, i) => ({
      x: 10000000 + i,
      gasUsed: Math.floor(Math.random() * 5000000 + 25000000), // 25-30M gas
      gasLimit: 30000000, // 30M gas limit
    })),
    xAxis: {
      name: 'Slot',
      min: 10000000,
    },
    subtitle: undefined, // Will auto-calculate
  },
};

/**
 * Gas usage per slot without gas limit
 */
export const WithoutGasLimit: Story = {
  args: {
    data: Array.from({ length: 32 }, (_, i) => ({
      x: 10000000 + i,
      gasUsed: Math.floor(Math.random() * 5000000 + 25000000), // 25-30M gas
    })),
    xAxis: {
      name: 'Slot',
      min: 10000000,
    },
    showGasLimit: false,
  },
};

/**
 * Average gas per epoch over time
 */
export const EpochGranularity: Story = {
  args: {
    data: Array.from({ length: 100 }, (_, i) => ({
      x: 300000 + i,
      gasUsed: Math.floor(Math.random() * 200000000 + 900000000), // 900M-1.1B gas per epoch
    })),
    xAxis: {
      name: 'Epoch',
    },
    subtitle: 'Average gas usage per epoch',
  },
};

/**
 * Gas usage with varying utilization
 */
export const VaryingUtilization: Story = {
  args: {
    data: Array.from({ length: 32 }, (_, i) => {
      const gasLimit = 30000000;
      // Simulate varying utilization (50%-100%)
      const utilization = 0.5 + Math.random() * 0.5;
      return {
        x: 10000000 + i,
        gasUsed: Math.floor(gasLimit * utilization),
        gasLimit,
      };
    }),
    xAxis: {
      name: 'Slot',
      min: 10000000,
    },
    title: 'Gas Utilization',
    subtitle: 'Varying block fullness',
  },
};

/**
 * Network congestion - consistently high gas usage
 */
export const HighUtilization: Story = {
  args: {
    data: Array.from({ length: 32 }, (_, i) => {
      const gasLimit = 30000000;
      // 95%-100% utilization (congested)
      const utilization = 0.95 + Math.random() * 0.05;
      return {
        x: 10000000 + i,
        gasUsed: Math.floor(gasLimit * utilization),
        gasLimit,
      };
    }),
    xAxis: {
      name: 'Slot',
      min: 10000000,
    },
    title: 'Network Congestion',
    subtitle: 'Blocks nearly full',
  },
};

/**
 * Low activity - minimal gas usage
 */
export const LowUtilization: Story = {
  args: {
    data: Array.from({ length: 32 }, (_, i) => {
      const gasLimit = 30000000;
      // 10%-30% utilization (quiet)
      const utilization = 0.1 + Math.random() * 0.2;
      return {
        x: 10000000 + i,
        gasUsed: Math.floor(gasLimit * utilization),
        gasLimit,
      };
    }),
    xAxis: {
      name: 'Slot',
      min: 10000000,
    },
    title: 'Low Network Activity',
    subtitle: 'Minimal gas consumption',
  },
};

/**
 * Gas usage over time with date formatting
 */
export const TimestampGranularity: Story = {
  args: {
    data: Array.from({ length: 30 }, (_, i) => ({
      x: Date.now() / 1000 - (30 - i) * 86400, // Last 30 days
      gasUsed: Math.floor(Math.random() * 100000000 + 950000000), // 950M-1.05B daily gas
    })),
    xAxis: {
      name: 'Date',
      formatter: (timestamp: number | string) => {
        const ts = typeof timestamp === 'string' ? parseFloat(timestamp) : timestamp;
        const date = new Date(ts * 1000);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      },
    },
    subtitle: '30-day gas consumption',
  },
};

/**
 * Empty state - no gas data
 */
export const NoData: Story = {
  args: {
    data: [],
    xAxis: {
      name: 'Slot',
    },
    subtitle: 'No gas data available',
  },
};
