import type { Meta, StoryObj } from '@storybook/react-vite';
import { GlobeChart } from './Globe';
import type { LineData, PointData } from './Globe.types';

const meta: Meta<typeof GlobeChart> = {
  title: 'Components/Charts/Globe',
  component: GlobeChart,
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof GlobeChart>;

// Realistic Earth textures
const earthTextures = {
  baseTexture: '/images/echarts/world.topo.bathy.200401.jpg',
  heightTexture: '/images/echarts/bathymetry_bw_composite_4k.jpg',
  environment: '/images/echarts/starfield.jpg',
};

// Sample data - global connections
const lines: LineData[] = [
  { from: [-74.0, 40.7], to: [-0.1, 51.5] }, // NYC to London
  { from: [-118.4, 33.9], to: [139.8, 35.6] }, // LA to Tokyo
  { from: [2.5, 49.0], to: [-43.2, -22.9] }, // Paris to Rio
  { from: [121.5, 31.2], to: [-122.4, 37.8] }, // Shanghai to SF
  { from: [55.3, 25.3], to: [103.8, 1.3] }, // Dubai to Singapore
  { from: [-99.1, 19.4], to: [139.8, 35.6] }, // Mexico City to Tokyo
  { from: [151.2, -33.9], to: [-74.0, 40.7] }, // Sydney to NYC
  { from: [-0.1, 51.5], to: [55.3, 25.3] }, // London to Dubai
];

const points: PointData[] = [
  { name: 'New York', coord: [-74.0, 40.7] },
  { name: 'London', coord: [-0.1, 51.5] },
  { name: 'Los Angeles', coord: [-118.4, 33.9] },
  { name: 'Tokyo', coord: [139.8, 35.6] },
  { name: 'Paris', coord: [2.5, 49.0] },
  { name: 'Shanghai', coord: [121.5, 31.2] },
  { name: 'Dubai', coord: [55.3, 25.3] },
  { name: 'Singapore', coord: [103.8, 1.3] },
  { name: 'Sydney', coord: [151.2, -33.9] },
];

/**
 * 3D globe with lines and points
 * Generic component for plotting any connections and locations
 */
export const Default: Story = {
  args: {
    lines,
    points,
    autoRotate: true,
    showEffect: true,
    ...earthTextures,
  },
};
