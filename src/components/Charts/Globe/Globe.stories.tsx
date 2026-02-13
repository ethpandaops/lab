import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';
import colors from 'tailwindcss/colors';
import { GlobeChart } from './Globe';
import type { LineData, PointData } from './Globe.types';

const meta: Meta<typeof GlobeChart> = {
  title: 'Components/Charts/Globe',
  component: GlobeChart,
  // WebGL contexts are not reliable in headless CI browsers.
  tags: ['test-exclude'],
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
  { name: 'New York', coord: [-74.0, 40.7], value: 10 },
  { name: 'London', coord: [-0.1, 51.5], value: 8 },
  { name: 'Los Angeles', coord: [-118.4, 33.9], value: 5 },
  { name: 'Tokyo', coord: [139.8, 35.6], value: 12 },
  { name: 'Paris', coord: [2.5, 49.0], value: 6 },
  { name: 'Shanghai', coord: [121.5, 31.2], value: 15 },
  { name: 'Dubai', coord: [55.3, 25.3], value: 7 },
  { name: 'Singapore', coord: [103.8, 1.3], value: 9 },
  { name: 'Sydney', coord: [151.2, -33.9], value: 4 },
];

/**
 * Default: 3D globe with lines and points showing global connections
 */
export const Default: Story = {
  args: {
    lines,
    points,
    autoRotate: true,
    showEffect: true,
    ...earthTextures,
  },
  play: async ({ canvasElement }) => {
    // Test that globe container renders
    const globeContainer = canvasElement.querySelector('.w-full');
    await expect(globeContainer).toBeInTheDocument();

    // Test that ECharts container renders
    const echartsContainer = canvasElement.querySelector('[_echarts_instance_]');
    await expect(echartsContainer).toBeInTheDocument();

    // Test that canvas element is created by ECharts (wait for it to render)
    await waitFor(
      () => {
        const chartCanvas = canvasElement.querySelector('canvas');
        expect(chartCanvas).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  },
};

/**
 * Points Only: Globe showing location markers without connection lines
 * Demonstrates higher visibility with increased point size and opacity
 */
export const PointsOnly: Story = {
  args: {
    points,
    autoRotate: true,
    showEffect: false,
    pointSize: 6,
    pointOpacity: 0.8,
    pointColor: colors.cyan[500],
    ...earthTextures,
  },
  play: async ({ canvasElement }) => {
    // Test that globe container renders
    const globeContainer = canvasElement.querySelector('.w-full');
    await expect(globeContainer).toBeInTheDocument();

    // Test that ECharts container renders
    const echartsContainer = canvasElement.querySelector('[_echarts_instance_]');
    await expect(echartsContainer).toBeInTheDocument();

    // Test that canvas element is created by ECharts (wait for it to render)
    await waitFor(
      () => {
        const chartCanvas = canvasElement.querySelector('canvas');
        expect(chartCanvas).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  },
};

/**
 * Large Points: Globe with very visible markers for emphasis
 */
export const LargePoints: Story = {
  args: {
    points,
    autoRotate: true,
    showEffect: false,
    pointSize: 10,
    pointOpacity: 0.9,
    pointColor: colors.amber[500],
    ...earthTextures,
  },
  play: async ({ canvasElement }) => {
    // Test that globe container renders
    const globeContainer = canvasElement.querySelector('.w-full');
    await expect(globeContainer).toBeInTheDocument();

    // Test that ECharts container renders
    const echartsContainer = canvasElement.querySelector('[_echarts_instance_]');
    await expect(echartsContainer).toBeInTheDocument();

    // Test that canvas element is created by ECharts (wait for it to render)
    await waitFor(
      () => {
        const chartCanvas = canvasElement.querySelector('canvas');
        expect(chartCanvas).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  },
};

/**
 * Minimal: Simple globe without textures, focusing on data visualization
 */
export const Minimal: Story = {
  args: {
    points,
    autoRotate: false,
    pointSize: 8,
    pointOpacity: 1,
    pointColor: colors.cyan[500],
  },
  play: async ({ canvasElement }) => {
    // Test that globe container renders
    const globeContainer = canvasElement.querySelector('.w-full');
    await expect(globeContainer).toBeInTheDocument();

    // Test that ECharts container renders
    const echartsContainer = canvasElement.querySelector('[_echarts_instance_]');
    await expect(echartsContainer).toBeInTheDocument();

    // Test that canvas element is created by ECharts (wait for it to render)
    await waitFor(
      () => {
        const chartCanvas = canvasElement.querySelector('canvas');
        expect(chartCanvas).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  },
};

/**
 * Realistic: Globe with realistic PBR shading and post-processing effects
 * Demonstrates enhanced visual quality with realistic materials, SSAO, and temporal super sampling
 */
export const Realistic: Story = {
  args: {
    lines,
    points,
    autoRotate: true,
    showEffect: true,
    shading: 'realistic',
    roughness: 0.2,
    metalness: 0,
    enablePostEffect: true,
    enableTemporalSuperSampling: true,
    lightIntensity: 0.1,
    ambientLightIntensity: 0,
    ...earthTextures,
  },
  play: async ({ canvasElement }) => {
    // Test that globe container renders
    const globeContainer = canvasElement.querySelector('.w-full');
    await expect(globeContainer).toBeInTheDocument();

    // Test that ECharts container renders
    const echartsContainer = canvasElement.querySelector('[_echarts_instance_]');
    await expect(echartsContainer).toBeInTheDocument();

    // Test that canvas element is created by ECharts (wait for it to render)
    await waitFor(
      () => {
        const chartCanvas = canvasElement.querySelector('canvas');
        expect(chartCanvas).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  },
};

/**
 * Atmosphere: Globe with atmospheric glow effect
 * Shows realistic atmospheric scattering around the globe
 */
export const Atmosphere: Story = {
  args: {
    lines,
    points,
    autoRotate: true,
    showEffect: true,
    showAtmosphere: true,
    lightIntensity: 0.8,
    ambientLightIntensity: 0.2,
    ...earthTextures,
  },
  play: async ({ canvasElement }) => {
    // Test that globe container renders
    const globeContainer = canvasElement.querySelector('.w-full');
    await expect(globeContainer).toBeInTheDocument();

    // Test that ECharts container renders
    const echartsContainer = canvasElement.querySelector('[_echarts_instance_]');
    await expect(echartsContainer).toBeInTheDocument();

    // Test that canvas element is created by ECharts (wait for it to render)
    await waitFor(
      () => {
        const chartCanvas = canvasElement.querySelector('canvas');
        expect(chartCanvas).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  },
};

/**
 * Enhanced: Globe combining all advanced features
 * Realistic shading, post-effects, temporal super sampling, and atmospheric glow
 */
export const Enhanced: Story = {
  args: {
    lines,
    points,
    title: 'Enhanced Globe Visualization',
    autoRotate: true,
    showEffect: true,
    shading: 'realistic',
    roughness: 0.2,
    metalness: 0,
    enablePostEffect: true,
    enableTemporalSuperSampling: true,
    showAtmosphere: true,
    lightIntensity: 0.1,
    ambientLightIntensity: 0,
    lineColor: colors.cyan[500],
    pointColor: colors.amber[500],
    pointSize: 4,
    pointOpacity: 0.6,
    ...earthTextures,
  },
  play: async ({ canvasElement }) => {
    // Test that globe container renders
    const globeContainer = canvasElement.querySelector('.w-full');
    await expect(globeContainer).toBeInTheDocument();

    // Test that ECharts container renders
    const echartsContainer = canvasElement.querySelector('[_echarts_instance_]');
    await expect(echartsContainer).toBeInTheDocument();

    // Test that canvas element is created by ECharts (wait for it to render)
    await waitFor(
      () => {
        const chartCanvas = canvasElement.querySelector('canvas');
        expect(chartCanvas).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  },
};
