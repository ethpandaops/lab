import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScatterAndLineChart } from './ScatterAndLine';
import type { ScatterSeries, LineSeries } from './ScatterAndLine.types';

const meta = {
  title: 'Components/Charts/ScatterAndLine',
  component: ScatterAndLineChart,
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
} satisfies Meta<typeof ScatterAndLineChart>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sample data generators
const generateScatterData = (count: number, xRange: [number, number], yRange: [number, number]): [number, number][] => {
  return Array.from({ length: count }, () => [
    Math.random() * (xRange[1] - xRange[0]) + xRange[0],
    Math.random() * (yRange[1] - yRange[0]) + yRange[0],
  ]);
};

const generateLineData = (count: number, xRange: [number, number], fn: (x: number) => number): [number, number][] => {
  const step = (xRange[1] - xRange[0]) / (count - 1);
  return Array.from({ length: count }, (_, i) => {
    const x = xRange[0] + i * step;
    return [x, fn(x)];
  });
};

// Basic scatter plot data
const BASIC_SCATTER_DATA: ScatterSeries[] = [
  {
    name: 'Data Points',
    data: [
      [10, 120],
      [20, 150],
      [30, 180],
      [40, 140],
      [50, 200],
      [60, 170],
      [70, 220],
      [80, 190],
      [90, 240],
      [100, 210],
    ],
    color: '#3b82f6',
  },
];

// Basic line chart data
const BASIC_LINE_DATA: LineSeries[] = [
  {
    name: 'Trend Line',
    data: [
      [0, 100],
      [25, 150],
      [50, 175],
      [75, 190],
      [100, 220],
    ],
    color: '#10b981',
  },
];

// Slot propagation data (realistic blockchain example)
const SLOT_SCATTER_DATA: ScatterSeries[] = [
  {
    name: 'Block Arrival',
    data: generateScatterData(50, [0, 12], [0, 50]).map(([x, y]) => [x, Math.floor(y)]),
    color: '#6366f1',
    symbolSize: 6,
  },
];

const SLOT_LINE_DATA: LineSeries[] = [
  {
    name: 'Expected Propagation',
    data: generateLineData(100, [0, 12], x => 10 + x * 2),
    color: '#f59e0b',
    lineWidth: 2,
    smooth: true,
  },
];

// Network latency data with dual Y-axis
const LATENCY_SCATTER_DATA: ScatterSeries[] = [
  {
    name: 'Observed Latency',
    data: generateScatterData(60, [0, 100], [20, 150]).map(([x, y]) => [x, Math.floor(y)]),
    color: '#ef4444',
    symbolSize: 4,
    yAxisIndex: 0,
  },
];

const LATENCY_LINE_DATA: LineSeries[] = [
  {
    name: 'Success Rate',
    data: generateLineData(50, [0, 100], x => 85 + 10 * Math.sin(x / 20)),
    color: '#10b981',
    lineWidth: 3,
    smooth: true,
    yAxisIndex: 1,
  },
];

// Multiple series data
const MULTI_SCATTER_DATA: ScatterSeries[] = [
  {
    name: 'Cluster A',
    data: generateScatterData(30, [0, 50], [100, 200]).map(([x, y]) => [x, Math.floor(y)]),
    color: '#3b82f6',
    symbolSize: 8,
    symbol: 'circle',
  },
  {
    name: 'Cluster B',
    data: generateScatterData(30, [50, 100], [150, 250]).map(([x, y]) => [x, Math.floor(y)]),
    color: '#8b5cf6',
    symbolSize: 8,
    symbol: 'diamond',
  },
  {
    name: 'Cluster C',
    data: generateScatterData(30, [25, 75], [50, 150]).map(([x, y]) => [x, Math.floor(y)]),
    color: '#ec4899',
    symbolSize: 8,
    symbol: 'triangle',
  },
];

const MULTI_LINE_DATA: LineSeries[] = [
  {
    name: 'Trend A',
    data: generateLineData(50, [0, 100], x => 100 + x),
    color: '#3b82f6',
    lineWidth: 2,
    smooth: true,
  },
  {
    name: 'Trend B',
    data: generateLineData(50, [0, 100], x => 150 + x),
    color: '#8b5cf6',
    lineWidth: 2,
    smooth: true,
  },
  {
    name: 'Trend C',
    data: generateLineData(50, [0, 100], x => 50 + x * 0.5),
    color: '#ec4899',
    lineWidth: 2,
    smooth: true,
  },
];

export const BasicScatter: Story = {
  name: 'Basic - Scatter Plot Only',
  args: {
    scatterSeries: BASIC_SCATTER_DATA,
    xAxisTitle: 'Time (s)',
    yAxisTitle: 'Value',
    height: 400,
  },
};

export const BasicLine: Story = {
  name: 'Basic - Line Chart Only',
  args: {
    lineSeries: BASIC_LINE_DATA,
    xAxisTitle: 'Time (s)',
    yAxisTitle: 'Value',
    height: 400,
  },
};

export const CombinedScatterAndLine: Story = {
  name: 'Combined - Scatter and Line',
  args: {
    scatterSeries: BASIC_SCATTER_DATA,
    lineSeries: BASIC_LINE_DATA,
    xAxisTitle: 'Time (s)',
    yAxisTitle: 'Value',
    height: 400,
  },
};

export const SlotPropagation: Story = {
  name: 'Slot Propagation - Blockchain Example',
  args: {
    scatterSeries: SLOT_SCATTER_DATA,
    lineSeries: SLOT_LINE_DATA,
    xAxisTitle: 'Time (s)',
    yAxisTitle: 'Node Count',
    height: 450,
  },
};

export const DualYAxis: Story = {
  name: 'Dual Y-Axis - Latency vs Success Rate',
  args: {
    scatterSeries: LATENCY_SCATTER_DATA,
    lineSeries: LATENCY_LINE_DATA,
    xAxisTitle: 'Time (s)',
    yAxisTitle: 'Latency (ms)',
    yAxis2Title: 'Success Rate (%)',
    height: 450,
    tooltipTrigger: 'axis',
  },
};

export const MultipleSeries: Story = {
  name: 'Multiple Series - Clusters and Trends',
  args: {
    scatterSeries: MULTI_SCATTER_DATA,
    lineSeries: MULTI_LINE_DATA,
    xAxisTitle: 'X-Axis',
    yAxisTitle: 'Y-Axis',
    height: 500,
    legendPosition: 'bottom',
  },
};

export const CustomColors: Story = {
  args: {
    scatterSeries: [
      {
        name: 'Red Points',
        data: generateScatterData(20, [0, 50], [50, 150]).map(([x, y]) => [x, Math.floor(y)]),
        color: '#ef4444',
        symbolSize: 10,
      },
      {
        name: 'Green Points',
        data: generateScatterData(20, [50, 100], [100, 200]).map(([x, y]) => [x, Math.floor(y)]),
        color: '#10b981',
        symbolSize: 10,
      },
    ],
    lineSeries: [
      {
        name: 'Blue Line',
        data: generateLineData(50, [0, 100], x => 75 + x * 0.75),
        color: '#3b82f6',
        lineWidth: 3,
      },
    ],
    xAxisTitle: 'Time',
    yAxisTitle: 'Value',
    height: 400,
  },
};

export const CustomTooltip: Story = {
  args: {
    scatterSeries: BASIC_SCATTER_DATA,
    lineSeries: BASIC_LINE_DATA,
    xAxisTitle: 'Time (s)',
    yAxisTitle: 'Value',
    height: 400,
    tooltipFormatter: (params: unknown) => {
      if (Array.isArray(params)) {
        return params
          .map(
            (param: { color: string; seriesName: string; data: number[] }) =>
              `<div style="margin-bottom: 4px;">
                <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${param.color};margin-right:5px;"></span>
                ${param.seriesName}: (${param.data[0].toFixed(1)}, ${param.data[1].toFixed(1)})
              </div>`
          )
          .join('');
      }
      const p = params as { color: string; seriesName: string; data: number[] };
      return `
        <div>
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};margin-right:5px;"></span>
          ${p.seriesName}
        </div>
        <div>X: ${p.data[0].toFixed(1)}</div>
        <div>Y: ${p.data[1].toFixed(1)}</div>
      `;
    },
  },
};

export const DifferentSymbolTypes: Story = {
  args: {
    scatterSeries: [
      {
        name: 'Circle',
        data: generateScatterData(15, [0, 20], [50, 100]).map(([x, y]) => [x, Math.floor(y)]),
        color: '#3b82f6',
        symbol: 'circle',
        symbolSize: 8,
      },
      {
        name: 'Diamond',
        data: generateScatterData(15, [20, 40], [75, 125]).map(([x, y]) => [x, Math.floor(y)]),
        color: '#10b981',
        symbol: 'diamond',
        symbolSize: 10,
      },
      {
        name: 'Triangle',
        data: generateScatterData(15, [40, 60], [100, 150]).map(([x, y]) => [x, Math.floor(y)]),
        color: '#f59e0b',
        symbol: 'triangle',
        symbolSize: 10,
      },
      {
        name: 'Rectangle',
        data: generateScatterData(15, [60, 80], [125, 175]).map(([x, y]) => [x, Math.floor(y)]),
        color: '#ef4444',
        symbol: 'rect',
        symbolSize: 8,
      },
      {
        name: 'Pin',
        data: generateScatterData(15, [80, 100], [150, 200]).map(([x, y]) => [x, Math.floor(y)]),
        color: '#8b5cf6',
        symbol: 'pin',
        symbolSize: 12,
      },
    ],
    xAxisTitle: 'X-Axis',
    yAxisTitle: 'Y-Axis',
    height: 450,
    legendPosition: 'bottom',
  },
};

export const LegendTop: Story = {
  name: 'Legend Position - Top',
  args: {
    scatterSeries: MULTI_SCATTER_DATA,
    lineSeries: [MULTI_LINE_DATA[0]],
    xAxisTitle: 'X-Axis',
    yAxisTitle: 'Y-Axis',
    height: 450,
    legendPosition: 'top',
  },
};

export const LegendRight: Story = {
  name: 'Legend Position - Right',
  args: {
    scatterSeries: MULTI_SCATTER_DATA,
    lineSeries: [MULTI_LINE_DATA[0]],
    xAxisTitle: 'X-Axis',
    yAxisTitle: 'Y-Axis',
    height: 450,
    legendPosition: 'right',
  },
};

export const LegendLeft: Story = {
  name: 'Legend Position - Left',
  args: {
    scatterSeries: MULTI_SCATTER_DATA,
    lineSeries: [MULTI_LINE_DATA[0]],
    xAxisTitle: 'X-Axis',
    yAxisTitle: 'Y-Axis',
    height: 450,
    legendPosition: 'left',
  },
};

export const ScrollableLegend: Story = {
  name: 'Legend Type - Scrollable',
  args: {
    scatterSeries: MULTI_SCATTER_DATA,
    lineSeries: MULTI_LINE_DATA,
    xAxisTitle: 'X-Axis',
    yAxisTitle: 'Y-Axis',
    height: 450,
    legendPosition: 'bottom',
    legendType: 'scroll',
  },
};

export const NoLegend: Story = {
  args: {
    scatterSeries: BASIC_SCATTER_DATA,
    lineSeries: BASIC_LINE_DATA,
    xAxisTitle: 'Time (s)',
    yAxisTitle: 'Value',
    height: 400,
    showLegend: false,
  },
};

export const CustomAxisFormatters: Story = {
  args: {
    scatterSeries: BASIC_SCATTER_DATA,
    lineSeries: BASIC_LINE_DATA,
    xAxisTitle: 'Time (s)',
    yAxisTitle: 'Value',
    height: 400,
    xAxisFormatter: (value: number) => `${value}s`,
    yAxisFormatter: (value: number) => `${value}ms`,
  },
};

export const FixedAxisRanges: Story = {
  args: {
    scatterSeries: BASIC_SCATTER_DATA,
    lineSeries: BASIC_LINE_DATA,
    xAxisTitle: 'Time (s)',
    yAxisTitle: 'Value',
    height: 400,
    xMin: 0,
    xMax: 120,
    yMin: 0,
    yMax: 300,
  },
};

export const SymbolBorders: Story = {
  name: 'Symbol with Borders',
  args: {
    scatterSeries: [
      {
        name: 'Bordered Points',
        data: generateScatterData(30, [0, 100], [50, 200]).map(([x, y]) => [x, Math.floor(y)]),
        color: '#3b82f6',
        symbolSize: 12,
        borderColor: '#1e40af',
        borderWidth: 2,
      },
    ],
    xAxisTitle: 'X-Axis',
    yAxisTitle: 'Y-Axis',
    height: 400,
  },
};

export const LineWithSymbols: Story = {
  name: 'Line Chart with Symbols',
  args: {
    lineSeries: [
      {
        name: 'Line with Circles',
        data: generateLineData(20, [0, 100], x => 100 + x + Math.sin(x / 10) * 20),
        color: '#10b981',
        lineWidth: 2,
        symbol: 'circle',
        symbolSize: 6,
        smooth: true,
      },
    ],
    xAxisTitle: 'Time (s)',
    yAxisTitle: 'Value',
    height: 400,
  },
};

export const NonSmoothLine: Story = {
  name: 'Non-Smooth Line',
  args: {
    scatterSeries: BASIC_SCATTER_DATA,
    lineSeries: [
      {
        name: 'Sharp Line',
        data: BASIC_LINE_DATA[0].data,
        color: '#10b981',
        lineWidth: 2,
        smooth: false,
      },
    ],
    xAxisTitle: 'Time (s)',
    yAxisTitle: 'Value',
    height: 400,
  },
};

export const VariableSymbolSizes: Story = {
  args: {
    scatterSeries: [
      {
        name: 'Variable Size Points',
        data: generateScatterData(40, [0, 100], [50, 200]).map(([x, y]) => [x, Math.floor(y)]),
        color: '#8b5cf6',
        symbolSize: (value: [number, number]) => {
          // Size based on Y value
          return Math.max(4, Math.min(20, value[1] / 10));
        },
      },
    ],
    xAxisTitle: 'X-Axis',
    yAxisTitle: 'Y-Axis',
    height: 400,
  },
};

export const TallChart: Story = {
  args: {
    scatterSeries: MULTI_SCATTER_DATA,
    lineSeries: MULTI_LINE_DATA,
    xAxisTitle: 'X-Axis',
    yAxisTitle: 'Y-Axis',
    height: 700,
    legendPosition: 'bottom',
  },
};

export const CompactChart: Story = {
  args: {
    scatterSeries: [BASIC_SCATTER_DATA[0]],
    lineSeries: [BASIC_LINE_DATA[0]],
    xAxisTitle: 'Time (s)',
    yAxisTitle: 'Value',
    height: 300,
  },
};

export const WithAnimation: Story = {
  args: {
    scatterSeries: BASIC_SCATTER_DATA,
    lineSeries: BASIC_LINE_DATA,
    xAxisTitle: 'Time (s)',
    yAxisTitle: 'Value',
    height: 400,
    animation: true,
    animationDuration: 1000,
  },
};

export const LayeredWithZIndex: Story = {
  name: 'Layered Series (Z-Index)',
  args: {
    scatterSeries: [
      {
        name: 'Background Points',
        data: generateScatterData(50, [0, 100], [50, 200]).map(([x, y]) => [x, Math.floor(y)]),
        color: '#d1d5db',
        symbolSize: 12,
        z: 1,
      },
      {
        name: 'Foreground Points',
        data: generateScatterData(20, [25, 75], [100, 150]).map(([x, y]) => [x, Math.floor(y)]),
        color: '#ef4444',
        symbolSize: 10,
        z: 3,
      },
    ],
    lineSeries: [
      {
        name: 'Mid-layer Line',
        data: generateLineData(50, [0, 100], x => 125 + x * 0.25),
        color: '#3b82f6',
        lineWidth: 3,
        z: 2,
      },
    ],
    xAxisTitle: 'X-Axis',
    yAxisTitle: 'Y-Axis',
    height: 450,
  },
};

export const EmptyData: Story = {
  args: {
    scatterSeries: [],
    lineSeries: [],
    xAxisTitle: 'Time (s)',
    yAxisTitle: 'Value',
    height: 400,
  },
};
