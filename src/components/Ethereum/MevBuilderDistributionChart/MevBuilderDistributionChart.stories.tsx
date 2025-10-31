import type { Meta, StoryObj } from '@storybook/react-vite';

import { MevBuilderDistributionChart } from './MevBuilderDistributionChart';
import type { MevBuilderDataPoint } from './MevBuilderDistributionChart.types';

const meta: Meta<typeof MevBuilderDistributionChart> = {
  title: 'Components/Ethereum/MevBuilderDistributionChart',
  component: MevBuilderDistributionChart,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
  argTypes: {
    data: {
      description: 'Array of data points containing builder information',
      control: { type: 'object' },
    },
    title: {
      description: 'Chart title',
      control: { type: 'text' },
    },
    subtitle: {
      description: 'Chart subtitle',
      control: { type: 'text' },
    },
    topN: {
      description: 'Maximum number of builders to display',
      control: { type: 'number' },
    },
    height: {
      description: 'Chart height in pixels',
      control: { type: 'number' },
    },
    truncateLength: {
      description: 'Truncate builder names to N characters',
      control: { type: 'number' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof MevBuilderDistributionChart>;

// Generate mock builder data
const generateMockData = (builderCounts: Record<string, number>): MevBuilderDataPoint[] => {
  const data: MevBuilderDataPoint[] = [];
  Object.entries(builderCounts).forEach(([builder, count]) => {
    for (let i = 0; i < count; i++) {
      data.push({ builder });
    }
  });
  return data;
};

/**
 * Default builder distribution chart showing top 10 builders
 */
export const Default: Story = {
  args: {
    data: generateMockData({
      '0x1234567890abcdef': 45,
      '0xabcdef1234567890': 38,
      '0x9876543210fedcba': 32,
      '0xfedcba0987654321': 28,
      '0x1111222233334444': 22,
      '0x5555666677778888': 18,
      '0x9999aaaabbbbcccc': 15,
      '0xddddeeeeffffaaaa': 12,
      '0xbbbbccccddddeeee': 8,
      '0xffffaaaabbbbcccc': 5,
    }),
    subtitle: 'Top builders by block count',
  },
};

/**
 * Chart showing only top 5 builders
 */
export const Top5Builders: Story = {
  args: {
    data: generateMockData({
      '0x1234567890abcdef': 45,
      '0xabcdef1234567890': 38,
      '0x9876543210fedcba': 32,
      '0xfedcba0987654321': 28,
      '0x1111222233334444': 22,
      '0x5555666677778888': 18,
      '0x9999aaaabbbbcccc': 15,
      '0xddddeeeeffffaaaa': 12,
    }),
    topN: 5,
    subtitle: 'Top 5 builders by block count',
  },
};

/**
 * Chart with named builders instead of addresses
 */
export const NamedBuilders: Story = {
  args: {
    data: generateMockData({
      Flashbots: 120,
      BloXroute: 95,
      Builder0x69: 87,
      'Beaver Build': 65,
      'Titan Builder': 52,
      'Rsync Builder': 48,
      Blocknative: 35,
      'Builder X': 28,
    }),
    subtitle: 'Distribution across named builders',
  },
};

/**
 * Chart with very long builder names that need truncation
 */
export const LongBuilderNames: Story = {
  args: {
    data: generateMockData({
      ThisIsAVeryLongBuilderNameThatWillBeTruncated: 45,
      AnotherExtremelyLongBuilderIdentifier: 38,
      YetAnotherVeryVerboseBuilderName: 32,
      ShortName: 28,
    }),
    truncateLength: 20,
    subtitle: 'Builder names truncated to 20 characters',
  },
};

/**
 * Chart with minimal builder diversity
 */
export const LowDiversity: Story = {
  args: {
    data: generateMockData({
      Flashbots: 150,
      BloXroute: 30,
      Builder0x69: 15,
    }),
    subtitle: 'Low builder diversity',
  },
};

/**
 * Empty state when no builder data is available
 */
export const EmptyState: Story = {
  args: {
    data: [],
    subtitle: 'No builder data available',
  },
};

/**
 * Chart with custom height
 */
export const CustomHeight: Story = {
  args: {
    data: generateMockData({
      '0x1234567890abcdef': 45,
      '0xabcdef1234567890': 38,
      '0x9876543210fedcba': 32,
      '0xfedcba0987654321': 28,
      '0x1111222233334444': 22,
    }),
    height: 400,
    subtitle: 'Custom height of 400px',
  },
};

/**
 * Epoch-specific context
 */
export const EpochContext: Story = {
  args: {
    data: generateMockData({
      Flashbots: 18,
      BloXroute: 12,
      Builder0x69: 8,
      'Beaver Build': 6,
      'Titan Builder': 4,
      'Rsync Builder': 3,
      Blocknative: 2,
      'Builder X': 1,
    }),
    subtitle: 'Builder distribution in epoch 295432',
  },
};

/**
 * Time range context
 */
export const TimeRangeContext: Story = {
  args: {
    data: generateMockData({
      Flashbots: 450,
      BloXroute: 380,
      Builder0x69: 320,
      'Beaver Build': 280,
      'Titan Builder': 220,
      'Rsync Builder': 180,
      Blocknative: 150,
      'Builder X': 120,
    }),
    subtitle: 'Builder distribution from Jan 1-7, 2025',
  },
};
