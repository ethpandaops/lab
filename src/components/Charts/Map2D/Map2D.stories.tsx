import type { Meta, StoryObj } from '@storybook/react-vite';
import { Map2DChart } from './Map2D';

const meta: Meta<typeof Map2DChart> = {
  title: 'Charts/Map2D',
  component: Map2DChart,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;
type Story = StoryObj<typeof Map2DChart>;

// Sample data
const samplePoints = [
  { name: 'New York, USA', coords: [-74.006, 40.7128] as [number, number], value: 150 },
  { name: 'London, UK', coords: [-0.1276, 51.5074] as [number, number], value: 120 },
  { name: 'Tokyo, Japan', coords: [139.6917, 35.6895] as [number, number], value: 200 },
  { name: 'Sydney, Australia', coords: [151.2093, -33.8688] as [number, number], value: 80 },
  { name: 'São Paulo, Brazil', coords: [-46.6333, -23.5505] as [number, number], value: 90 },
  { name: 'Mumbai, India', coords: [72.8777, 19.076] as [number, number], value: 110 },
  { name: 'Paris, France', coords: [2.3522, 48.8566] as [number, number], value: 95 },
  { name: 'Berlin, Germany', coords: [13.405, 52.52] as [number, number], value: 85 },
  { name: 'Singapore', coords: [103.8198, 1.3521] as [number, number], value: 130 },
  { name: 'Dubai, UAE', coords: [55.2708, 25.2048] as [number, number], value: 75 },
];

const sampleRoutes = [
  { from: [-74.006, 40.7128] as [number, number], to: [-0.1276, 51.5074] as [number, number], name: 'NYC to London' },
  { from: [-74.006, 40.7128] as [number, number], to: [139.6917, 35.6895] as [number, number], name: 'NYC to Tokyo' },
  {
    from: [-0.1276, 51.5074] as [number, number],
    to: [151.2093, -33.8688] as [number, number],
    name: 'London to Sydney',
  },
  {
    from: [139.6917, 35.6895] as [number, number],
    to: [103.8198, 1.3521] as [number, number],
    name: 'Tokyo to Singapore',
  },
];

// Generate many points for performance testing
const generateManyPoints = (count: number): Array<{ name: string; coords: [number, number]; value: number }> => {
  const points = [];
  for (let i = 0; i < count; i++) {
    const lat = Math.random() * 180 - 90;
    const lon = Math.random() * 360 - 180;
    points.push({
      name: `Point ${i}`,
      coords: [lon, lat] as [number, number],
      value: Math.floor(Math.random() * 100) + 1,
    });
  }
  return points;
};

export const Default: Story = {
  args: {
    points: samplePoints,
    title: '2D World Map - High Performance',
    height: 600,
  },
};

export const WithRoutes: Story = {
  args: {
    points: samplePoints,
    routes: sampleRoutes,
    title: 'Node Distribution with Routes',
    height: 600,
    showEffect: false,
  },
};

export const WithAnimatedRoutes: Story = {
  args: {
    points: samplePoints,
    routes: sampleRoutes,
    title: 'Animated Route Effects',
    height: 600,
    showEffect: true,
  },
};

export const PointsOnly: Story = {
  args: {
    points: samplePoints,
    title: 'Global Node Distribution',
    height: 600,
  },
};

export const LargeDataset: Story = {
  args: {
    points: generateManyPoints(2000),
    title: 'Performance Test - 2000 Points',
    height: 600,
  },
};

export const VeryLargeDataset: Story = {
  args: {
    points: generateManyPoints(5000),
    title: 'Performance Test - 5000 Points (Progressive Rendering)',
    height: 600,
  },
};

export const NoZoomPan: Story = {
  args: {
    points: samplePoints,
    title: 'Static Map (No Interaction)',
    height: 600,
    roam: false,
  },
};

export const CustomColors: Story = {
  args: {
    points: samplePoints,
    routes: sampleRoutes,
    title: 'Custom Colored Map',
    height: 600,
    pointColor: '#00ff88',
    lineColor: '#ff00ff',
    mapColor: '#1a1a2e',
  },
};
