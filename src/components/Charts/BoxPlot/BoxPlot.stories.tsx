import type { Meta, StoryObj } from '@storybook/react-vite';
import { BoxPlot } from './BoxPlot';
import { calculateBoxPlotStats } from './utils';
import type { BoxPlotStats } from './BoxPlot.types';

const meta = {
  title: 'Components/Charts/BoxPlot',
  component: BoxPlot,
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
} satisfies Meta<typeof BoxPlot>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sample data
const SINGLE_SERIES_DATA: BoxPlotStats[] = [
  [10, 20, 30, 40, 50], // [min, Q1, median, Q3, max]
  [15, 25, 35, 45, 55],
  [12, 22, 32, 42, 52],
  [18, 28, 38, 48, 58],
];

const BLOB_PROPAGATION_DATA = [
  {
    name: 'Blob 0',
    data: [
      [100, 150, 200, 250, 300],
      [110, 160, 210, 260, 310],
      [105, 155, 205, 255, 305],
      [115, 165, 215, 265, 315],
    ] as BoxPlotStats[],
    color: '#3b82f6',
  },
  {
    name: 'Blob 1',
    data: [
      [120, 170, 220, 270, 320],
      [130, 180, 230, 280, 330],
      [125, 175, 225, 275, 325],
      [135, 185, 235, 285, 335],
    ] as BoxPlotStats[],
    color: '#10b981',
  },
  {
    name: 'Blob 2',
    data: [
      [140, 190, 240, 290, 340],
      [150, 200, 250, 300, 350],
      [145, 195, 245, 295, 345],
      [155, 205, 255, 305, 355],
    ] as BoxPlotStats[],
    color: '#f59e0b',
  },
];

const NETWORK_LATENCY_DATA = [
  {
    name: 'US East',
    data: [
      [20, 35, 50, 65, 80],
      [25, 40, 55, 70, 85],
      [22, 37, 52, 67, 82],
    ] as BoxPlotStats[],
    color: '#6366f1',
  },
  {
    name: 'EU West',
    data: [
      [30, 45, 60, 75, 90],
      [35, 50, 65, 80, 95],
      [32, 47, 62, 77, 92],
    ] as BoxPlotStats[],
    color: '#8b5cf6',
  },
  {
    name: 'Asia Pacific',
    data: [
      [50, 70, 90, 110, 130],
      [55, 75, 95, 115, 135],
      [52, 72, 92, 112, 132],
    ] as BoxPlotStats[],
    color: '#ec4899',
  },
];

// Generate sample data using calculateBoxPlotStats
const RAW_DATA_SAMPLES = [
  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  [5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
  [100, 200, 150, 175, 225, 250, 275, 300, 325, 350],
  [50, 55, 60, 65, 70, 75, 80, 85, 90, 95],
];

const CALCULATED_STATS_DATA = [
  {
    name: 'Calculated from Raw Data',
    data: RAW_DATA_SAMPLES.map(rawData => calculateBoxPlotStats(rawData)),
  },
];

export const Basic: Story = {
  name: 'Basic - Single Series',
  args: {
    series: [
      {
        name: 'Dataset',
        data: SINGLE_SERIES_DATA,
      },
    ],
    title: 'Basic Box Plot',
  },
};

export const BlobPropagation: Story = {
  name: 'Blob Propagation - Multiple Series',
  args: {
    series: BLOB_PROPAGATION_DATA,
    title: 'Blob Propagation Latency',
    yAxisTitle: 'Latency (s)',
    yAxisFormatter: (value: number) => `${(value / 1000).toFixed(0)}`,
    xAxisTitle: 'Time Period',
    height: 500,
  },
};

export const NetworkLatency: Story = {
  name: 'Network Latency - By Region',
  args: {
    series: NETWORK_LATENCY_DATA,
    title: 'Network Latency by Region',
    yAxisTitle: 'Latency (ms)',
    xAxisTitle: 'Test Run',
    categories: ['Test 1', 'Test 2', 'Test 3'],
    height: 450,
  },
};

export const CalculatedStats: Story = {
  name: 'Calculated from Raw Data',
  args: {
    series: CALCULATED_STATS_DATA,
    title: 'Box Plot from Calculated Statistics',
    yAxisTitle: 'Value',
    showLegend: false,
    categories: ['Dataset A', 'Dataset B', 'Dataset C', 'Dataset D'],
  },
};

export const CustomColors: Story = {
  args: {
    series: [
      {
        name: 'Red Series',
        data: [[10, 20, 30, 40, 50]] as BoxPlotStats[],
        color: '#ef4444',
      },
      {
        name: 'Green Series',
        data: [[15, 25, 35, 45, 55]] as BoxPlotStats[],
        color: '#10b981',
      },
      {
        name: 'Blue Series',
        data: [[12, 22, 32, 42, 52]] as BoxPlotStats[],
        color: '#3b82f6',
      },
    ],
    title: 'Custom Color Box Plot',
    legendPosition: 'bottom',
  },
};

export const WithAxisTitles: Story = {
  args: {
    series: [
      {
        name: 'Response Time',
        data: SINGLE_SERIES_DATA,
      },
    ],
    title: 'API Response Times',
    xAxisTitle: 'Endpoint',
    yAxisTitle: 'Response Time (ms)',
    categories: ['/users', '/posts', '/comments', '/auth'],
  },
};

export const LegendPositions: Story = {
  name: 'Legend Position - Right',
  args: {
    series: BLOB_PROPAGATION_DATA,
    title: 'Legend on Right',
    yAxisTitle: 'Latency (ms)',
    legendPosition: 'right',
    height: 400,
  },
};

export const NoLegend: Story = {
  args: {
    series: [
      {
        name: 'Single Dataset',
        data: SINGLE_SERIES_DATA,
        color: '#8b5cf6',
      },
    ],
    title: 'Box Plot without Legend',
    yAxisTitle: 'Value',
    showLegend: false,
  },
};

export const CustomYAxisRange: Story = {
  name: 'Custom Y-Axis Range',
  args: {
    series: [
      {
        name: 'Dataset',
        data: SINGLE_SERIES_DATA,
      },
    ],
    title: 'Fixed Y-Axis Range (0-100)',
    yAxisTitle: 'Percentage',
    yMin: 0,
    yMax: 100,
  },
};

export const TallChart: Story = {
  args: {
    series: BLOB_PROPAGATION_DATA,
    title: 'Tall Box Plot',
    yAxisTitle: 'Latency (ms)',
    xAxisTitle: 'Time Period',
    height: 700,
  },
};

export const CompactChart: Story = {
  args: {
    series: [
      {
        name: 'Quick View',
        data: [SINGLE_SERIES_DATA[0], SINGLE_SERIES_DATA[1]] as BoxPlotStats[],
        color: '#10b981',
      },
    ],
    title: 'Compact Box Plot',
    height: 300,
    showLegend: false,
  },
};

export const ManyDataPoints: Story = {
  args: {
    series: [
      {
        name: 'Extensive Dataset',
        data: Array.from({ length: 20 }, (_, i) => [
          10 + i * 5,
          20 + i * 5,
          30 + i * 5,
          40 + i * 5,
          50 + i * 5,
        ]) as BoxPlotStats[],
      },
    ],
    title: 'Box Plot with Many Data Points',
    yAxisTitle: 'Value',
    height: 500,
    showLegend: false,
  },
};

export const WideBoxes: Story = {
  args: {
    series: [
      {
        name: 'Wide Dataset',
        data: SINGLE_SERIES_DATA.slice(0, 2),
      },
    ],
    title: 'Box Plot with Wide Boxes',
    boxWidth: '80%',
    showLegend: false,
  },
};

export const NarrowBoxes: Story = {
  args: {
    series: BLOB_PROPAGATION_DATA,
    title: 'Box Plot with Narrow Boxes',
    boxWidth: '40%',
    legendPosition: 'bottom',
  },
};

export const EmptyData: Story = {
  args: {
    series: [],
    title: 'Box Plot with No Data',
  },
};
