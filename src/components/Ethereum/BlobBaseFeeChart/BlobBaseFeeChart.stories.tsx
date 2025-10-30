import type { Meta, StoryObj } from '@storybook/react-vite';

import { BlobBaseFeeChart } from './BlobBaseFeeChart';

const meta: Meta<typeof BlobBaseFeeChart> = {
  title: 'Components/Ethereum/BlobBaseFeeChart',
  component: BlobBaseFeeChart,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof BlobBaseFeeChart>;

/**
 * Generate sample excess blob gas data
 */
function generateExcessBlobGasData(
  count: number,
  startX: number = 10000000
): Array<{ x: number; excessBlobGas: number | null }> {
  return Array.from({ length: count }, (_, i) => ({
    x: startX + i,
    excessBlobGas: i % 5 === 0 ? null : Math.floor(Math.random() * 5000000) + 1000000, // Some nulls for variety
  }));
}

export const SlotLevel: Story = {
  args: {
    data: generateExcessBlobGasData(32),
    xAxis: { name: 'Slot' },
    subtitle: 'Blob base fee across epoch slots',
  },
};

export const EpochLevel: Story = {
  args: {
    data: generateExcessBlobGasData(20, 50000),
    xAxis: { name: 'Epoch' },
    subtitle: 'Average blob base fee per epoch',
  },
};

export const WithCustomHeight: Story = {
  args: {
    data: generateExcessBlobGasData(32),
    xAxis: { name: 'Slot' },
    height: 400,
  },
};

export const EmptyData: Story = {
  args: {
    data: [],
    xAxis: { name: 'Slot' },
  },
};

export const AllNullValues: Story = {
  args: {
    data: Array.from({ length: 32 }, (_, i) => ({
      x: 10000000 + i,
      excessBlobGas: null,
    })),
    xAxis: { name: 'Slot' },
    subtitle: 'No excess blob gas in this period',
  },
};

export const HighBlobUsage: Story = {
  args: {
    data: Array.from({ length: 32 }, (_, i) => ({
      x: 10000000 + i,
      excessBlobGas: Math.floor(Math.random() * 20000000) + 10000000, // High excess gas
    })),
    xAxis: { name: 'Slot' },
    subtitle: 'Period with high blob usage',
  },
};
