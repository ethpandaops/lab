import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { DataColumnDataAvailability } from './DataColumnDataAvailability';
import type { DataColumnFirstSeenPoint } from './DataColumnDataAvailability.types';

const meta: Meta<typeof DataColumnDataAvailability> = {
  title: 'Pages/Ethereum/SlotView/DataColumnDataAvailability',
  component: DataColumnDataAvailability,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div className="min-w-[1400px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DataColumnDataAvailability>;

/**
 * Generate data column first seen data
 * Columns arrive in waves, with some randomness
 */
const generateColumnData = (columnCount: number = 128): DataColumnFirstSeenPoint[] => {
  const data: DataColumnFirstSeenPoint[] = [];

  for (let i = 0; i < columnCount; i++) {
    // Columns arrive in waves
    // First wave: columns 0-31 arrive between 800-1200ms
    // Second wave: columns 32-63 arrive between 1200-1800ms
    // Third wave: columns 64-95 arrive between 1800-2500ms
    // Fourth wave: columns 96-127 arrive between 2500-3500ms
    let baseTime: number;
    let variance: number;

    if (i < 32) {
      baseTime = 800;
      variance = 400;
    } else if (i < 64) {
      baseTime = 1200;
      variance = 600;
    } else if (i < 96) {
      baseTime = 1800;
      variance = 700;
    } else {
      baseTime = 2500;
      variance = 1000;
    }

    // Add some randomness
    const time = baseTime + Math.random() * variance;

    data.push({
      columnId: i,
      time: Math.round(time),
    });
  }

  return data;
};

// Generate full dataset
const fullColumnData = generateColumnData(128);

/**
 * Default story with 6 blobs
 */
export const Default: Story = {
  args: {
    blobCount: 6,
    firstSeenData: fullColumnData.filter(point => point.time <= 4000),
  },
};

/**
 * Interactive story with auto-progress - simulates live slot progression
 */
export const Interactive: Story = {
  name: 'Interactive with Auto-Progress',
  tags: ['test-exclude'], // Exclude from Vitest tests - uses setInterval
  render: () => {
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);
    const [blobCount, setBlobCount] = useState(6);

    // Auto-increment when playing
    useEffect(() => {
      if (!isPlaying) return;

      const interval = setInterval(() => {
        setCurrentTime(prev => {
          const next = prev + 100; // 100ms increments
          if (next >= 12000) {
            setIsPlaying(false);
            return 12000;
          }
          return next;
        });
      }, 100);

      return () => clearInterval(interval);
    }, [isPlaying]);

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className="rounded-sm border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            {isPlaying ? 'Pause' : 'Play'}
          </button>
          <button
            type="button"
            onClick={() => setCurrentTime(0)}
            className="rounded-sm border border-border bg-surface px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
          >
            Reset
          </button>
          <span className="text-sm text-muted">Current time: {currentTime}ms</span>
          <label htmlFor="blob-count" className="text-sm text-muted">
            Blob count:
          </label>
          <input
            id="blob-count"
            type="number"
            min="0"
            max="72"
            value={blobCount}
            onChange={e => setBlobCount(Number(e.target.value))}
            className="w-20 rounded-sm border border-border bg-surface px-2 py-1 text-sm text-foreground"
          />
        </div>
        <DataColumnDataAvailability
          blobCount={blobCount}
          firstSeenData={fullColumnData.filter(point => point.time <= currentTime)}
        />
      </div>
    );
  },
};

/**
 * Single blob - minimum case
 */
export const SingleBlob: Story = {
  args: {
    blobCount: 1,
    firstSeenData: fullColumnData,
  },
};

/**
 * 6 blobs - common case
 */
export const SixBlobs: Story = {
  args: {
    blobCount: 6,
    firstSeenData: fullColumnData,
  },
};

/**
 * 36 blobs - shows range labels (>6 blobs)
 */
export const ThirtySixBlobs: Story = {
  args: {
    blobCount: 36,
    firstSeenData: fullColumnData,
  },
};

/**
 * 72 blobs - maximum case
 */
export const SeventyTwoBlobs: Story = {
  args: {
    blobCount: 72,
    firstSeenData: fullColumnData,
  },
};

/**
 * Empty state - no data available
 */
export const Empty: Story = {
  args: {
    blobCount: 6,
    firstSeenData: [],
  },
};

/**
 * Early phase - most columns arrive on time
 */
export const EarlyPhase: Story = {
  name: 'Early Phase (2000ms)',
  args: {
    blobCount: 6,
    firstSeenData: fullColumnData.filter(point => point.time <= 2000),
  },
};

/**
 * Complete phase - all data visible
 */
export const CompletePhase: Story = {
  name: 'Complete Phase (12000ms)',
  args: {
    blobCount: 6,
    firstSeenData: fullColumnData,
  },
};

/**
 * Late arrivals - some columns miss the 4000ms deadline
 */
export const LateArrivals: Story = {
  args: {
    blobCount: 6,
    firstSeenData: Array.from({ length: 128 }, (_, i) => {
      // First 80 columns arrive on time (0-4000ms)
      // Last 48 columns arrive late (4000-8000ms)
      if (i < 80) {
        return {
          columnId: i,
          time: 800 + Math.random() * 3200, // 800-4000ms
        };
      }
      return {
        columnId: i,
        time: 4000 + Math.random() * 4000, // 4000-8000ms - missed deadline!
      };
    }),
  },
};

/**
 * All late - every column misses deadline
 */
export const AllLate: Story = {
  args: {
    blobCount: 6,
    firstSeenData: Array.from({ length: 128 }, (_, i) => ({
      columnId: i,
      time: 4500 + Math.random() * 2000, // All between 4500-6500ms
    })),
  },
};
