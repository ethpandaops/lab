import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor } from 'storybook/test';
import { BlockArt } from './BlockArt';

const meta: Meta<typeof BlockArt> = {
  title: 'Components/Charts/BlockArt',
  component: BlockArt,
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  argTypes: {
    width: {
      control: { type: 'range', min: 200, max: 800, step: 50 },
    },
    height: {
      control: { type: 'range', min: 200, max: 800, step: 50 },
    },
    blockNumber: {
      control: { type: 'number' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof BlockArt>;

/**
 * Default: Stunning 3D block visualization with glowing edges
 * This is the standard hero visualization that adapts to theme colors
 */
export const Default: Story = {
  args: {
    width: 500,
    height: 500,
  },
  play: async ({ canvasElement }) => {
    // Wait for p5.js canvas to render
    await waitFor(
      () => {
        const canvas = canvasElement.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  },
};

/**
 * With Block Data: Block visualization with procedural variations based on blockchain data
 * Hash and block number affect the visual appearance
 */
export const WithBlockData: Story = {
  args: {
    width: 500,
    height: 500,
    blockHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    blockNumber: 19234567,
  },
  play: async ({ canvasElement }) => {
    await waitFor(
      () => {
        const canvas = canvasElement.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  },
};

/**
 * High Transaction Block: Block visualization with unique hash and block number
 */
export const HighTransactionBlock: Story = {
  args: {
    width: 500,
    height: 500,
    blockHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    blockNumber: 19234999,
  },
  play: async ({ canvasElement }) => {
    await waitFor(
      () => {
        const canvas = canvasElement.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  },
};

/**
 * Minimal: Simple block visualization
 * Clean visualization focusing on the core block geometry
 */
export const Minimal: Story = {
  args: {
    width: 400,
    height: 400,
  },
  play: async ({ canvasElement }) => {
    await waitFor(
      () => {
        const canvas = canvasElement.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  },
};

/**
 * Large Block: Larger canvas for hero displays
 * Bigger, bolder visualization with increased canvas size
 */
export const LargeBlock: Story = {
  args: {
    width: 600,
    height: 600,
  },
  play: async ({ canvasElement }) => {
    await waitFor(
      () => {
        const canvas = canvasElement.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  },
};

/**
 * Custom Colors: Override theme colors with custom palette
 * Demonstrates color customization capabilities
 */
export const CustomColors: Story = {
  args: {
    width: 500,
    height: 500,
    primaryColor: '#ff6b9d',
    accentColor: '#c3f0ca',
    glowColor: '#fec84b',
  },
  play: async ({ canvasElement }) => {
    await waitFor(
      () => {
        const canvas = canvasElement.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  },
};

/**
 * Static: Fixed perspective for documentation and static displays
 */
export const Static: Story = {
  args: {
    width: 400,
    height: 400,
  },
  play: async ({ canvasElement }) => {
    await waitFor(
      () => {
        const canvas = canvasElement.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  },
};

/**
 * Compact: Small size for inline use or cards
 * Space-efficient visualization suitable for tight layouts
 */
export const Compact: Story = {
  args: {
    width: 300,
    height: 300,
  },
  play: async ({ canvasElement }) => {
    await waitFor(
      () => {
        const canvas = canvasElement.querySelector('canvas');
        expect(canvas).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  },
};
