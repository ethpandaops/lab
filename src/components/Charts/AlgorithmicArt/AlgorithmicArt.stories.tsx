/**
 * Storybook stories for the AlgorithmicArt component
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { AlgorithmicArt } from './AlgorithmicArt';

const meta = {
  title: 'Components/Charts/AlgorithmicArt',
  component: AlgorithmicArt,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  argTypes: {
    height: {
      control: { type: 'number', min: 300, max: 1200, step: 50 },
      description: 'Height of the canvas in pixels',
    },
    width: {
      control: 'text',
      description: 'Width of the canvas (can be pixels or percentage)',
    },
    seed: {
      control: { type: 'number', min: 1, max: 999999 },
      description: 'Seed for reproducible randomness',
    },
    speed: {
      control: { type: 'number', min: 0.1, max: 3, step: 0.1 },
      description: 'Animation speed multiplier',
    },
    showOverlay: {
      control: 'boolean',
      description: 'Whether to show overlay text',
    },
    overlayTitle: {
      control: 'text',
      description: 'Overlay title text',
    },
    overlaySubtitle: {
      control: 'text',
      description: 'Overlay subtitle text',
    },
  },
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AlgorithmicArt>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default blockchain visualization with theme colors
 */
export const Default: Story = {
  args: {
    height: 600,
    width: '100%',
    seed: 12345,
    speed: 1,
  },
};

/**
 * With overlay text (hero section style)
 */
export const WithOverlay: Story = {
  args: {
    height: 600,
    width: '100%',
    seed: 42,
    speed: 1,
    showOverlay: true,
    overlayTitle: 'Example text',
    overlaySubtitle: 'Example subtitle',
  },
};

/**
 * Slower animation for a more calming effect
 */
export const SlowAnimation: Story = {
  args: {
    height: 600,
    width: '100%',
    seed: 99999,
    speed: 0.5,
  },
};

/**
 * Faster animation for more dynamic effect
 */
export const FastAnimation: Story = {
  args: {
    height: 600,
    width: '100%',
    seed: 777,
    speed: 2,
  },
};

/**
 * Tall canvas for hero sections
 */
export const HeroSize: Story = {
  args: {
    height: 800,
    width: '100%',
    seed: 2024,
    speed: 1,
    showOverlay: true,
    overlayTitle: 'The Lab',
    overlaySubtitle: 'Ethereum Research & Visualizations',
  },
};

/**
 * Different seed for variety
 */
export const DifferentSeed: Story = {
  args: {
    height: 600,
    width: '100%',
    seed: 54321,
    speed: 1,
  },
};

/**
 * Custom colors example
 */
export const CustomColors: Story = {
  args: {
    height: 600,
    width: '100%',
    seed: 11111,
    speed: 1,
    colors: {
      primary: '#FF6B6B',
      background: '#1A1A1A',
      accent: '#4ECDC4',
      foreground: '#FFFFFF',
      muted: '#95A5A6',
    },
  },
};
