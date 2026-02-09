import type { Meta, StoryObj } from '@storybook/react-vite';
import { RadarChart } from './Radar';

const meta = {
  title: 'Components/Charts/Radar',
  component: RadarChart,
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-xs bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof RadarChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Basic radar chart with two validators being compared
 */
export const ValidatorBattle: Story = {
  args: {
    indicators: [
      { name: 'Inclusion', max: 100 },
      { name: 'Head', max: 100 },
      { name: 'Target', max: 100 },
      { name: 'Source', max: 100 },
      { name: 'Sync', max: 100 },
      { name: 'Balance', max: 100 },
    ],
    series: [
      {
        name: 'Validator #12345',
        values: [99.2, 95.4, 99.8, 100, 98.7, 85],
        areaOpacity: 0.3,
      },
      {
        name: 'Validator #67890',
        values: [98.1, 97.2, 99.1, 100, 99.2, 78],
        areaOpacity: 0.3,
      },
    ],
    height: 400,
    showLegend: true,
    legendPosition: 'bottom',
  },
};

/**
 * Single series radar chart
 */
export const SingleSeries: Story = {
  args: {
    indicators: [
      { name: 'Attack', max: 100 },
      { name: 'Defense', max: 100 },
      { name: 'Speed', max: 100 },
      { name: 'Stamina', max: 100 },
      { name: 'Magic', max: 100 },
    ],
    series: [
      {
        name: 'Character Stats',
        values: [80, 70, 90, 65, 85],
        areaOpacity: 0.4,
      },
    ],
    height: 350,
    showLegend: false,
    title: 'Character Stats',
  },
};

/**
 * Three series comparison with custom colors
 */
export const ThreeWayComparison: Story = {
  args: {
    indicators: [
      { name: 'Performance', max: 100 },
      { name: 'Reliability', max: 100 },
      { name: 'Efficiency', max: 100 },
      { name: 'Cost', max: 100 },
    ],
    series: [
      {
        name: 'Option A',
        values: [90, 85, 70, 60],
        color: '#3b82f6',
        areaOpacity: 0.25,
      },
      {
        name: 'Option B',
        values: [75, 90, 85, 80],
        color: '#22c55e',
        areaOpacity: 0.25,
      },
      {
        name: 'Option C',
        values: [85, 70, 95, 90],
        color: '#f97316',
        areaOpacity: 0.25,
      },
    ],
    height: 400,
    showLegend: true,
  },
};

/**
 * Circular shape radar chart
 */
export const CircularShape: Story = {
  args: {
    indicators: [
      { name: 'Jan', max: 100 },
      { name: 'Feb', max: 100 },
      { name: 'Mar', max: 100 },
      { name: 'Apr', max: 100 },
      { name: 'May', max: 100 },
      { name: 'Jun', max: 100 },
    ],
    series: [
      {
        name: '2024',
        values: [65, 72, 80, 75, 85, 90],
        areaOpacity: 0.3,
      },
      {
        name: '2025',
        values: [70, 78, 85, 88, 92, 95],
        areaOpacity: 0.3,
      },
    ],
    shape: 'circle',
    height: 400,
  },
};

/**
 * With symbols on vertices
 */
export const WithSymbols: Story = {
  args: {
    indicators: [
      { name: 'Metric A', max: 100 },
      { name: 'Metric B', max: 100 },
      { name: 'Metric C', max: 100 },
      { name: 'Metric D', max: 100 },
      { name: 'Metric E', max: 100 },
    ],
    series: [
      {
        name: 'Series 1',
        values: [80, 90, 70, 85, 75],
        areaOpacity: 0.2,
      },
      {
        name: 'Series 2',
        values: [75, 80, 85, 70, 90],
        areaOpacity: 0.2,
      },
    ],
    showSymbol: true,
    symbolSize: 8,
    height: 400,
  },
};

/**
 * Compact size for dashboard cards
 */
export const Compact: Story = {
  args: {
    indicators: [
      { name: 'A', max: 100 },
      { name: 'B', max: 100 },
      { name: 'C', max: 100 },
      { name: 'D', max: 100 },
    ],
    series: [
      {
        name: 'Current',
        values: [85, 90, 75, 88],
        areaOpacity: 0.4,
      },
    ],
    height: 200,
    showLegend: false,
    radius: 60,
  },
};
