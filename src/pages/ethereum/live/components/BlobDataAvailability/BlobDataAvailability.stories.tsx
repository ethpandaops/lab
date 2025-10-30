import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { getDataVizColors } from '@/utils/dataVizColors';
import { BlobDataAvailability } from './BlobDataAvailability';

const { BLOB_COLORS, CONTINENT_COLORS } = getDataVizColors();

const meta: Meta<typeof BlobDataAvailability> = {
  title: 'Pages/Ethereum/SlotView/BlobDataAvailability',
  component: BlobDataAvailability,
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
type Story = StoryObj<typeof BlobDataAvailability>;

// Sample data for stories
const sampleFirstSeenData = [
  { time: 1420, blobId: '0', color: BLOB_COLORS[0] },
  { time: 1370, blobId: '1', color: BLOB_COLORS[1] },
  { time: 1370, blobId: '2', color: BLOB_COLORS[2] },
  { time: 1600, blobId: '3', color: BLOB_COLORS[3] },
  { time: 1800, blobId: '4', color: BLOB_COLORS[4] },
  { time: 1200, blobId: '5', color: BLOB_COLORS[5] },
  { time: 900, blobId: 'B', color: BLOB_COLORS[0] },
];

// Generate availability rate data with smooth curve - data point every 50ms

const allContinentsPropagationData = [
  {
    continent: 'EU',
    color: CONTINENT_COLORS.EU,
    data: [
      { time: 900, percentage: 0 },
      { time: 1200, percentage: 75 },
      { time: 1400, percentage: 100 },
      { time: 2300, percentage: 100 },
    ],
  },
  {
    continent: 'NA',
    color: CONTINENT_COLORS.NA,
    data: [
      { time: 900, percentage: 0 },
      { time: 1300, percentage: 60 },
      { time: 1500, percentage: 100 },
      { time: 2300, percentage: 100 },
    ],
  },
  {
    continent: 'AS',
    color: CONTINENT_COLORS.AS,
    data: [
      { time: 900, percentage: 0 },
      { time: 1400, percentage: 45 },
      { time: 1700, percentage: 100 },
      { time: 2300, percentage: 100 },
    ],
  },
  {
    continent: 'OC',
    color: CONTINENT_COLORS.OC,
    data: [
      { time: 900, percentage: 0 },
      { time: 1600, percentage: 30 },
      { time: 1900, percentage: 100 },
      { time: 2300, percentage: 100 },
    ],
  },
  {
    continent: 'SA',
    color: CONTINENT_COLORS.SA,
    data: [
      { time: 900, percentage: 0 },
      { time: 1500, percentage: 40 },
      { time: 1800, percentage: 100 },
      { time: 2300, percentage: 100 },
    ],
  },
  {
    continent: 'AF',
    color: CONTINENT_COLORS.AF,
    data: [
      { time: 900, percentage: 0 },
      { time: 1700, percentage: 25 },
      { time: 2000, percentage: 100 },
      { time: 2300, percentage: 100 },
    ],
  },
];

/**
 * Interactive story with auto-progress - simulates live slot progression
 */
export const Interactive: Story = {
  name: 'Interactive with Auto-Progress',
  render: () => {
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);

    // Auto-increment when playing
    useEffect(() => {
      if (!isPlaying) return;

      const interval = setInterval(() => {
        setCurrentTime(prev => {
          const next = prev + 100;
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
          <span className="text-sm text-muted">Current time: {Math.round(currentTime / 1000)}s</span>
        </div>
        <BlobDataAvailability
          currentTime={currentTime}
          deduplicatedBlobData={sampleFirstSeenData}
          visibleContinentalPropagationData={allContinentsPropagationData}
        />
      </div>
    );
  },
};

/**
 * All continents showing full blob data propagation
 */
export const AllContinents: Story = {
  args: {
    deduplicatedBlobData: sampleFirstSeenData,

    visibleContinentalPropagationData: allContinentsPropagationData,
  },
};

/**
 * Empty state - no data available
 */
export const Empty: Story = {
  args: {
    deduplicatedBlobData: [],
    visibleContinentalPropagationData: [],
  },
};

/**
 * Single continent propagation
 */
export const SingleContinent: Story = {
  args: {
    deduplicatedBlobData: [
      { time: 1420, blobId: '0', color: BLOB_COLORS[0] },
      { time: 1370, blobId: '1', color: BLOB_COLORS[1] },
      { time: 1370, blobId: '2', color: BLOB_COLORS[2] },
    ],

    visibleContinentalPropagationData: [
      {
        continent: 'EU',
        color: CONTINENT_COLORS.EU,
        data: [
          { time: 900, percentage: 0 },
          { time: 1200, percentage: 50 },
          { time: 1400, percentage: 100 },
          { time: 2300, percentage: 100 },
        ],
      },
    ],
  },
};

/**
 * Two continents with different propagation speeds
 */
export const TwoContinents: Story = {
  args: {
    deduplicatedBlobData: sampleFirstSeenData,

    visibleContinentalPropagationData: [
      {
        continent: 'EU',
        color: CONTINENT_COLORS.EU,
        data: [
          { time: 900, percentage: 0 },
          { time: 1200, percentage: 100 },
          { time: 2300, percentage: 100 },
        ],
      },
      {
        continent: 'AS',
        color: CONTINENT_COLORS.AS,
        data: [
          { time: 900, percentage: 0 },
          { time: 1800, percentage: 100 },
          { time: 2300, percentage: 100 },
        ],
      },
    ],
  },
};

/**
 * Fast propagation - all continents receive data quickly
 */
export const FastPropagation: Story = {
  args: {
    deduplicatedBlobData: sampleFirstSeenData,

    visibleContinentalPropagationData: [
      {
        continent: 'EU',
        data: [
          { time: 900, percentage: 0 },
          { time: 1100, percentage: 100 },
          { time: 2300, percentage: 100 },
        ],
      },
      {
        continent: 'NA',
        data: [
          { time: 900, percentage: 0 },
          { time: 1150, percentage: 100 },
          { time: 2300, percentage: 100 },
        ],
      },
      {
        continent: 'AS',
        data: [
          { time: 900, percentage: 0 },
          { time: 1200, percentage: 100 },
          { time: 2300, percentage: 100 },
        ],
      },
    ],
  },
};

/**
 * Slow propagation - continents receive data gradually
 */
export const SlowPropagation: Story = {
  args: {
    deduplicatedBlobData: sampleFirstSeenData,

    visibleContinentalPropagationData: [
      {
        continent: 'EU',
        data: [
          { time: 900, percentage: 0 },
          { time: 1500, percentage: 25 },
          { time: 1800, percentage: 50 },
          { time: 2000, percentage: 100 },
          { time: 2300, percentage: 100 },
        ],
      },
      {
        continent: 'NA',
        data: [
          { time: 900, percentage: 0 },
          { time: 1600, percentage: 20 },
          { time: 1900, percentage: 60 },
          { time: 2100, percentage: 100 },
          { time: 2300, percentage: 100 },
        ],
      },
    ],
  },
};

/**
 * Synchronized propagation - all continents at same rate
 */
export const SynchronizedPropagation: Story = {
  args: {
    deduplicatedBlobData: sampleFirstSeenData,

    visibleContinentalPropagationData: [
      {
        continent: 'EU',
        data: [
          { time: 900, percentage: 0 },
          { time: 1400, percentage: 50 },
          { time: 1600, percentage: 100 },
          { time: 2300, percentage: 100 },
        ],
      },
      {
        continent: 'NA',
        data: [
          { time: 900, percentage: 0 },
          { time: 1400, percentage: 50 },
          { time: 1600, percentage: 100 },
          { time: 2300, percentage: 100 },
        ],
      },
      {
        continent: 'AS',
        data: [
          { time: 900, percentage: 0 },
          { time: 1400, percentage: 50 },
          { time: 1600, percentage: 100 },
          { time: 2300, percentage: 100 },
        ],
      },
    ],
  },
};

/**
 * Staggered start - continents begin receiving at different times
 */
export const StaggeredStart: Story = {
  args: {
    deduplicatedBlobData: sampleFirstSeenData,

    visibleContinentalPropagationData: [
      {
        continent: 'EU',
        data: [
          { time: 900, percentage: 0 },
          { time: 1000, percentage: 100 },
          { time: 2300, percentage: 100 },
        ],
      },
      {
        continent: 'NA',
        data: [
          { time: 900, percentage: 0 },
          { time: 1300, percentage: 0 },
          { time: 1500, percentage: 100 },
          { time: 2300, percentage: 100 },
        ],
      },
      {
        continent: 'AS',
        data: [
          { time: 900, percentage: 0 },
          { time: 1600, percentage: 0 },
          { time: 1900, percentage: 100 },
          { time: 2300, percentage: 100 },
        ],
      },
    ],
  },
};

/**
 * Partial completion - some continents don't reach 100%
 */
export const PartialCompletion: Story = {
  args: {
    deduplicatedBlobData: sampleFirstSeenData,

    visibleContinentalPropagationData: [
      {
        continent: 'EU',
        data: [
          { time: 900, percentage: 0 },
          { time: 1400, percentage: 100 },
          { time: 2300, percentage: 100 },
        ],
      },
      {
        continent: 'NA',
        data: [
          { time: 900, percentage: 0 },
          { time: 1600, percentage: 75 },
          { time: 2300, percentage: 75 },
        ],
      },
      {
        continent: 'OC',
        data: [
          { time: 900, percentage: 0 },
          { time: 1800, percentage: 50 },
          { time: 2300, percentage: 50 },
        ],
      },
    ],
  },
};

/**
 * Only first seen and availability data, no propagation
 */
export const NoPropagationData: Story = {
  args: {
    deduplicatedBlobData: sampleFirstSeenData,

    visibleContinentalPropagationData: [],
  },
};

/**
 * Early phase - showing data up to 1 second
 */
export const EarlyPhase: Story = {
  name: 'Early Phase (1s)',
  args: {
    currentTime: 1000,
    deduplicatedBlobData: sampleFirstSeenData,

    visibleContinentalPropagationData: allContinentsPropagationData,
  },
};

/**
 * Peak phase - showing data up to 1.5 seconds
 */
export const PeakPhase: Story = {
  name: 'Peak Phase (1.5s)',
  args: {
    currentTime: 1500,
    deduplicatedBlobData: sampleFirstSeenData,

    visibleContinentalPropagationData: allContinentsPropagationData,
  },
};

/**
 * Complete phase - all data visible
 */
export const CompletePhase: Story = {
  name: 'Complete Phase (12s)',
  args: {
    currentTime: 12000,
    deduplicatedBlobData: sampleFirstSeenData,

    visibleContinentalPropagationData: allContinentsPropagationData,
  },
};

/**
 * Very early - no blobs seen yet
 */
export const VeryEarly: Story = {
  name: 'Very Early (0.5s)',
  args: {
    currentTime: 500,
    deduplicatedBlobData: sampleFirstSeenData,

    visibleContinentalPropagationData: allContinentsPropagationData,
  },
};
