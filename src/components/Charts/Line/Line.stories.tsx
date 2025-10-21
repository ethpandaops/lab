import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, useEffect } from 'react';
import { LineChart } from './Line';

const meta: Meta<typeof LineChart> = {
  title: 'Components/Charts/Line',
  component: LineChart,
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
    smooth: {
      control: { type: 'boolean' },
      description: 'Enable smooth curve',
    },
    showArea: {
      control: { type: 'boolean' },
      description: 'Show area fill under the line',
    },
    title: {
      control: { type: 'text' },
      description: 'Chart title',
    },
    color: {
      control: { type: 'color' },
      description: 'Line color (overrides theme primary)',
    },
  },
};

export default meta;
type Story = StoryObj<typeof LineChart>;

/**
 * Basic smoothed line chart with default data
 */
export const Default: Story = {
  args: {},
};

/**
 * Chart with title
 */
export const WithTitle: Story = {
  args: {
    title: 'Weekly Activity',
  },
};

/**
 * Chart with area fill
 */
export const WithArea: Story = {
  args: {
    title: 'Sales Trend',
    showArea: true,
  },
};

/**
 * Chart with custom data
 */
export const CustomData: Story = {
  args: {
    title: 'Monthly Revenue',
    data: [1200, 1900, 1500, 2800, 3200, 2600, 3500, 4200, 3800, 4500, 5000, 4800],
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    showArea: true,
  },
};

/**
 * Sharp line (non-smoothed)
 */
export const Sharp: Story = {
  args: {
    title: 'Network Latency',
    smooth: false,
    data: [45, 52, 38, 65, 42, 68, 55],
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
};

/**
 * Custom smoothness level (0-1)
 */
export const CustomSmoothness: Story = {
  args: {
    title: 'Temperature',
    smooth: 0.3,
    data: [18, 20, 19, 22, 25, 23, 21],
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
};

/**
 * Very smooth curve
 */
export const VerySmoothness: Story = {
  args: {
    title: 'Stock Price',
    smooth: 0.8,
    showArea: true,
    data: [100, 105, 102, 108, 115, 112, 120],
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
};

/**
 * Custom color
 */
export const CustomColor: Story = {
  args: {
    title: 'Custom Color Line',
    color: '#10b981', // green-500
    showArea: true,
    data: [300, 450, 350, 520, 480, 610, 590],
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  },
};

/**
 * Large dataset
 */
export const LargeDataset: Story = {
  render: () => {
    // Generate sinusoidal data for 24 hours
    const hourlyData = Array.from({ length: 24 }, (_, i) => {
      return Math.round(500 + 300 * Math.sin((i / 24) * Math.PI * 2) + Math.random() * 100);
    });
    const hourLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);

    return <LineChart title="User Activity (24h)" data={hourlyData} labels={hourLabels} showArea={true} height={500} />;
  },
};

/**
 * Compact chart
 */
export const Compact: Story = {
  args: {
    data: [820, 932, 901, 934, 1290, 1330, 1320],
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    height: 250,
  },
};

/**
 * Animated: Slowly adding data points
 * Starts with a few points and adds one every 500ms
 */
export const AnimatedGrowingData: Story = {
  render: () => {
    const [chartData, setChartData] = useState<{ data: number[]; labels: string[] }>({
      data: [100],
      labels: ['0'],
    });

    useEffect(() => {
      const interval = setInterval(() => {
        setChartData(prev => {
          if (prev.data.length >= 50) {
            clearInterval(interval);
            return prev;
          }
          const newValue = Math.round(100 + Math.random() * 400 + Math.sin(prev.data.length / 5) * 100);
          return {
            data: [...prev.data, newValue],
            labels: [...prev.labels, `${prev.data.length}`],
          };
        });
      }, 500);

      return () => {
        clearInterval(interval);
      };
    }, []);

    return (
      <LineChart
        title={`Real-time Data Stream (${chartData.data.length}/50 points)`}
        data={chartData.data}
        labels={chartData.labels}
        showArea={true}
        height={400}
      />
    );
  },
};

/**
 * Animated: Progressive fill to 100 points
 * Always shows 100 points on x-axis, fills them progressively
 */
export const AnimatedProgressiveFill: Story = {
  render: () => {
    const totalPoints = 100;
    const labels = Array.from({ length: totalPoints }, (_, i) => `${i}`);
    const [chartData, setChartData] = useState<{ filledCount: number; data: number[] }>({
      filledCount: 0,
      data: Array(totalPoints).fill(0),
    });

    useEffect(() => {
      const interval = setInterval(() => {
        setChartData(prev => {
          if (prev.filledCount >= totalPoints) {
            clearInterval(interval);
            return prev;
          }

          const newData = [...prev.data];
          // Fill the next point with data
          newData[prev.filledCount] = Math.round(200 + Math.random() * 300 + Math.sin(prev.filledCount / 10) * 150);

          return {
            filledCount: prev.filledCount + 1,
            data: newData,
          };
        });
      }, 100);

      return () => {
        clearInterval(interval);
      };
    }, []);

    return (
      <LineChart
        title={`Loading Progress (${chartData.filledCount}/${totalPoints})`}
        data={chartData.data}
        labels={labels}
        showArea={true}
        height={400}
      />
    );
  },
};

/**
 * Animated: Random data changes on interval
 * Updates random data points every 300ms
 */
export const AnimatedRandomUpdates: Story = {
  render: () => {
    const [data, setData] = useState<number[]>(() =>
      Array.from({ length: 30 }, () => Math.round(100 + Math.random() * 400))
    );

    useEffect(() => {
      const interval = setInterval(() => {
        setData(prev => {
          const newData = [...prev];
          // Update 3 random points
          for (let i = 0; i < 3; i++) {
            const randomIndex = Math.floor(Math.random() * newData.length);
            newData[randomIndex] = Math.round(100 + Math.random() * 400);
          }
          return newData;
        });
      }, 300);

      return () => {
        clearInterval(interval);
      };
    }, []);

    return (
      <LineChart
        title="Live Monitoring (Updates every 300ms)"
        data={data}
        labels={Array.from({ length: 30 }, (_, i) => `${i}`)}
        showArea={true}
        height={400}
      />
    );
  },
};
