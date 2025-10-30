import type { Meta, StoryObj } from '@storybook/react-vite';
import { BlobCountChart } from './BlobCountChart';

const meta = {
  title: 'Components/Ethereum/BlobCountChart',
  component: BlobCountChart,
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
} satisfies Meta<typeof BlobCountChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Blob count per slot over a single epoch (32 slots)
 */
export const SlotGranularity: Story = {
  args: {
    data: Array.from({ length: 32 }, (_, i) => ({
      x: 10000000 + i,
      value: Math.floor(Math.random() * 7), // 0-6 blobs per slot
    })),
    xAxis: {
      name: 'Slot',
      min: 10000000,
    },
    subtitle: undefined, // Will auto-calculate total
  },
};

/**
 * Total blobs per epoch over multiple epochs
 */
export const EpochGranularity: Story = {
  args: {
    data: Array.from({ length: 100 }, (_, i) => ({
      x: 300000 + i,
      value: Math.floor(Math.random() * 100 + 50), // 50-150 blobs per epoch
    })),
    xAxis: {
      name: 'Epoch',
    },
    subtitle: undefined, // Will auto-calculate total
  },
};

/**
 * Average blobs per day over time with date formatting
 */
export const TimestampGranularity: Story = {
  args: {
    data: Array.from({ length: 30 }, (_, i) => ({
      x: Date.now() / 1000 - (30 - i) * 86400, // Last 30 days
      value: Math.floor(Math.random() * 50 + 100), // 100-150 avg blobs
    })),
    xAxis: {
      name: 'Date',
      formatter: (timestamp: number | string) => {
        const ts = typeof timestamp === 'string' ? parseFloat(timestamp) : timestamp;
        const date = new Date(ts * 1000);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      },
    },
    subtitle: '30-day average blob count',
  },
};

/**
 * Custom title and subtitle
 */
export const CustomLabels: Story = {
  args: {
    data: Array.from({ length: 50 }, (_, i) => ({
      x: 20000000 + i,
      value: Math.floor(Math.random() * 6),
    })),
    xAxis: {
      name: 'Block Number',
    },
    title: 'EIP-4844 Blob Adoption',
    subtitle: 'Blobs per block since Dencun upgrade',
  },
};

/**
 * Sparse data with many zero values
 */
export const SparseData: Story = {
  args: {
    data: Array.from({ length: 32 }, (_, i) => ({
      x: 10000000 + i,
      value: i % 5 === 0 ? Math.floor(Math.random() * 6) : 0, // Blobs only every 5th slot
    })),
    xAxis: {
      name: 'Slot',
      min: 10000000,
    },
    subtitle: 'Sparse blob distribution',
  },
};

/**
 * High blob activity (consistently maxed out)
 */
export const MaxBlobs: Story = {
  args: {
    data: Array.from({ length: 32 }, (_, i) => ({
      x: 10000000 + i,
      value: Math.random() > 0.2 ? 6 : Math.floor(Math.random() * 6), // Mostly 6 blobs
    })),
    xAxis: {
      name: 'Slot',
      min: 10000000,
    },
    subtitle: 'High blob demand period',
  },
};

/**
 * Empty state - no blob data
 */
export const NoData: Story = {
  args: {
    data: [],
    xAxis: {
      name: 'Slot',
    },
    subtitle: 'No blob data available',
  },
};
