import type { Meta, StoryObj } from '@storybook/react-vite';
import colors from 'tailwindcss/colors';
import { MultiLineChart } from './MultiLine';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatSlot } from '@/utils';

const meta: Meta<typeof MultiLineChart> = {
  title: 'Components/Charts/MultiLine',
  component: MultiLineChart,
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
    showLegend: {
      control: { type: 'boolean' },
      description: 'Show interactive legend with toggle buttons for each series',
    },
    showCard: {
      control: { type: 'boolean' },
      description: 'Wrap chart in a card container with title and subtitle',
    },
    enableDataZoom: {
      control: { type: 'boolean' },
      description: 'Enable zoom and pan controls',
    },
    title: {
      control: { type: 'text' },
      description: 'Chart title',
    },
    subtitle: {
      control: { type: 'text' },
      description: 'Chart subtitle (only shown when using card wrapper)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof MultiLineChart>;

// ==========================
// BASIC EXAMPLES
// ==========================

/**
 * Basic single series chart
 */
export const Basic: Story = {
  render: () => {
    const themeColors = useThemeColors();
    return (
      <MultiLineChart
        series={[
          {
            name: 'Sales',
            data: [820, 932, 901, 934, 1290, 1330, 1320],
            color: themeColors.primary,
          },
        ]}
        xAxis={{
          type: 'category',
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        }}
        yAxis={{
          name: 'Amount',
        }}
        title="Weekly Sales"
        height={300}
      />
    );
  },
};

/**
 * Multiple series with interactive legend
 */
export const MultipleSeries: Story = {
  render: () => {
    const themeColors = useThemeColors();
    return (
      <MultiLineChart
        series={[
          {
            name: 'Revenue',
            data: [120, 200, 150, 80, 70, 110, 130],
            color: themeColors.primary,
          },
          {
            name: 'Costs',
            data: [90, 140, 100, 120, 80, 90, 100],
            color: themeColors.accent,
          },
          {
            name: 'Profit',
            data: [30, 60, 50, -40, -10, 20, 30],
            color: '#10b981',
          },
        ]}
        xAxis={{
          type: 'category',
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        }}
        yAxis={{
          name: 'Amount ($K)',
        }}
        title="Weekly Financial Data"
        showLegend={true}
        height={300}
      />
    );
  },
};

/**
 * Card wrapper with title, subtitle, and legend
 */
export const CardWrapper: Story = {
  render: () => {
    const themeColors = useThemeColors();
    return (
      <MultiLineChart
        series={[
          {
            name: 'Revenue',
            data: [120, 200, 150, 80, 70, 110, 130],
            color: themeColors.primary,
          },
          {
            name: 'Costs',
            data: [90, 140, 100, 120, 80, 90, 100],
            color: themeColors.accent,
          },
          {
            name: 'Profit',
            data: [30, 60, 50, -40, -10, 20, 30],
            color: '#10b981',
          },
        ]}
        xAxis={{
          type: 'category',
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        }}
        yAxis={{
          name: 'Amount ($K)',
        }}
        title="Financial Overview"
        subtitle="Revenue, costs, and profit across the week"
        showCard={true}
        showLegend={true}
        height={300}
      />
    );
  },
};

// ==========================
// AXIS CONFIGURATION
// ==========================

/**
 * Value-based x-axis with [x, y] data points
 */
export const ValueAxis: Story = {
  render: () => {
    const themeColors = useThemeColors();
    return (
      <MultiLineChart
        series={[
          {
            name: 'Node 1',
            data: [
              [100, 245],
              [101, 238],
              [102, 252],
              [103, 241],
              [104, 239],
              [105, 248],
            ],
            color: themeColors.primary,
            showSymbol: true,
            symbolSize: 6,
          },
          {
            name: 'Node 2',
            data: [
              [100, 278],
              [101, 265],
              [102, 281],
              [103, 272],
              [104, 269],
              [105, 275],
            ],
            color: themeColors.accent,
            showSymbol: true,
            symbolSize: 6,
          },
          {
            name: 'Node 3',
            data: [
              [100, 312],
              [101, 298],
              [102, 305],
              [103, 301],
              [104, 308],
              [105, 295],
            ],
            color: '#10b981',
            showSymbol: true,
            symbolSize: 6,
          },
        ]}
        xAxis={{
          type: 'value',
          name: 'Slot',
          min: 99,
          max: 106,
        }}
        yAxis={{
          name: 'Latency (ms)',
        }}
        title="Block Propagation Latency"
        subtitle="Average time from slot start until block first seen by each node"
        showCard={true}
        showLegend={true}
        enableDataZoom={true}
        height={300}
      />
    );
  },
};

/**
 * Custom axis formatters for dates and currency
 */
export const AxisFormatters: Story = {
  render: () => {
    const themeColors = useThemeColors();
    const dataPoints: Array<[number, number]> = [
      [1704067200000, 125000], // Jan 2024
      [1706745600000, 185000], // Feb 2024
      [1709251200000, 165000], // Mar 2024
      [1711929600000, 210000], // Apr 2024
      [1714521600000, 195000], // May 2024
      [1717200000000, 240000], // Jun 2024
    ];

    return (
      <MultiLineChart
        series={[
          {
            name: 'Revenue',
            data: dataPoints,
            color: themeColors.primary,
          },
          {
            name: 'Target',
            data: [
              [1704067200000, 150000],
              [1706745600000, 160000],
              [1709251200000, 170000],
              [1711929600000, 180000],
              [1714521600000, 190000],
              [1717200000000, 200000],
            ],
            color: themeColors.muted,
            lineStyle: 'dashed',
          },
        ]}
        xAxis={{
          type: 'value',
          name: 'Month',
          min: dataPoints[0][0],
          max: dataPoints[dataPoints.length - 1][0],
          formatter: (value: number | string) => {
            const date = new Date(value as number);
            return date.toLocaleDateString('en-US', { month: 'short' });
          },
        }}
        yAxis={{
          name: 'Revenue',
          formatter: (value: number) => {
            return `$${(value / 1000).toFixed(0)}K`;
          },
        }}
        title="Monthly Revenue"
        showCard={true}
        showLegend={true}
        height={300}
      />
    );
  },
};

// ==========================
// VISUAL CUSTOMIZATION
// ==========================

/**
 * Area charts with gradient fills
 */
export const AreaChart: Story = {
  render: () => {
    const themeColors = useThemeColors();
    return (
      <MultiLineChart
        series={[
          {
            name: 'Product A',
            data: [30, 45, 60, 55, 70, 85, 90],
            color: themeColors.primary,
            showArea: true,
          },
          {
            name: 'Product B',
            data: [20, 35, 40, 45, 50, 55, 60],
            color: themeColors.accent,
            showArea: true,
          },
        ]}
        xAxis={{
          type: 'category',
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
        }}
        yAxis={{
          name: 'Sales Units',
        }}
        title="Product Sales Comparison"
        subtitle="Monthly sales performance with area visualization"
        showCard={true}
        showLegend={true}
        height={300}
      />
    );
  },
};

/**
 * Smooth curved lines
 */
export const SmoothLines: Story = {
  render: () => {
    const themeColors = useThemeColors();
    return (
      <MultiLineChart
        series={[
          {
            name: 'Temperature',
            data: [18, 20, 19, 22, 25, 23, 21],
            color: themeColors.primary,
            smooth: 0.4,
            showArea: true,
          },
          {
            name: 'Humidity',
            data: [60, 65, 58, 70, 68, 72, 66],
            color: themeColors.accent,
            smooth: 0.4,
          },
        ]}
        xAxis={{
          type: 'category',
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        }}
        yAxis={{
          name: 'Value',
        }}
        title="Weather Data"
        showLegend={true}
        height={300}
      />
    );
  },
};

/**
 * Different line styles (solid, dashed, dotted)
 */
export const LineStyles: Story = {
  render: () => {
    const themeColors = useThemeColors();
    return (
      <MultiLineChart
        series={[
          {
            name: 'Measured',
            data: [100, 120, 115, 134, 140, 145, 150],
            color: themeColors.primary,
            lineWidth: 3,
            lineStyle: 'solid',
          },
          {
            name: 'Target',
            data: [110, 115, 120, 130, 135, 140, 145],
            color: themeColors.accent,
            lineWidth: 2,
            lineStyle: 'dashed',
          },
          {
            name: 'Upper Bound',
            data: [120, 130, 125, 144, 150, 155, 160],
            color: themeColors.muted,
            lineWidth: 1,
            lineStyle: 'dotted',
          },
        ]}
        xAxis={{
          type: 'category',
          labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6', 'Week 7'],
        }}
        yAxis={{
          name: 'Performance',
        }}
        title="Performance Tracking"
        showCard={true}
        showLegend={true}
        height={300}
      />
    );
  },
};

/**
 * Different symbol sizes and line widths
 */
export const SymbolsAndWidths: Story = {
  render: () => {
    const themeColors = useThemeColors();
    return (
      <MultiLineChart
        series={[
          {
            name: 'Primary',
            data: [
              [100, 245],
              [101, 238],
              [102, 252],
              [103, 241],
              [104, 239],
            ],
            color: themeColors.primary,
            showSymbol: true,
            symbolSize: 8,
            lineWidth: 4,
          },
          {
            name: 'Secondary',
            data: [
              [100, 278],
              [101, 265],
              [102, 281],
              [103, 272],
              [104, 269],
            ],
            color: themeColors.accent,
            showSymbol: true,
            symbolSize: 6,
            lineWidth: 2,
          },
          {
            name: 'Tertiary',
            data: [
              [100, 312],
              [101, 298],
              [102, 305],
              [103, 301],
              [104, 308],
            ],
            color: '#10b981',
            showSymbol: true,
            symbolSize: 4,
            lineWidth: 1,
          },
        ]}
        xAxis={{
          type: 'value',
          name: 'Slot',
          min: 100,
          max: 104,
        }}
        yAxis={{
          name: 'Latency (ms)',
        }}
        title="Different Line Widths & Symbol Sizes"
        showCard={true}
        showLegend={true}
        height={300}
      />
    );
  },
};

/**
 * Custom color palette
 */
export const CustomColors: Story = {
  render: () => {
    const warmPalette = [colors.red[500], colors.orange[500], colors.amber[500], colors.yellow[500], colors.rose[500]];

    return (
      <MultiLineChart
        series={[
          { name: 'Series 1', data: [30, 45, 60, 55, 70, 85, 90] },
          { name: 'Series 2', data: [20, 35, 40, 45, 50, 55, 60] },
          { name: 'Series 3', data: [40, 50, 45, 60, 65, 70, 75] },
          { name: 'Series 4', data: [25, 30, 35, 40, 45, 50, 55] },
          { name: 'Series 5', data: [50, 55, 50, 65, 70, 75, 80] },
        ]}
        xAxis={{
          type: 'category',
          labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        }}
        yAxis={{
          name: 'Value',
        }}
        title="Custom Warm Palette"
        subtitle="Using a custom color palette instead of theme colors"
        colorPalette={warmPalette}
        showCard={true}
        showLegend={true}
        height={300}
      />
    );
  },
};

// ==========================
// ADVANCED
// ==========================

/**
 * Many series with zoom and pan
 */
export const ManySeries: Story = {
  render: () => {
    const themeColors = useThemeColors();
    const palette = [
      themeColors.primary,
      themeColors.accent,
      '#10b981',
      '#f59e0b',
      '#8b5cf6',
      '#ec4899',
      '#06b6d4',
      '#f43f5e',
    ];

    const startSlot = 1000;
    const slotCount = 100;

    return (
      <MultiLineChart
        series={Array.from({ length: 8 }, (_, nodeIdx) => ({
          name: `Node ${nodeIdx + 1}`,
          data: Array.from({ length: slotCount }, (_, slotIdx) => {
            const slot = startSlot + slotIdx;
            const baseLatency = 200 + nodeIdx * 30;
            const variance = Math.sin(slotIdx * nodeIdx * 0.3) * 20;
            return [slot, Math.round(baseLatency + variance)] as [number, number];
          }),
          color: palette[nodeIdx],
          showSymbol: false,
          lineWidth: 2,
        }))}
        xAxis={{
          type: 'value',
          name: 'Slot',
          min: startSlot,
          max: startSlot + slotCount - 1,
          formatter: (value: number | string) => value.toLocaleString(),
        }}
        yAxis={{
          name: 'Latency (ms)',
        }}
        title="Multi-Series Latency Tracking"
        subtitle="8 series with zoom and pan enabled"
        showCard={true}
        showLegend={true}
        enableDataZoom={true}
        height={500}
      />
    );
  },
};

/**
 * Handling null values and gaps in data
 */
export const NullHandling: Story = {
  render: () => {
    const themeColors = useThemeColors();
    return (
      <MultiLineChart
        series={[
          {
            name: 'Series A',
            data: [100, 120, null, 140, 135, null, 150],
            color: themeColors.primary,
          },
          {
            name: 'Series B',
            data: [90, null, 110, 120, null, 140, 145],
            color: themeColors.accent,
          },
        ]}
        xAxis={{
          type: 'category',
          labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'],
        }}
        yAxis={{
          name: 'Value',
        }}
        title="Data with Missing Values"
        showLegend={true}
        connectNulls={false}
        height={300}
      />
    );
  },
};

/**
 * Custom tooltip formatter
 */
export const CustomTooltip: Story = {
  render: () => {
    const themeColors = useThemeColors();
    return (
      <MultiLineChart
        series={[
          {
            name: 'Lighthouse',
            data: [
              [1000, 245],
              [1001, 238],
              [1002, 252],
            ],
            color: themeColors.primary,
            showSymbol: true,
          },
          {
            name: 'Prysm',
            data: [
              [1000, 278],
              [1001, 265],
              [1002, 281],
            ],
            color: themeColors.accent,
            showSymbol: true,
          },
        ]}
        xAxis={{
          type: 'value',
          name: 'Slot',
          min: 1000,
          max: 1002,
        }}
        yAxis={{
          name: 'Latency (ms)',
        }}
        title="Consensus Client Latency"
        showLegend={true}
        tooltipFormatter={(params: unknown) => {
          if (!params || !Array.isArray(params) || params.length === 0) return '';
          const slot = params[0].axisValue;
          let html = `<strong>Slot:</strong> ${formatSlot(slot)}<br/>`;
          params.forEach((param: { data: [number, number]; color: string; seriesName: string }) => {
            const latency = param.data[1];
            html += `<span style="color:${param.color}">●</span> ${param.seriesName}: ${latency.toFixed(0)}ms<br/>`;
          });
          return html;
        }}
        height={300}
      />
    );
  },
};

/**
 * Hover emphasis with small symbols that enlarge on hover
 * Perfect for dense time series data - keeps charts clean while maintaining tooltip functionality
 */
export const EmphasisHover: Story = {
  render: () => {
    const themeColors = useThemeColors();
    const palette = [themeColors.primary, themeColors.accent, '#10b981', '#f59e0b', '#8b5cf6'];

    const startSlot = 1000;
    const slotCount = 30;

    return (
      <MultiLineChart
        series={Array.from({ length: 5 }, (_, nodeIdx) => ({
          name: `Node ${nodeIdx + 1}`,
          data: Array.from({ length: slotCount }, (_, slotIdx) => {
            const slot = startSlot + slotIdx;
            const baseLatency = 200 + nodeIdx * 20;
            const variance = Math.sin(slotIdx * nodeIdx * 0.3) * 15;
            return [slot, Math.round(baseLatency + variance)] as [number, number];
          }),
          color: palette[nodeIdx],
          showSymbol: true,
          symbolSize: 2,
          lineWidth: 2,
          emphasis: {
            focus: 'series',
            symbolSize: 6,
          },
        }))}
        xAxis={{
          type: 'value',
          name: 'Slot',
          min: startSlot,
          max: startSlot + slotCount - 1,
          formatter: (value: number | string) => value.toLocaleString(),
        }}
        yAxis={{
          name: 'Latency (ms)',
        }}
        title="Hover Emphasis Example"
        subtitle="Tiny symbols (size 2) enlarge to size 6 on hover with series highlighting"
        showCard={true}
        showLegend={true}
        enableDataZoom={true}
        tooltipTrigger="item"
        height={400}
      />
    );
  },
};
