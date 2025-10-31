import type { Meta, StoryObj } from '@storybook/react';
import { BlockArrivalTimesChart } from './BlockArrivalTimesChart';

const meta = {
  title: 'Components/Ethereum/BlockArrivalTimesChart',
  component: BlockArrivalTimesChart,
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
} satisfies Meta<typeof BlockArrivalTimesChart>;

export default meta;
type Story = StoryObj<typeof meta>;

// Generate sample data for 32 slots
const generateSampleData = () => {
  return Array.from({ length: 32 }, (_, i) => {
    const slot = 10000000 + i;
    // Simulate block arrival times in milliseconds (most arrive early, some late)
    const baseTime = 500 + Math.random() * 1000; // 0.5-1.5 seconds base
    return {
      x: slot,
      min: Math.max(100, baseTime - 400),
      p05: baseTime - 200,
      p50: baseTime,
      p90: baseTime + 300,
      max: baseTime + 800,
    };
  });
};

export const Default: Story = {
  args: {
    data: generateSampleData(),
    xAxis: {
      name: 'Slot',
      min: 10000000,
      max: 10000031,
    },
  },
};

export const WithRelativeSlots: Story = {
  args: {
    data: generateSampleData(),
    xAxis: {
      name: 'Slot',
      min: 10000000,
      max: 10000031,
    },
    relativeSlots: {
      epoch: 312500,
    },
  },
};

export const HighVariation: Story = {
  args: {
    data: Array.from({ length: 32 }, (_, i) => {
      const slot = 10000000 + i;
      // Simulate higher variation
      const baseTime = 800 + Math.random() * 2000;
      return {
        x: slot,
        min: Math.max(100, baseTime - 700),
        p05: baseTime - 400,
        p50: baseTime,
        p90: baseTime + 600,
        max: baseTime + 3000, // Some very late arrivals
      };
    }),
    xAxis: {
      name: 'Slot',
      min: 10000000,
      max: 10000031,
    },
  },
};

export const MissedBlocks: Story = {
  args: {
    data: Array.from({ length: 32 }, (_, i) => {
      const slot = 10000000 + i;
      // Simulate some missed blocks (null values)
      if (i % 5 === 0) {
        return {
          x: slot,
          min: null,
          p05: null,
          p50: null,
          p90: null,
          max: null,
        };
      }
      const baseTime = 500 + Math.random() * 1000;
      return {
        x: slot,
        min: Math.max(100, baseTime - 400),
        p05: baseTime - 200,
        p50: baseTime,
        p90: baseTime + 300,
        max: baseTime + 800,
      };
    }),
    xAxis: {
      name: 'Slot',
      min: 10000000,
      max: 10000031,
    },
  },
};
