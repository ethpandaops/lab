import type { Meta, StoryObj } from '@storybook/react-vite';
import { MapChart } from './Map';
import type { RouteData } from './Map.types';

const meta: Meta<typeof MapChart> = {
  title: 'Components/Charts/Map',
  component: MapChart,
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MapChart>;

// Sample flight routes data - major global routes
const routes: RouteData[] = [
  // North America to Europe
  { from: [-74.0, 40.7], to: [-0.1, 51.5], name: 'NYC to London' },
  { from: [-87.9, 41.9], to: [2.5, 49.0], name: 'Chicago to Paris' },
  { from: [-118.4, 33.9], to: [8.6, 50.1], name: 'LA to Frankfurt' },

  // North America to Asia
  { from: [-118.4, 33.9], to: [139.8, 35.6], name: 'LA to Tokyo' },
  { from: [-122.4, 37.8], to: [121.5, 31.2], name: 'SF to Shanghai' },
  { from: [-73.8, 40.6], to: [126.9, 37.5], name: 'NYC to Seoul' },

  // Europe to Asia
  { from: [-0.1, 51.5], to: [139.8, 35.6], name: 'London to Tokyo' },
  { from: [2.5, 49.0], to: [121.5, 31.2], name: 'Paris to Shanghai' },
  { from: [8.6, 50.1], to: [103.8, 1.3], name: 'Frankfurt to Singapore' },

  // Europe to Middle East
  { from: [-0.1, 51.5], to: [55.3, 25.3], name: 'London to Dubai' },
  { from: [2.5, 49.0], to: [55.3, 25.3], name: 'Paris to Dubai' },

  // Middle East to Asia
  { from: [55.3, 25.3], to: [103.8, 1.3], name: 'Dubai to Singapore' },
  { from: [55.3, 25.3], to: [77.1, 28.7], name: 'Dubai to Delhi' },

  // Trans-Pacific
  { from: [151.2, -33.9], to: [-118.4, 33.9], name: 'Sydney to LA' },
  { from: [151.2, -33.9], to: [139.8, 35.6], name: 'Sydney to Tokyo' },

  // South America
  { from: [-43.2, -22.9], to: [2.5, 49.0], name: 'Rio to Paris' },
  { from: [-58.4, -34.6], to: [-3.7, 40.4], name: 'Buenos Aires to Madrid' },

  // Intra-Asia
  { from: [103.8, 1.3], to: [139.8, 35.6], name: 'Singapore to Tokyo' },
  { from: [114.1, 22.3], to: [103.8, 1.3], name: 'Hong Kong to Singapore' },

  // Africa connections
  { from: [18.4, -33.9], to: [-0.1, 51.5], name: 'Cape Town to London' },
  { from: [31.2, 30.0], to: [55.3, 25.3], name: 'Cairo to Dubai' },
];

/**
 * 3D map with flight routes and animated effects
 * Shows global flight connections on a realistic 3D world map
 */
export const Default: Story = {
  args: {
    routes,
    showEffect: true,
  },
};

/**
 * Map with custom title
 */
export const WithTitle: Story = {
  args: {
    routes,
    title: 'Global Flight Routes',
    showEffect: true,
  },
};

/**
 * Map without animated effects
 * Shows only static flight paths
 */
export const NoEffects: Story = {
  args: {
    routes,
    showEffect: false,
  },
};

/**
 * Map with custom colors
 */
export const CustomColors: Story = {
  args: {
    routes,
    showEffect: true,
    lineColor: '#ff4683',
    mapColor: '#1a1a2e',
    environment: '#0f0f1e',
  },
};

/**
 * Map with different camera angle
 */
export const TopView: Story = {
  args: {
    routes,
    showEffect: true,
    alpha: 45,
    distance: 100,
  },
};

/**
 * Map with minimal routes
 * Shows only a few key connections
 */
export const MinimalRoutes: Story = {
  args: {
    routes: [
      { from: [-74.0, 40.7], to: [-0.1, 51.5], name: 'NYC to London' },
      { from: [-118.4, 33.9], to: [139.8, 35.6], name: 'LA to Tokyo' },
      { from: [2.5, 49.0], to: [-43.2, -22.9], name: 'Paris to Rio' },
    ],
    showEffect: true,
  },
};
