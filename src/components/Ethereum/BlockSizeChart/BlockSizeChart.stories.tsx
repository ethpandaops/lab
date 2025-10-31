import type { Meta, StoryObj } from '@storybook/react-vite';

import { BlockSizeChart } from './BlockSizeChart';

const meta = {
  title: 'Components/Ethereum/BlockSizeChart',
  component: BlockSizeChart,
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
} satisfies Meta<typeof BlockSizeChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Helper to generate realistic block size data
 * CL blocks are typically 50-150 KB, EL blocks 20-80 KB
 * Compressed sizes are ~60-70% of uncompressed
 */
function generateBlockSizeData(
  count: number,
  startX: number
): Array<{
  x: number;
  consensusSize: number;
  consensusSizeCompressed: number;
  executionSize: number;
  executionSizeCompressed: number;
}> {
  return Array.from({ length: count }, (_, i) => {
    const clUncompressed = Math.floor(Math.random() * 100000 + 50000); // 50-150 KB in bytes
    const elUncompressed = Math.floor(Math.random() * 60000 + 20000); // 20-80 KB in bytes

    return {
      x: startX + i,
      consensusSize: clUncompressed,
      consensusSizeCompressed: Math.floor(clUncompressed * (0.6 + Math.random() * 0.1)), // 60-70%
      executionSize: elUncompressed,
      executionSizeCompressed: Math.floor(elUncompressed * (0.6 + Math.random() * 0.1)), // 60-70%
    };
  });
}

/**
 * Block sizes per slot over a single epoch (32 slots)
 */
export const SlotGranularity: Story = {
  args: {
    data: generateBlockSizeData(32, 10000000),
    xAxis: {
      name: 'Slot',
      min: 10000000,
    },
  },
};

/**
 * Average block sizes per epoch over multiple epochs
 */
export const EpochGranularity: Story = {
  args: {
    data: generateBlockSizeData(100, 300000),
    xAxis: {
      name: 'Epoch',
    },
    subtitle: 'Average block sizes per epoch',
  },
};

/**
 * Block sizes over time with date formatting
 */
export const TimestampGranularity: Story = {
  args: {
    data: Array.from({ length: 30 }, (_, i) => {
      const clUncompressed = Math.floor(Math.random() * 100000 + 50000);
      const elUncompressed = Math.floor(Math.random() * 60000 + 20000);

      return {
        x: Date.now() / 1000 - (30 - i) * 86400, // Last 30 days
        consensusSize: clUncompressed,
        consensusSizeCompressed: Math.floor(clUncompressed * 0.65),
        executionSize: elUncompressed,
        executionSizeCompressed: Math.floor(elUncompressed * 0.65),
      };
    }),
    xAxis: {
      name: 'Date',
      formatter: (timestamp: number | string) => {
        const ts = typeof timestamp === 'string' ? parseFloat(timestamp) : timestamp;
        const date = new Date(ts * 1000);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      },
    },
    subtitle: '30-day block size trends',
  },
};

/**
 * Custom title and subtitle
 */
export const CustomLabels: Story = {
  args: {
    data: generateBlockSizeData(50, 20000000),
    xAxis: {
      name: 'Block Number',
    },
    title: 'Block Size Analysis',
    subtitle: 'Compression efficiency across layers',
  },
};

/**
 * High compression efficiency (CL dominates)
 */
export const CLDominant: Story = {
  args: {
    data: Array.from({ length: 32 }, (_, i) => {
      const clUncompressed = Math.floor(Math.random() * 50000 + 100000); // Large CL blocks
      const elUncompressed = Math.floor(Math.random() * 20000 + 10000); // Small EL blocks

      return {
        x: 10000000 + i,
        consensusSize: clUncompressed,
        consensusSizeCompressed: Math.floor(clUncompressed * 0.5), // High compression
        executionSize: elUncompressed,
        executionSizeCompressed: Math.floor(elUncompressed * 0.7),
      };
    }),
    xAxis: {
      name: 'Slot',
      min: 10000000,
    },
    subtitle: 'CL blocks dominate with high compression',
  },
};

/**
 * High execution activity (EL dominates)
 */
export const ELDominant: Story = {
  args: {
    data: Array.from({ length: 32 }, (_, i) => {
      const clUncompressed = Math.floor(Math.random() * 30000 + 40000); // Smaller CL blocks
      const elUncompressed = Math.floor(Math.random() * 80000 + 60000); // Large EL blocks

      return {
        x: 10000000 + i,
        consensusSize: clUncompressed,
        consensusSizeCompressed: Math.floor(clUncompressed * 0.65),
        executionSize: elUncompressed,
        executionSizeCompressed: Math.floor(elUncompressed * 0.6), // Good compression
      };
    }),
    xAxis: {
      name: 'Slot',
      min: 10000000,
    },
    subtitle: 'High execution layer activity',
  },
};

/**
 * Sparse data with some null values (missed slots)
 */
export const SparseData: Story = {
  args: {
    data: Array.from({ length: 32 }, (_, i) => {
      // Every 5th slot is missed
      if (i % 5 === 0) {
        return {
          x: 10000000 + i,
          consensusSize: null,
          consensusSizeCompressed: null,
          executionSize: null,
          executionSizeCompressed: null,
        };
      }

      const clUncompressed = Math.floor(Math.random() * 100000 + 50000);
      const elUncompressed = Math.floor(Math.random() * 60000 + 20000);

      return {
        x: 10000000 + i,
        consensusSize: clUncompressed,
        consensusSizeCompressed: Math.floor(clUncompressed * 0.65),
        executionSize: elUncompressed,
        executionSizeCompressed: Math.floor(elUncompressed * 0.65),
      };
    }),
    xAxis: {
      name: 'Slot',
      min: 10000000,
    },
    subtitle: 'Block sizes with missed slots',
  },
};

/**
 * Empty state - no block data
 */
export const NoData: Story = {
  args: {
    data: [],
    xAxis: {
      name: 'Slot',
    },
    subtitle: 'No block data available',
  },
};
