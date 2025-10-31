import type { Meta, StoryObj } from '@storybook/react-vite';
import { Donut } from './Donut';

const meta: Meta<typeof Donut> = {
  title: 'Components/Charts/Donut',
  component: Donut,
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
  argTypes: {
    height: {
      control: { type: 'number' },
      description: 'Height of the chart in pixels',
    },
    innerRadius: {
      control: { type: 'number', min: 0, max: 100 },
      description: 'Inner radius percentage (creates donut hole)',
    },
    outerRadius: {
      control: { type: 'number', min: 0, max: 100 },
      description: 'Outer radius percentage',
    },
    showLegend: {
      control: { type: 'boolean' },
      description: 'Show legend',
    },
    showLabel: {
      control: { type: 'boolean' },
      description: 'Show labels on segments',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Donut>;

/**
 * Basic donut chart with default settings
 */
export const Default: Story = {
  args: {
    data: [
      { name: 'Search Engine', value: 1048 },
      { name: 'Direct', value: 735 },
      { name: 'Email', value: 580 },
      { name: 'Union Ads', value: 484 },
      { name: 'Video Ads', value: 300 },
    ],
  },
};

/**
 * Donut chart with title
 */
export const WithTitle: Story = {
  args: {
    data: [
      { name: 'Search Engine', value: 1048 },
      { name: 'Direct', value: 735 },
      { name: 'Email', value: 580 },
      { name: 'Union Ads', value: 484 },
      { name: 'Video Ads', value: 300 },
    ],
    title: 'Traffic Sources',
  },
};

/**
 * Custom colors for each segment
 */
export const CustomColors: Story = {
  args: {
    data: [
      { name: 'Passed', value: 450, color: '#22c55e' },
      { name: 'Failed', value: 62, color: '#ef4444' },
      { name: 'Skipped', value: 25, color: '#f59e0b' },
    ],
    title: 'Test Results',
  },
};

/**
 * Thicker donut (smaller inner radius)
 */
export const Thick: Story = {
  args: {
    data: [
      { name: 'Category A', value: 400 },
      { name: 'Category B', value: 300 },
      { name: 'Category C', value: 200 },
    ],
    title: 'Thick Donut',
    innerRadius: 20,
    outerRadius: 70,
  },
};

/**
 * Thinner donut (larger inner radius)
 */
export const Thin: Story = {
  args: {
    data: [
      { name: 'Category A', value: 400 },
      { name: 'Category B', value: 300 },
      { name: 'Category C', value: 200 },
    ],
    title: 'Thin Donut',
    innerRadius: 60,
    outerRadius: 80,
  },
};

/**
 * Full pie chart (no inner radius)
 */
export const PieChart: Story = {
  args: {
    data: [
      { name: 'Category A', value: 400 },
      { name: 'Category B', value: 300 },
      { name: 'Category C', value: 200 },
    ],
    title: 'Pie Chart',
    innerRadius: 0,
    outerRadius: 70,
  },
};

/**
 * With labels on segments (outside with connecting lines)
 */
export const WithLabelsOutside: Story = {
  args: {
    data: [
      { name: 'Search Engine', value: 1048 },
      { name: 'Direct', value: 735 },
      { name: 'Email', value: 580 },
      { name: 'Union Ads', value: 484 },
    ],
    title: 'Labels Outside',
    showLabel: true,
    labelPosition: 'outside',
  },
};

/**
 * With labels inside segments
 */
export const WithLabelsInside: Story = {
  args: {
    data: [
      { name: 'Search Engine', value: 1048 },
      { name: 'Direct', value: 735 },
      { name: 'Email', value: 580 },
      { name: 'Union Ads', value: 484 },
    ],
    title: 'Labels Inside',
    showLabel: true,
    labelPosition: 'inside',
  },
};

/**
 * With labels in center
 */
export const WithLabelsCenter: Story = {
  args: {
    data: [
      { name: 'Search Engine', value: 1048 },
      { name: 'Direct', value: 735 },
      { name: 'Email', value: 580 },
      { name: 'Union Ads', value: 484 },
    ],
    title: 'Labels Center',
    showLabel: true,
    labelPosition: 'center',
  },
};

/**
 * Legend at bottom
 */
export const LegendBottom: Story = {
  args: {
    data: [
      { name: 'Search Engine', value: 1048 },
      { name: 'Direct', value: 735 },
      { name: 'Email', value: 580 },
      { name: 'Union Ads', value: 484 },
      { name: 'Video Ads', value: 300 },
    ],
    title: 'Traffic Sources',
    legendPosition: 'bottom',
  },
};

/**
 * Legend on the right (vertical)
 */
export const LegendRight: Story = {
  args: {
    data: [
      { name: 'Search Engine', value: 1048 },
      { name: 'Direct', value: 735 },
      { name: 'Email', value: 580 },
      { name: 'Union Ads', value: 484 },
      { name: 'Video Ads', value: 300 },
    ],
    title: 'Traffic Sources',
    legendPosition: 'right',
    legendOrientation: 'vertical',
  },
};

/**
 * No legend
 */
export const NoLegend: Story = {
  args: {
    data: [
      { name: 'Category A', value: 400 },
      { name: 'Category B', value: 300 },
      { name: 'Category C', value: 200 },
    ],
    title: 'No Legend',
    showLegend: false,
  },
};

/**
 * Binary distribution (yes/no)
 */
export const Binary: Story = {
  args: {
    data: [
      { name: 'Yes', value: 823, color: '#22c55e' },
      { name: 'No', value: 177, color: '#ef4444' },
    ],
    title: 'Survey Response',
  },
};

/**
 * Large dataset (many segments)
 */
export const LargeDataset: Story = {
  args: {
    data: [
      { name: 'Chrome', value: 850 },
      { name: 'Safari', value: 620 },
      { name: 'Firefox', value: 380 },
      { name: 'Edge', value: 290 },
      { name: 'Opera', value: 120 },
      { name: 'Brave', value: 95 },
      { name: 'Samsung Internet', value: 75 },
      { name: 'UC Browser', value: 50 },
      { name: 'Other', value: 130 },
    ],
    title: 'Browser Usage',
    height: 500,
    legendPosition: 'right',
    legendOrientation: 'vertical',
  },
};

/**
 * Compact size
 */
export const Compact: Story = {
  args: {
    data: [
      { name: 'Category A', value: 400 },
      { name: 'Category B', value: 300 },
      { name: 'Category C', value: 200 },
    ],
    height: 250,
  },
};

/**
 * Market share example
 */
export const MarketShare: Story = {
  args: {
    data: [
      { name: 'Company A', value: 3520, color: '#3b82f6' },
      { name: 'Company B', value: 2890, color: '#22c55e' },
      { name: 'Company C', value: 1840, color: '#f59e0b' },
      { name: 'Company D', value: 1200, color: '#8b5cf6' },
      { name: 'Others', value: 750, color: '#6b7280' },
    ],
    title: 'Market Share (Q4 2024)',
    innerRadius: 45,
    outerRadius: 75,
    legendPosition: 'bottom',
  },
};
