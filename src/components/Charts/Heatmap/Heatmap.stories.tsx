import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, useEffect } from 'react';
import { Heatmap } from './Heatmap';

const meta: Meta<typeof Heatmap> = {
  title: 'Components/Charts/Heatmap',
  component: Heatmap,
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
    title: {
      control: { type: 'text' },
      description: 'Chart title',
    },
    min: {
      control: { type: 'number' },
      description: 'Minimum value for color scale',
    },
    max: {
      control: { type: 'number' },
      description: 'Maximum value for color scale',
    },
    showValues: {
      control: { type: 'boolean' },
      description: 'Show values in cells',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Heatmap>;

/**
 * Basic heatmap with simple 3x3 grid
 */
export const Default: Story = {
  args: {
    data: [
      [0, 0, 5],
      [0, 1, 1],
      [0, 2, 0],
      [1, 0, 1],
      [1, 1, 7],
      [1, 2, 2],
      [2, 0, 3],
      [2, 1, 2],
      [2, 2, 6],
    ],
    xAxisLabels: ['A', 'B', 'C'],
    yAxisLabels: ['X', 'Y', 'Z'],
  },
};

/**
 * Heatmap with title
 */
export const WithTitle: Story = {
  args: {
    title: 'Activity Heatmap',
    data: [
      [0, 0, 5],
      [0, 1, 1],
      [0, 2, 0],
      [1, 0, 1],
      [1, 1, 7],
      [1, 2, 2],
      [2, 0, 3],
      [2, 1, 2],
      [2, 2, 6],
    ],
    xAxisLabels: ['Mon', 'Tue', 'Wed'],
    yAxisLabels: ['Morning', 'Afternoon', 'Evening'],
  },
};

/**
 * Weekly activity heatmap (7 days x 24 hours)
 */
export const WeeklyActivity: Story = {
  args: {
    title: 'Weekly User Activity',
    data: (() => {
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const hours = Array.from({ length: 24 }, (_, i) => i);
      const data: [number, number, number][] = [];

      days.forEach((_, dayIdx) => {
        hours.forEach(hour => {
          // Simulate activity patterns: higher during work hours on weekdays
          let value = Math.random() * 10;
          if (dayIdx < 5 && hour >= 9 && hour <= 17) {
            // Weekday work hours
            value += Math.random() * 40;
          } else if (hour >= 18 && hour <= 22) {
            // Evening activity
            value += Math.random() * 20;
          }
          data.push([dayIdx, hour, Math.round(value)]);
        });
      });

      return data;
    })(),
    xAxisLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    yAxisLabels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    height: 600,
  },
};

/**
 * Monthly calendar heatmap showing contribution activity
 */
export const MonthlyContributions: Story = {
  args: {
    title: 'Monthly Contributions',
    data: (() => {
      const weeks = 5;
      const days = 7;
      const data: [number, number, number][] = [];

      for (let week = 0; week < weeks; week++) {
        for (let day = 0; day < days; day++) {
          // Simulate contribution patterns: less on weekends
          const isWeekend = day === 0 || day === 6;
          const value = isWeekend ? Math.random() * 3 : Math.random() * 10;
          data.push([week, day, Math.round(value)]);
        }
      }

      return data;
    })(),
    xAxisLabels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5'],
    yAxisLabels: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    height: 400,
  },
};

/**
 * Correlation matrix between variables
 */
export const CorrelationMatrix: Story = {
  args: {
    title: 'Feature Correlation Matrix',
    data: [
      [0, 0, 1.0],
      [0, 1, 0.8],
      [0, 2, 0.3],
      [0, 3, 0.1],
      [0, 4, -0.2],
      [1, 0, 0.8],
      [1, 1, 1.0],
      [1, 2, 0.6],
      [1, 3, 0.2],
      [1, 4, -0.1],
      [2, 0, 0.3],
      [2, 1, 0.6],
      [2, 2, 1.0],
      [2, 3, 0.7],
      [2, 4, 0.4],
      [3, 0, 0.1],
      [3, 1, 0.2],
      [3, 2, 0.7],
      [3, 3, 1.0],
      [3, 4, 0.5],
      [4, 0, -0.2],
      [4, 1, -0.1],
      [4, 2, 0.4],
      [4, 3, 0.5],
      [4, 4, 1.0],
    ],
    xAxisLabels: ['Feature A', 'Feature B', 'Feature C', 'Feature D', 'Feature E'],
    yAxisLabels: ['Feature A', 'Feature B', 'Feature C', 'Feature D', 'Feature E'],
    min: -1,
    max: 1,
    valueFormatter: value => value.toFixed(2),
    height: 500,
  },
};

/**
 * Heatmap with custom colors (red-yellow-green gradient)
 */
export const CustomColors: Story = {
  args: {
    title: 'Server Response Times (ms)',
    data: (() => {
      const servers = 6;
      const timeSlots = 12;
      const data: [number, number, number][] = [];

      for (let server = 0; server < servers; server++) {
        for (let time = 0; time < timeSlots; time++) {
          const value = 50 + Math.random() * 200;
          data.push([time, server, Math.round(value)]);
        }
      }

      return data;
    })(),
    xAxisLabels: Array.from({ length: 12 }, (_, i) => `${i * 2}:00`),
    yAxisLabels: ['Server 1', 'Server 2', 'Server 3', 'Server 4', 'Server 5', 'Server 6'],
    colors: ['#10b981', '#fbbf24', '#ef4444'], // green-yellow-red
    valueFormatter: value => `${value}ms`,
    height: 400,
  },
};

/**
 * Sparse heatmap with missing data points
 */
export const SparseData: Story = {
  args: {
    title: 'Event Occurrences',
    data: [
      [0, 0, 5],
      [0, 3, 2],
      [1, 1, 8],
      [1, 4, 3],
      [2, 0, 1],
      [2, 2, 6],
      [3, 1, 4],
      [3, 3, 7],
      [4, 2, 9],
      [4, 4, 2],
    ],
    xAxisLabels: ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'],
    yAxisLabels: ['Region A', 'Region B', 'Region C', 'Region D', 'Region E'],
    height: 400,
  },
};

/**
 * Heatmap without cell values
 */
export const WithoutValues: Story = {
  args: {
    title: 'Temperature Distribution',
    data: (() => {
      const rows = 10;
      const cols = 15;
      const data: [number, number, number][] = [];

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const value = 15 + Math.sin(row / 2) * 10 + Math.cos(col / 3) * 8 + Math.random() * 5;
          data.push([col, row, Math.round(value * 10) / 10]);
        }
      }

      return data;
    })(),
    xAxisLabels: Array.from({ length: 15 }, (_, i) => `X${i}`),
    yAxisLabels: Array.from({ length: 10 }, (_, i) => `Y${i}`),
    showValues: false,
    height: 500,
  },
};

/**
 * Large heatmap with many data points
 */
export const LargeDataset: Story = {
  args: {
    title: 'Sensor Grid (20x30)',
    data: (() => {
      const rows = 20;
      const cols = 30;
      const data: [number, number, number][] = [];

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const value = Math.sin(row / 3) * Math.cos(col / 4) * 50 + 50 + Math.random() * 10;
          data.push([col, row, Math.round(value)]);
        }
      }

      return data;
    })(),
    xAxisLabels: Array.from({ length: 30 }, (_, i) => `${i}`),
    yAxisLabels: Array.from({ length: 20 }, (_, i) => `${i}`),
    showValues: false,
    height: 600,
  },
};

/**
 * Compact heatmap
 */
export const Compact: Story = {
  args: {
    title: 'Status Matrix',
    data: [
      [0, 0, 1],
      [0, 1, 0],
      [0, 2, 1],
      [0, 3, 1],
      [1, 0, 1],
      [1, 1, 1],
      [1, 2, 0],
      [1, 3, 1],
      [2, 0, 0],
      [2, 1, 1],
      [2, 2, 1],
      [2, 3, 0],
      [3, 0, 1],
      [3, 1, 1],
      [3, 2, 1],
      [3, 3, 1],
    ],
    xAxisLabels: ['Service A', 'Service B', 'Service C', 'Service D'],
    yAxisLabels: ['Mon', 'Tue', 'Wed', 'Thu'],
    min: 0,
    max: 1,
    valueFormatter: value => (value === 1 ? '✓' : '✗'),
    height: 300,
  },
};

/**
 * Animated: Real-time updating heatmap
 */
export const AnimatedRealtime: Story = {
  render: () => {
    const rows = 8;
    const cols = 12;

    const [data, setData] = useState<[number, number, number][]>(() => {
      const initialData: [number, number, number][] = [];
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          initialData.push([col, row, Math.round(Math.random() * 100)]);
        }
      }
      return initialData;
    });

    useEffect(() => {
      const interval = setInterval(() => {
        setData(prev => {
          const newData = [...prev];
          // Update 5 random cells
          for (let i = 0; i < 5; i++) {
            const randomIdx = Math.floor(Math.random() * newData.length);
            newData[randomIdx] = [newData[randomIdx][0], newData[randomIdx][1], Math.round(Math.random() * 100)];
          }
          return newData;
        });
      }, 500);

      return () => {
        clearInterval(interval);
      };
    }, []);

    return (
      <Heatmap
        title="Live System Monitoring (Updates every 500ms)"
        data={data}
        xAxisLabels={Array.from({ length: cols }, (_, i) => `Node ${i + 1}`)}
        yAxisLabels={Array.from({ length: rows }, (_, i) => `Metric ${i + 1}`)}
        showValues={false}
        height={500}
      />
    );
  },
};

/**
 * Animated: Growing heatmap that fills progressively
 */
export const AnimatedGrowingData: Story = {
  render: () => {
    const totalRows = 5;
    const totalCols = 7;

    const [filledCells, setFilledCells] = useState(0);

    useEffect(() => {
      const interval = setInterval(() => {
        setFilledCells(prev => {
          if (prev >= totalRows * totalCols) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 150);

      return () => {
        clearInterval(interval);
      };
    }, []);

    const data: [number, number, number][] = [];
    for (let i = 0; i < filledCells; i++) {
      const row = Math.floor(i / totalCols);
      const col = i % totalCols;
      const value = Math.round(Math.random() * 100);
      data.push([col, row, value]);
    }

    return (
      <Heatmap
        title={`Loading Data (${filledCells}/${totalRows * totalCols} cells)`}
        data={data}
        xAxisLabels={Array.from({ length: totalCols }, (_, i) => `Col ${i + 1}`)}
        yAxisLabels={Array.from({ length: totalRows }, (_, i) => `Row ${i + 1}`)}
        height={400}
      />
    );
  },
};
