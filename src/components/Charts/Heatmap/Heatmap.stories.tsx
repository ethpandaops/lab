import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, useEffect } from 'react';
import colors from 'tailwindcss/colors';
import { HeatmapChart } from './Heatmap';

const meta: Meta<typeof HeatmapChart> = {
  title: 'Components/Charts/Heatmap',
  component: HeatmapChart,
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-xs bg-surface p-6">
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
    showLabel: {
      control: { type: 'boolean' },
      description: 'Show value labels in cells',
    },
    showVisualMap: {
      control: { type: 'boolean' },
      description: 'Show visual map (color legend)',
    },
    title: {
      control: { type: 'text' },
      description: 'Chart title',
    },
  },
};

export default meta;
type Story = StoryObj<typeof HeatmapChart>;

/**
 * Basic heatmap with sample data
 */
export const Default: Story = {
  args: {
    data: [
      [0, 0, 5],
      [0, 1, 1],
      [0, 2, 0],
      [1, 0, 1],
      [1, 1, 4],
      [1, 2, 3],
      [2, 0, 2],
      [2, 1, 5],
      [2, 2, 3],
    ],
    xLabels: ['a', 'b', 'c'],
    yLabels: ['Morning', 'Afternoon', 'Evening'],
  },
};

/**
 * Heatmap with title
 */
export const WithTitle: Story = {
  args: {
    title: 'Daily Activity',
    data: [
      [0, 0, 5],
      [0, 1, 1],
      [0, 2, 0],
      [1, 0, 1],
      [1, 1, 4],
      [1, 2, 3],
      [2, 0, 2],
      [2, 1, 5],
      [2, 2, 3],
    ],
    xLabels: ['a', 'b', 'c'],
    yLabels: ['Morning', 'Afternoon', 'Evening'],
  },
};

/**
 * Heatmap with value labels
 */
export const WithLabels: Story = {
  args: {
    title: 'Activity Heatmap',
    showLabel: true,
    data: [
      [0, 0, 5],
      [0, 1, 1],
      [0, 2, 0],
      [1, 0, 1],
      [1, 1, 4],
      [1, 2, 3],
      [2, 0, 2],
      [2, 1, 5],
      [2, 2, 3],
    ],
    xLabels: ['a', 'b', 'c'],
    yLabels: ['Morning', 'Afternoon', 'Evening'],
  },
};

/**
 * Weekly activity heatmap
 */
export const WeeklyActivity: Story = {
  args: {
    title: 'Weekly Activity',
    data: [
      [0, 0, 5],
      [0, 1, 1],
      [0, 2, 0],
      [0, 3, 3],
      [0, 4, 8],
      [0, 5, 4],
      [0, 6, 2],
      [1, 0, 7],
      [1, 1, 3],
      [1, 2, 2],
      [1, 3, 5],
      [1, 4, 9],
      [1, 5, 6],
      [1, 6, 3],
      [2, 0, 1],
      [2, 1, 0],
      [2, 2, 0],
      [2, 3, 2],
      [2, 4, 4],
      [2, 5, 7],
      [2, 6, 5],
    ],
    xLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    yLabels: ['Morning', 'Afternoon', 'Evening'],
    showLabel: true,
  },
};

/**
 * Custom color gradient (green theme)
 */
export const CustomColors: Story = {
  args: {
    title: 'Performance Score',
    data: [
      [0, 0, 85],
      [0, 1, 92],
      [0, 2, 78],
      [1, 0, 88],
      [1, 1, 95],
      [1, 2, 90],
      [2, 0, 75],
      [2, 1, 82],
      [2, 2, 88],
    ],
    xLabels: ['Week 1', 'Week 2', 'Week 3'],
    yLabels: ['Team A', 'Team B', 'Team C'],
    colorGradient: [colors.green[100], colors.green[300], colors.green[500], colors.green[700]],
    showLabel: true,
  },
};

/**
 * Custom color gradient (red/orange theme)
 */
export const HeatIntensity: Story = {
  args: {
    title: 'Server Load',
    data: [
      [0, 0, 20],
      [0, 1, 45],
      [0, 2, 80],
      [0, 3, 95],
      [1, 0, 15],
      [1, 1, 35],
      [1, 2, 70],
      [1, 3, 88],
      [2, 0, 30],
      [2, 1, 55],
      [2, 2, 85],
      [2, 3, 92],
    ],
    xLabels: ['00:00', '06:00', '12:00', '18:00'],
    yLabels: ['Server 1', 'Server 2', 'Server 3'],
    colorGradient: [colors.amber[100], colors.amber[400], colors.orange[500], colors.red[600]],
    showLabel: true,
  },
};

/**
 * Large dataset - Monthly activity
 */
export const MonthlyActivity: Story = {
  render: () => {
    // Generate data for each hour of each day of a week
    const hours = 24;
    const days = 7;
    const data: [number, number, number][] = [];

    for (let day = 0; day < days; day++) {
      for (let hour = 0; hour < hours; hour++) {
        // Simulate higher activity during work hours (9-17)
        const isWorkHour = hour >= 9 && hour <= 17;
        const isWeekend = day === 5 || day === 6;
        const baseValue = isWorkHour && !isWeekend ? 50 : 10;
        const value = Math.round(baseValue + Math.random() * 30);
        data.push([hour, day, value]);
      }
    }

    const hourLabels = Array.from({ length: hours }, (_, i) => `${i}:00`);
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
      <HeatmapChart
        title="Weekly Activity Pattern"
        data={data}
        xLabels={hourLabels}
        yLabels={dayLabels}
        height={400}
        colorGradient={[colors.sky[50], colors.sky[300], colors.sky[500], colors.sky[700]]}
      />
    );
  },
};

/**
 * GitHub-style contribution graph
 */
export const GitHubContributions: Story = {
  render: () => {
    // Generate 52 weeks of contribution data
    const weeks = 52;
    const daysPerWeek = 7;
    const data: [number, number, number][] = [];

    for (let week = 0; week < weeks; week++) {
      for (let day = 0; day < daysPerWeek; day++) {
        // Random contributions with some days having no contributions
        const value = Math.random() > 0.3 ? Math.floor(Math.random() * 20) : 0;
        data.push([week, day, value]);
      }
    }

    const weekLabels = Array.from({ length: weeks }, (_, i) => {
      const month = Math.floor((i * 7) / 30);
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return i % 4 === 0 ? months[month % 12] : '';
    });
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <HeatmapChart
        title="Contribution Activity"
        data={data}
        xLabels={weekLabels}
        yLabels={dayLabels}
        height={300}
        colorGradient={[colors.gray[200], colors.green[300], colors.green[500], colors.green[600], colors.green[700]]}
        showVisualMap={false}
      />
    );
  },
};

/**
 * Custom value formatter
 */
export const WithFormatter: Story = {
  args: {
    title: 'Temperature Map',
    data: [
      [0, 0, 18.5],
      [0, 1, 22.3],
      [0, 2, 25.8],
      [1, 0, 17.2],
      [1, 1, 21.5],
      [1, 2, 24.9],
      [2, 0, 19.1],
      [2, 1, 23.4],
      [2, 2, 26.7],
    ],
    xLabels: ['City A', 'City B', 'City C'],
    yLabels: ['Morning', 'Noon', 'Evening'],
    showLabel: true,
    formatValue: (value: number) => `${value.toFixed(1)}°C`,
    colorGradient: [colors.blue[100], colors.blue[300], colors.blue[500], colors.blue[700]],
  },
};

/**
 * Compact heatmap
 */
export const Compact: Story = {
  args: {
    title: 'Quick Overview',
    height: 250,
    data: [
      [0, 0, 3],
      [0, 1, 5],
      [1, 0, 2],
      [1, 1, 8],
    ],
    xLabels: ['Q1', 'Q2'],
    yLabels: ['Sales', 'Growth'],
    showLabel: true,
  },
};

/**
 * Animated: Real-time heatmap updates
 */
export const AnimatedRealtime: Story = {
  render: () => {
    const [data, setData] = useState<[number, number, number][]>(() => {
      const initial: [number, number, number][] = [];
      for (let x = 0; x < 10; x++) {
        for (let y = 0; y < 5; y++) {
          initial.push([x, y, Math.floor(Math.random() * 100)]);
        }
      }
      return initial;
    });

    useEffect(() => {
      const interval = setInterval(() => {
        setData(prev => {
          // Update 5 random cells
          const newData = [...prev];
          for (let i = 0; i < 5; i++) {
            const randomIndex = Math.floor(Math.random() * newData.length);
            const [x, y] = newData[randomIndex];
            newData[randomIndex] = [x, y, Math.floor(Math.random() * 100)];
          }
          return newData;
        });
      }, 500);

      return () => {
        clearInterval(interval);
      };
    }, []);

    return (
      <HeatmapChart
        title="Live Server Metrics"
        data={data}
        xLabels={Array.from({ length: 10 }, (_, i) => `Node ${i + 1}`)}
        yLabels={['CPU', 'Memory', 'Disk', 'Network', 'Load']}
        height={400}
        colorGradient={[colors.green[100], colors.yellow[200], colors.orange[300], colors.red[400]]}
      />
    );
  },
};

/**
 * Without visual map legend
 */
export const NoLegend: Story = {
  args: {
    title: 'Simple Heatmap',
    showVisualMap: false,
    showLabel: true,
    data: [
      [0, 0, 5],
      [0, 1, 1],
      [0, 2, 0],
      [1, 0, 1],
      [1, 1, 4],
      [1, 2, 3],
      [2, 0, 2],
      [2, 1, 5],
      [2, 2, 3],
    ],
    xLabels: ['a', 'b', 'c'],
    yLabels: ['Morning', 'Afternoon', 'Evening'],
  },
};

/**
 * Heatmap with no-data sentinel cells rendered in a distinct empty color.
 * Cells with value -1 are treated as "no data" and rendered separately
 * from the color gradient, using a dual visualMap + series approach.
 */
export const WithEmptyData: Story = {
  args: {
    title: 'Sparse Data with Gaps',
    data: [
      [0, 0, 5],
      [0, 1, -1],
      [0, 2, 3],
      [1, 0, -1],
      [1, 1, 4],
      [1, 2, -1],
      [2, 0, 2],
      [2, 1, -1],
      [2, 2, 8],
      [3, 0, -1],
      [3, 1, 6],
      [3, 2, 1],
      [4, 0, 7],
      [4, 1, -1],
      [4, 2, -1],
    ],
    xLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    yLabels: ['Morning', 'Afternoon', 'Evening'],
    emptyColor: colors.gray[800],
    showLabel: true,
    showCellBorders: true,
    visualMapText: ['High', 'Low'],
  },
};

/**
 * Row highlight band using markArea. The `highlightedRow` prop
 * draws a semi-transparent band behind the specified y-axis row.
 */
export const HighlightedRow: Story = {
  render: () => {
    const [highlighted, setHighlighted] = useState(1);
    const yLabels = ['Server 1', 'Server 2', 'Server 3', 'Server 4'];
    const xLabels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'];

    const data: [number, number, number][] = [];
    for (let x = 0; x < xLabels.length; x++) {
      for (let y = 0; y < yLabels.length; y++) {
        data.push([x, y, Math.floor(Math.random() * 100)]);
      }
    }

    return (
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          {yLabels.map((label, i) => (
            <button
              key={label}
              className={`rounded-xs px-3 py-1 text-sm ${
                highlighted === i ? 'bg-primary text-white' : 'bg-surface text-foreground'
              }`}
              onClick={() => setHighlighted(i)}
            >
              {label}
            </button>
          ))}
        </div>
        <HeatmapChart
          title="Server Load (click to highlight)"
          data={data}
          xLabels={xLabels}
          yLabels={yLabels}
          height={300}
          highlightedRow={highlighted}
          colorGradient={[colors.green[100], colors.yellow[300], colors.red[500]]}
          showLabel={true}
          visualMapText={['100%', '0%']}
        />
      </div>
    );
  },
};

/**
 * Inverted y-axis so the first label appears at the top.
 */
export const InversedYAxis: Story = {
  args: {
    title: 'Validators (top-down)',
    yAxisInverse: true,
    showLabel: true,
    data: [
      [0, 0, 100],
      [0, 1, 95],
      [0, 2, 88],
      [0, 3, 72],
      [1, 0, 98],
      [1, 1, 90],
      [1, 2, 85],
      [1, 3, 60],
      [2, 0, 100],
      [2, 1, 92],
      [2, 2, 78],
      [2, 3, 55],
    ],
    xLabels: ['Epoch 1', 'Epoch 2', 'Epoch 3'],
    yLabels: ['Validator 0', 'Validator 1', 'Validator 2', 'Validator 3'],
    colorGradient: [colors.red[400], colors.yellow[300], colors.green[500]],
    visualMapText: ['100%', '0%'],
  },
};

/**
 * Rotated x-axis labels for long label text or dense axes.
 */
export const RotatedLabels: Story = {
  args: {
    title: 'Rotated X-Axis Labels',
    xAxisLabelRotate: 45,
    grid: { bottom: 80 },
    data: [
      [0, 0, 3],
      [0, 1, 7],
      [1, 0, 5],
      [1, 1, 2],
      [2, 0, 8],
      [2, 1, 4],
      [3, 0, 1],
      [3, 1, 9],
      [4, 0, 6],
      [4, 1, 3],
    ],
    xLabels: ['2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04', '2025-01-05'],
    yLabels: ['Metric A', 'Metric B'],
    showLabel: true,
    xAxisInterval: 0,
  },
};

/**
 * Piecewise visual map with discrete color ranges instead of a continuous gradient.
 */
export const PiecewiseVisualMap: Story = {
  args: {
    title: 'Latency Buckets',
    visualMapType: 'piecewise',
    piecewisePieces: [
      { min: 0, max: 100, color: colors.green[500], label: '< 100ms' },
      { min: 100, max: 500, color: colors.yellow[400], label: '100-500ms' },
      { min: 500, max: 1000, color: colors.orange[500], label: '500ms-1s' },
      { min: 1000, color: colors.red[500], label: '> 1s' },
    ],
    data: [
      [0, 0, 50],
      [0, 1, 120],
      [0, 2, 800],
      [1, 0, 200],
      [1, 1, 90],
      [1, 2, 1500],
      [2, 0, 300],
      [2, 1, 600],
      [2, 2, 45],
      [3, 0, 1200],
      [3, 1, 80],
      [3, 2, 350],
    ],
    xLabels: ['Node A', 'Node B', 'Node C', 'Node D'],
    yLabels: ['P50', 'P95', 'P99'],
    showLabel: true,
    formatValue: (value: number) => (value >= 1000 ? `${(value / 1000).toFixed(1)}s` : `${value}ms`),
  },
};

/**
 * Cell borders and custom border configuration for visual cell separation.
 */
export const CellBorders: Story = {
  args: {
    title: 'With Cell Borders',
    showCellBorders: true,
    showLabel: true,
    data: [
      [0, 0, 5],
      [0, 1, 1],
      [0, 2, 0],
      [1, 0, 1],
      [1, 1, 4],
      [1, 2, 3],
      [2, 0, 2],
      [2, 1, 5],
      [2, 2, 3],
    ],
    xLabels: ['a', 'b', 'c'],
    yLabels: ['Morning', 'Afternoon', 'Evening'],
  },
};

/**
 * Axis titles and min/max-only axis labels for compact layouts.
 */
export const AxisTitlesAndMinMax: Story = {
  render: () => {
    const xLabels = Array.from({ length: 20 }, (_, i) => `${i}`);
    const yLabels = Array.from({ length: 10 }, (_, i) => `V${i}`);

    const data: [number, number, number][] = [];
    for (let x = 0; x < xLabels.length; x++) {
      for (let y = 0; y < yLabels.length; y++) {
        data.push([x, y, Math.floor(Math.random() * 12)]);
      }
    }

    return (
      <HeatmapChart
        title="Slot Time Distribution"
        data={data}
        xLabels={xLabels}
        yLabels={yLabels}
        xAxisTitle="Slot"
        yAxisTitle="Validator Index"
        xAxisShowOnlyMinMax
        yAxisShowOnlyMinMax
        height={400}
        visualMapText={['12s', '0s']}
        grid={{ left: 80 }}
      />
    );
  },
};

/**
 * Click events on heatmap cells. Open the browser console to see event output.
 */
export const WithClickEvents: Story = {
  render: () => {
    const [lastClick, setLastClick] = useState<string>('Click a cell...');
    const xLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const yLabels = ['Morning', 'Afternoon', 'Evening'];

    const data: [number, number, number][] = [
      [0, 0, 5],
      [0, 1, 1],
      [0, 2, 3],
      [1, 0, 2],
      [1, 1, 4],
      [1, 2, 7],
      [2, 0, 6],
      [2, 1, 3],
      [2, 2, 1],
      [3, 0, 8],
      [3, 1, 2],
      [3, 2, 5],
      [4, 0, 4],
      [4, 1, 6],
      [4, 2, 9],
    ];

    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-xs bg-background px-4 py-2 font-mono text-sm text-muted">{lastClick}</div>
        <HeatmapChart
          title="Clickable Heatmap"
          data={data}
          xLabels={xLabels}
          yLabels={yLabels}
          height={300}
          emphasisDisabled={false}
          onEvents={{
            click: (params: Record<string, unknown>) => {
              const value = params.value as [number, number, number];
              setLastClick(`Clicked: ${xLabels[value[0]]} ${yLabels[value[1]]} = ${value[2]}`);
            },
          }}
        />
      </div>
    );
  },
};
