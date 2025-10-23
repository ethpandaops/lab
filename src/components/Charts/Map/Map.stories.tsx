import type { Meta, StoryObj } from '@storybook/react-vite';
import colors from 'tailwindcss/colors';
import { MapChart } from './Map';
import type { RouteData, PointData } from './Map.types';

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
    lineColor: colors.pink[500],
    mapColor: colors.slate[900],
    environment: colors.slate[950],
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

// Sample point data - major cities around the world
const cityPoints: PointData[] = [
  // North America
  { coords: [-74.0, 40.7], name: 'New York', value: 8 },
  { coords: [-118.4, 33.9], name: 'Los Angeles', value: 4 },
  { coords: [-87.9, 41.9], name: 'Chicago', value: 3 },
  { coords: [-122.4, 37.8], name: 'San Francisco', value: 3 },
  { coords: [-79.4, 43.7], name: 'Toronto', value: 3 },

  // Europe
  { coords: [-0.1, 51.5], name: 'London', value: 9 },
  { coords: [2.5, 49.0], name: 'Paris', value: 7 },
  { coords: [8.6, 50.1], name: 'Frankfurt', value: 2 },
  { coords: [-3.7, 40.4], name: 'Madrid', value: 3 },
  { coords: [12.5, 41.9], name: 'Rome', value: 3 },

  // Asia
  { coords: [139.8, 35.6], name: 'Tokyo', value: 10 },
  { coords: [121.5, 31.2], name: 'Shanghai', value: 9 },
  { coords: [103.8, 1.3], name: 'Singapore', value: 6 },
  { coords: [126.9, 37.5], name: 'Seoul', value: 5 },
  { coords: [77.1, 28.7], name: 'Delhi', value: 8 },
  { coords: [114.1, 22.3], name: 'Hong Kong', value: 7 },

  // Middle East
  { coords: [55.3, 25.3], name: 'Dubai', value: 6 },

  // Oceania
  { coords: [151.2, -33.9], name: 'Sydney', value: 5 },

  // South America
  { coords: [-43.2, -22.9], name: 'Rio de Janeiro', value: 4 },
  { coords: [-58.4, -34.6], name: 'Buenos Aires', value: 3 },

  // Africa
  { coords: [18.4, -33.9], name: 'Cape Town', value: 2 },
  { coords: [31.2, 30.0], name: 'Cairo', value: 4 },
];

/**
 * Map with only points (no routes)
 * Shows major cities as scatter points on the 3D map
 */
export const PointsOnly: Story = {
  args: {
    points: cityPoints,
    title: 'Major Cities',
    pointSize: 6,
  },
};

/**
 * Map with custom colored points
 */
export const CustomPointColor: Story = {
  args: {
    points: cityPoints,
    title: 'Major Cities',
    pointColor: colors.pink[500],
    pointSize: 8,
  },
};

/**
 * Map with both routes and points
 * Shows flight routes with city markers
 */
export const RoutesAndPoints: Story = {
  args: {
    routes,
    points: cityPoints,
    title: 'Global Network',
    showEffect: true,
    pointSize: 5,
  },
};

/**
 * Map with larger points
 */
export const LargePoints: Story = {
  args: {
    points: cityPoints,
    title: 'Major Cities - Large Points',
    pointSize: 12,
  },
};

// Sample data with detailed location labels and node counts
const nodeLocations: PointData[] = [
  // North America
  { coords: [-122.4, 37.8], name: 'San Francisco, United States', value: 15 },
  { coords: [-74.0, 40.7], name: 'New York, United States', value: 8 },
  { coords: [-118.4, 33.9], name: 'Los Angeles, United States', value: 5 },
  { coords: [-87.9, 41.9], name: 'Chicago, United States', value: 4 },
  { coords: [-111.9, 33.4], name: 'Arizona, United States', value: 3 },
  { coords: [-79.4, 43.7], name: 'Toronto, Canada', value: 6 },
  { coords: [-123.1, 49.3], name: 'Vancouver, Canada', value: 4 },

  // Europe
  { coords: [-0.1, 51.5], name: 'London, United Kingdom', value: 12 },
  { coords: [2.5, 49.0], name: 'Paris, France', value: 9 },
  { coords: [13.4, 52.5], name: 'Berlin, Germany', value: 7 },
  { coords: [8.6, 50.1], name: 'Frankfurt, Germany', value: 5 },
  { coords: [4.9, 52.4], name: 'Amsterdam, Netherlands', value: 6 },
  { coords: [-3.7, 40.4], name: 'Madrid, Spain', value: 4 },

  // Asia
  { coords: [139.8, 35.6], name: 'Tokyo, Japan', value: 11 },
  { coords: [121.5, 31.2], name: 'Shanghai, China', value: 10 },
  { coords: [103.8, 1.3], name: 'Singapore', value: 8 },
  { coords: [126.9, 37.5], name: 'Seoul, South Korea', value: 7 },
  { coords: [114.1, 22.3], name: 'Hong Kong', value: 6 },

  // Oceania
  { coords: [151.2, -33.9], name: 'Sydney, Australia', value: 5 },
  { coords: [174.8, -41.3], name: 'Wellington, New Zealand', value: 2 },
];

/**
 * Map with detailed tooltips
 * Hover over points to see location name and node count
 * Example: "Arizona, United States: 3"
 */
export const WithTooltips: Story = {
  args: {
    points: nodeLocations,
    title: 'Node Distribution',
    pointSize: 8,
  },
};
