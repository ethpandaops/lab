import type { Meta, StoryObj } from '@storybook/react-vite';
import { Gauge } from './Gauge';

const meta: Meta<typeof Gauge> = {
  title: 'Components/Charts/Gauge',
  component: Gauge,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Gauge>;

/**
 * Single gauge showing high completion
 */
export const Single: Story = {
  args: {
    data: [
      {
        name: 'Participation',
        value: 487,
        max: 512,
      },
    ],
    height: 300,
  },
};

/**
 * Single gauge with custom color and title
 */
export const SingleWithTitle: Story = {
  args: {
    data: [
      {
        name: 'Validator Participation',
        value: 487,
        max: 512,
        color: '#22c55e',
      },
    ],
    title: 'Attestation Metrics',
    height: 300,
  },
};

/**
 * Two gauges side by side
 */
export const Double: Story = {
  args: {
    data: [
      {
        name: 'Participation',
        value: 487,
        max: 512,
        color: '#22c55e',
      },
      {
        name: 'Head Correct',
        value: 450,
        max: 512,
        color: '#3b82f6',
      },
    ],
    height: 300,
  },
};

/**
 * Four gauges in a 2x2 grid
 */
export const Quad: Story = {
  args: {
    data: [
      {
        name: 'Participation',
        value: 487,
        max: 512,
        color: '#22c55e',
      },
      {
        name: 'Head Correct',
        value: 450,
        max: 512,
        color: '#3b82f6',
      },
      {
        name: 'Source Correct',
        value: 445,
        max: 512,
        color: '#8b5cf6',
      },
      {
        name: 'Target Correct',
        value: 455,
        max: 512,
        color: '#f59e0b',
      },
    ],
    height: 400,
  },
};

/**
 * Low performance gauge
 */
export const LowPerformance: Story = {
  args: {
    data: [
      {
        name: 'Participation',
        value: 256,
        max: 512,
        color: '#ef4444',
      },
    ],
    height: 300,
  },
};

/**
 * Mixed performance metrics
 */
export const MixedPerformance: Story = {
  args: {
    data: [
      {
        name: 'Participation',
        value: 450,
        max: 512,
        color: '#22c55e',
      },
      {
        name: 'Head Correct',
        value: 380,
        max: 512,
        color: '#f59e0b',
      },
      {
        name: 'Source Correct',
        value: 200,
        max: 512,
        color: '#ef4444',
      },
    ],
    height: 300,
  },
};

/**
 * Perfect scores (100%)
 */
export const Perfect: Story = {
  args: {
    data: [
      {
        name: 'Participation',
        value: 512,
        max: 512,
      },
      {
        name: 'Head Correct',
        value: 512,
        max: 512,
      },
    ],
    height: 300,
  },
};

/**
 * Zero values
 */
export const Empty: Story = {
  args: {
    data: [
      {
        name: 'No Data',
        value: 0,
        max: 512,
      },
    ],
    height: 300,
  },
};

/**
 * Custom styling options
 */
export const CustomStyling: Story = {
  args: {
    data: [
      {
        name: 'Custom Gauge',
        value: 384,
        max: 512,
        color: '#cb7044',
      },
    ],
    height: 350,
    radius: 80,
    gaugeWidth: 20,
    percentageDecimals: 2,
    titleFontSize: 18,
    titleFontWeight: 700,
  },
};
