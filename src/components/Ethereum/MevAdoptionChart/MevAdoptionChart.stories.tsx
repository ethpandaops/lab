import type { Meta, StoryObj } from '@storybook/react-vite';
import { MevAdoptionChart } from './MevAdoptionChart';

const meta = {
  title: 'Components/Ethereum/MevAdoptionChart',
  component: MevAdoptionChart,
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
} satisfies Meta<typeof MevAdoptionChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * High MEV adoption - 90% MEV-boost usage
 */
export const HighAdoption: Story = {
  args: {
    data: Array.from({ length: 32 }, (_, i) => ({
      hasMev: i < 29, // 29/32 = ~90% MEV
    })),
  },
};

/**
 * Medium MEV adoption - 50% MEV-boost usage
 */
export const MediumAdoption: Story = {
  args: {
    data: Array.from({ length: 32 }, (_, i) => ({
      hasMev: i % 2 === 0, // 50% MEV
    })),
    subtitle: undefined, // Will auto-calculate
  },
};

/**
 * Low MEV adoption - 20% MEV-boost usage
 */
export const LowAdoption: Story = {
  args: {
    data: Array.from({ length: 32 }, (_, i) => ({
      hasMev: i < 6, // 6/32 = ~19% MEV
    })),
  },
};

/**
 * Full MEV adoption - 100% MEV-boost usage
 */
export const FullAdoption: Story = {
  args: {
    data: Array.from({ length: 32 }, () => ({
      hasMev: true, // 100% MEV
    })),
    title: 'Complete MEV-Boost Adoption',
  },
};

/**
 * No MEV adoption - 0% MEV-boost usage
 */
export const NoAdoption: Story = {
  args: {
    data: Array.from({ length: 32 }, () => ({
      hasMev: false, // 0% MEV
    })),
    title: 'Zero MEV-Boost Usage',
    subtitle: 'All blocks are locally built',
  },
};

/**
 * Large dataset - 225 slots (7 epochs)
 */
export const LargeDataset: Story = {
  args: {
    data: Array.from({ length: 225 }, () => ({
      hasMev: Math.random() > 0.15, // ~85% MEV
    })),
    subtitle: 'MEV-boost usage over 7 epochs',
  },
};

/**
 * Small dataset - single epoch
 */
export const SmallDataset: Story = {
  args: {
    data: Array.from({ length: 32 }, () => ({
      hasMev: Math.random() > 0.25, // ~75% MEV
    })),
  },
};

/**
 * Custom subtitle provided
 */
export const CustomSubtitle: Story = {
  args: {
    data: Array.from({ length: 100 }, (_, i) => ({
      hasMev: i < 80, // 80% MEV
    })),
    title: 'Block Production Methods',
    subtitle: 'Comparison of MEV-boost vs locally built blocks in last hour',
  },
};

/**
 * Edge case - only one block
 */
export const SingleBlock: Story = {
  args: {
    data: [{ hasMev: true }],
    subtitle: 'Single block analysis',
  },
};

/**
 * Empty state - no data
 */
export const NoData: Story = {
  args: {
    data: [],
    subtitle: 'No block data available',
  },
};
