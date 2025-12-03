import type { Meta, StoryObj } from '@storybook/react-vite';
import { BlobPosterLogo } from './BlobPosterLogo';
import { BLOB_POSTERS } from './BlobPosterLogo.types';

const meta = {
  title: 'Components/Ethereum/BlobPosterLogo',
  component: BlobPosterLogo,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-xs bg-surface p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BlobPosterLogo>;

export default meta;
type Story = StoryObj<typeof meta>;

// Major L2s

/**
 * Arbitrum One logo
 */
export const Arbitrum: Story = {
  args: {
    poster: 'arbitrum',
  },
};

/**
 * Base logo
 */
export const Base: Story = {
  args: {
    poster: 'base',
  },
};

/**
 * Optimism (OP Mainnet) logo
 */
export const Optimism: Story = {
  args: {
    poster: 'optimism',
  },
};

/**
 * zkSync Era logo
 */
export const ZkSync: Story = {
  args: {
    poster: 'zksync',
  },
};

/**
 * StarkNet logo
 */
export const StarkNet: Story = {
  args: {
    poster: 'starknet',
  },
};

/**
 * Scroll logo
 */
export const Scroll: Story = {
  args: {
    poster: 'scroll',
  },
};

/**
 * Linea logo
 */
export const Linea: Story = {
  args: {
    poster: 'linea',
  },
};

/**
 * Blast logo
 */
export const Blast: Story = {
  args: {
    poster: 'blast',
  },
};

/**
 * ZORA logo
 */
export const Zora: Story = {
  args: {
    poster: 'zora',
  },
};

/**
 * Taiko logo
 */
export const Taiko: Story = {
  args: {
    poster: 'taiko',
  },
};

// Size variations

/**
 * Large logo (32px)
 */
export const Large: Story = {
  args: {
    poster: 'arbitrum',
    size: 32,
  },
};

/**
 * Small logo (16px)
 */
export const Small: Story = {
  args: {
    poster: 'base',
    size: 16,
  },
};

/**
 * Extra large logo (48px)
 */
export const ExtraLarge: Story = {
  args: {
    poster: 'optimism',
    size: 48,
  },
};

// Name variations - testing normalization

/**
 * Accepts full name "OP Mainnet" and normalizes to "optimism"
 */
export const NameVariation: Story = {
  args: {
    poster: 'OP Mainnet',
  },
};

// Grid displays

/**
 * All blob poster logos in a grid
 */
export const AllBlobPosters: Story = {
  args: {
    poster: 'arbitrum',
  },
  render: () => (
    <div className="space-y-4">
      <div className="text-sm/5 font-semibold text-foreground">All Blob Posters (L2s)</div>
      <div className="flex flex-wrap items-center gap-4">
        {BLOB_POSTERS.map(poster => (
          <div key={poster} className="flex flex-col items-center gap-1">
            <BlobPosterLogo poster={poster} size={24} />
            <span className="text-xs/4 text-muted">{poster}</span>
          </div>
        ))}
      </div>
    </div>
  ),
};

/**
 * Major L2s in a row
 */
export const MajorL2s: Story = {
  args: {
    poster: 'arbitrum',
  },
  render: () => (
    <div className="space-y-4">
      <div className="text-sm/5 font-semibold text-foreground">Major L2 Networks</div>
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center gap-1">
          <BlobPosterLogo poster="arbitrum" />
          <span className="text-xs/4 text-muted">Arbitrum</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <BlobPosterLogo poster="optimism" />
          <span className="text-xs/4 text-muted">Optimism</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <BlobPosterLogo poster="base" />
          <span className="text-xs/4 text-muted">Base</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <BlobPosterLogo poster="zksync" />
          <span className="text-xs/4 text-muted">zkSync</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <BlobPosterLogo poster="starknet" />
          <span className="text-xs/4 text-muted">StarkNet</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <BlobPosterLogo poster="scroll" />
          <span className="text-xs/4 text-muted">Scroll</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <BlobPosterLogo poster="linea" />
          <span className="text-xs/4 text-muted">Linea</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <BlobPosterLogo poster="blast" />
          <span className="text-xs/4 text-muted">Blast</span>
        </div>
      </div>
    </div>
  ),
};
