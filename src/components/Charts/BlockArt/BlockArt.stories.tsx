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
    rotationSpeed: {
      control: { type: 'range', min: 0, max: 0.05, step: 0.001 },
    },
    particleCount: {
      control: { type: 'range', min: 0, max: 200, step: 10 },
    },
    blockSize: {
      control: { type: 'range', min: 0.5, max: 2, step: 0.1 },
    },
    animationSpeed: {
      control: { type: 'range', min: 0.1, max: 3, step: 0.1 },
    },
  },
};

export default meta;
type Story = StoryObj<typeof BlockArt>;

/**
 * Default: Stunning 3D block with rotating animation, glowing edges, and particle effects
 * This is the standard hero visualization that adapts to theme colors
 */
export const Default: Story = {
  args: {
    width: 500,
    height: 500,
    autoRotate: true,
    showParticles: true,
    glowingEdges: true,
    floatingAnimation: true,
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
 * Hash, block number, and transaction count affect the visual appearance
 */
export const WithBlockData: Story = {
  args: {
    width: 500,
    height: 500,
    blockHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    blockNumber: 19234567,
    transactionCount: 180,
    autoRotate: true,
    showParticles: true,
    glowingEdges: true,
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
 * High Transaction Block: Dense particle field representing high transaction volume
 * More particles orbit the block to visualize network activity
 */
export const HighTransactionBlock: Story = {
  args: {
    width: 500,
    height: 500,
    blockHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
    blockNumber: 19234999,
    transactionCount: 350,
    particleCount: 150,
    autoRotate: true,
    showParticles: true,
    glowingEdges: true,
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
 * Minimal: Simple rotating block without particles or glow effects
 * Clean visualization focusing on the core block geometry
 */
export const Minimal: Story = {
  args: {
    width: 400,
    height: 400,
    autoRotate: true,
    showParticles: false,
    glowingEdges: false,
    floatingAnimation: false,
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
 * Large Block: Emphasized block size for hero displays
 * Bigger, bolder visualization with increased scale
 */
export const LargeBlock: Story = {
  args: {
    width: 600,
    height: 600,
    blockSize: 1.5,
    autoRotate: true,
    showParticles: true,
    particleCount: 80,
    glowingEdges: true,
    floatingAnimation: true,
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
 * Fast Animation: Accelerated rotation and particle movement
 * Dynamic, high-energy visualization
 */
export const FastAnimation: Story = {
  args: {
    width: 500,
    height: 500,
    rotationSpeed: 0.03,
    animationSpeed: 2,
    autoRotate: true,
    showParticles: true,
    glowingEdges: true,
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
 * Slow Motion: Gentle, meditative rotation
 * Calm, contemplative visualization with slow movement
 */
export const SlowMotion: Story = {
  args: {
    width: 500,
    height: 500,
    rotationSpeed: 0.003,
    animationSpeed: 0.5,
    autoRotate: true,
    showParticles: true,
    particleCount: 30,
    glowingEdges: true,
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
    autoRotate: true,
    showParticles: true,
    glowingEdges: true,
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
 * Static: No rotation, perfect for screenshots
 * Fixed perspective for documentation and static displays
 */
export const Static: Story = {
  args: {
    width: 400,
    height: 400,
    autoRotate: false,
    showParticles: true,
    glowingEdges: true,
    floatingAnimation: false,
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
    blockSize: 0.8,
    particleCount: 30,
    autoRotate: true,
    showParticles: true,
    glowingEdges: true,
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
