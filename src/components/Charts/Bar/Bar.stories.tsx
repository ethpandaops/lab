import type { Meta, StoryObj } from '@storybook/react-vite';
import { BarChart } from './Bar';

const meta = {
  title: 'Components/Charts/Bar',
  component: BarChart,
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
  tags: ['autodocs'],
} satisfies Meta<typeof BarChart>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sample data
const SIMPLE_DATA = [120, 200, 150, 80, 70, 110, 130];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];

const RELAY_DATA = [
  { value: 45, color: '#10b981' }, // Winner - green
  { value: 32, color: '#6366f1' },
  { value: 28, color: '#6366f1' },
  { value: 15, color: '#6366f1' },
  { value: 12, color: '#6366f1' },
];
const RELAY_NAMES = ['Flashbots', 'BloXroute', 'Ultrasound', 'Agnostic', 'Eden'];

const BUILDER_DATA = [
  { value: 156, color: '#8b5cf6' }, // Winner - purple
  { value: 98, color: '#6366f1' },
  { value: 87, color: '#6366f1' },
  { value: 45, color: '#6366f1' },
  { value: 23, color: '#6366f1' },
  { value: 12, color: '#6366f1' },
];
const BUILDER_NAMES = [
  '0xabcd...1234',
  '0xdef0...5678',
  '0x9abc...def0',
  '0x1234...5678',
  '0x8765...4321',
  '0xfedc...ba98',
];

export const VerticalDefault: Story = {
  name: 'Vertical - Default',
  args: {
    data: SIMPLE_DATA,
    labels: MONTHS,
    title: 'Monthly Revenue',
  },
};

export const VerticalNoTitle: Story = {
  name: 'Vertical - No Title',
  args: {
    data: SIMPLE_DATA,
    labels: MONTHS,
  },
};

export const VerticalCustomColor: Story = {
  name: 'Vertical - Custom Color',
  args: {
    data: SIMPLE_DATA,
    labels: MONTHS,
    title: 'Monthly Revenue',
    color: '#f59e0b',
  },
};

export const VerticalWithAxisName: Story = {
  name: 'Vertical - With Axis Name',
  args: {
    data: SIMPLE_DATA,
    labels: MONTHS,
    title: 'Monthly Revenue',
    axisName: 'Revenue ($)',
  },
};

export const VerticalNoLabels: Story = {
  name: 'Vertical - No Bar Labels',
  args: {
    data: SIMPLE_DATA,
    labels: MONTHS,
    title: 'Monthly Revenue',
    showLabel: false,
  },
};

export const HorizontalDefault: Story = {
  name: 'Horizontal - Default',
  args: {
    data: SIMPLE_DATA,
    labels: MONTHS,
    title: 'Monthly Revenue',
    orientation: 'horizontal',
  },
};

export const HorizontalRelayDistribution: Story = {
  name: 'Horizontal - Relay Distribution (with winner)',
  args: {
    data: RELAY_DATA,
    labels: RELAY_NAMES,
    title: 'Relay Bid Distribution',
    orientation: 'horizontal',
    axisName: 'Bid Count',
    height: 300,
  },
};

export const HorizontalBuilderCompetition: Story = {
  name: 'Horizontal - Builder Competition (with winner)',
  args: {
    data: BUILDER_DATA,
    labels: BUILDER_NAMES,
    title: 'Builder Competition',
    orientation: 'horizontal',
    axisName: 'Bid Count',
    height: 350,
  },
};

export const HorizontalCustomFormatter: Story = {
  name: 'Horizontal - Custom Label Formatter',
  args: {
    data: RELAY_DATA,
    labels: RELAY_NAMES,
    title: 'Relay Bid Distribution',
    orientation: 'horizontal',
    axisName: 'Bids',
    labelFormatter: (params: { value: number }) => `${params.value} bids`,
    height: 300,
  },
};

export const Tall: Story = {
  name: 'Tall Chart',
  args: {
    data: [50, 80, 120, 200, 150, 90, 70, 110, 140, 180, 160, 130],
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    title: 'Annual Sales',
    height: 600,
  },
};

export const WideHorizontal: Story = {
  name: 'Wide Horizontal Chart',
  args: {
    data: [
      { value: 234, color: '#10b981' },
      { value: 187, color: '#6366f1' },
      { value: 156, color: '#6366f1' },
      { value: 143, color: '#6366f1' },
      { value: 98, color: '#6366f1' },
      { value: 87, color: '#6366f1' },
      { value: 76, color: '#6366f1' },
      { value: 65, color: '#6366f1' },
      { value: 54, color: '#6366f1' },
      { value: 43, color: '#6366f1' },
    ],
    labels: [
      'Category A',
      'Category B',
      'Category C',
      'Category D',
      'Category E',
      'Category F',
      'Category G',
      'Category H',
      'Category I',
      'Category J',
    ],
    title: 'Top 10 Categories',
    orientation: 'horizontal',
    axisName: 'Count',
    height: 500,
  },
};

export const MixedColors: Story = {
  name: 'Mixed Colors per Bar',
  args: {
    data: [
      { value: 120, color: '#ef4444' },
      { value: 200, color: '#f59e0b' },
      { value: 150, color: '#10b981' },
      { value: 80, color: '#3b82f6' },
      { value: 70, color: '#8b5cf6' },
      { value: 110, color: '#ec4899' },
    ],
    labels: ['Red', 'Orange', 'Green', 'Blue', 'Purple', 'Pink'],
    title: 'Color Distribution',
  },
};

export const SmallHeight: Story = {
  name: 'Small Height',
  args: {
    data: SIMPLE_DATA.slice(0, 5),
    labels: MONTHS.slice(0, 5),
    title: 'Compact Chart',
    height: 250,
  },
};
