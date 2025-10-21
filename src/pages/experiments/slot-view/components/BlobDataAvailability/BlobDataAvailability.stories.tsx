import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { BlobDataAvailability } from './BlobDataAvailability';

const meta: Meta<typeof BlobDataAvailability> = {
  title: 'Pages/Experiments/SlotView/BlobDataAvailability',
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
  { time: 1.42, blobId: '0', color: '#06b6d4' },
  { time: 1.37, blobId: '1', color: '#ec4899' },
  { time: 1.37, blobId: '2', color: '#22c55e' },
  { time: 1.6, blobId: '3', color: '#3b82f6' },
  { time: 1.8, blobId: '4', color: '#a855f7' },
  { time: 1.2, blobId: '5', color: '#f59e0b' },
  { time: 0.9, blobId: 'B', color: '#ef4444' },
];

const sampleAvailabilityRateData = [
  { time: 0, nodes: 0 },
  { time: 0.5, nodes: 2 },
  { time: 1.0, nodes: 24 },
  { time: 1.2, nodes: 25 },
  { time: 1.5, nodes: 18 },
  { time: 2.0, nodes: 12 },
  { time: 3.0, nodes: 8 },
  { time: 4.0, nodes: 5 },
  { time: 6.0, nodes: 3 },
  { time: 8.0, nodes: 2 },
  { time: 10.0, nodes: 1 },
  { time: 12.0, nodes: 0 },
];

const allContinentsPropagationData = [
  {
    continent: 'EU',
    color: '#ec4899',
    data: [
      { time: 0.9, percentage: 0 },
      { time: 1.2, percentage: 75 },
      { time: 1.4, percentage: 100 },
      { time: 2.3, percentage: 100 },
    ],
  },
  {
    continent: 'NA',
    color: '#22c55e',
    data: [
      { time: 0.9, percentage: 0 },
      { time: 1.3, percentage: 60 },
      { time: 1.5, percentage: 100 },
      { time: 2.3, percentage: 100 },
    ],
  },
  {
    continent: 'AS',
    color: '#06b6d4',
    data: [
      { time: 0.9, percentage: 0 },
      { time: 1.4, percentage: 45 },
      { time: 1.7, percentage: 100 },
      { time: 2.3, percentage: 100 },
    ],
  },
  {
    continent: 'OC',
    color: '#3b82f6',
    data: [
      { time: 0.9, percentage: 0 },
      { time: 1.6, percentage: 30 },
      { time: 1.9, percentage: 100 },
      { time: 2.3, percentage: 100 },
    ],
  },
  {
    continent: 'SA',
    color: '#f59e0b',
    data: [
      { time: 0.9, percentage: 0 },
      { time: 1.5, percentage: 40 },
      { time: 1.8, percentage: 100 },
      { time: 2.3, percentage: 100 },
    ],
  },
  {
    continent: 'AF',
    color: '#a855f7',
    data: [
      { time: 0.9, percentage: 0 },
      { time: 1.7, percentage: 25 },
      { time: 2.0, percentage: 100 },
      { time: 2.3, percentage: 100 },
    ],
  },
];

/**
 * Default story with all continents showing blob data propagation up to 2.5s
 */
export const Default: Story = {
  args: {
    currentTime: 2.5,
    firstSeenData: sampleFirstSeenData,
    availabilityRateData: sampleAvailabilityRateData,
    continentalPropagationData: allContinentsPropagationData,
  },
};

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
          const next = prev + 0.1;
          if (next >= 12) {
            setIsPlaying(false);
            return 12;
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
          <span className="text-sm text-muted">Current time: {currentTime.toFixed(1)}s</span>
        </div>
        <BlobDataAvailability
          currentTime={currentTime}
          firstSeenData={sampleFirstSeenData}
          availabilityRateData={sampleAvailabilityRateData}
          continentalPropagationData={allContinentsPropagationData}
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
    firstSeenData: sampleFirstSeenData,
    availabilityRateData: sampleAvailabilityRateData,
    continentalPropagationData: allContinentsPropagationData,
  },
};

/**
 * Empty state - no data available
 */
export const Empty: Story = {
  args: {
    firstSeenData: [],
    availabilityRateData: [],
    continentalPropagationData: [],
  },
};

/**
 * Single continent propagation
 */
export const SingleContinent: Story = {
  args: {
    firstSeenData: [
      { time: 1.42, blobId: '0', color: '#06b6d4' },
      { time: 1.37, blobId: '1', color: '#ec4899' },
      { time: 1.37, blobId: '2', color: '#22c55e' },
    ],
    availabilityRateData: sampleAvailabilityRateData,
    continentalPropagationData: [
      {
        continent: 'EU',
        color: '#ec4899',
        data: [
          { time: 0.9, percentage: 0 },
          { time: 1.2, percentage: 50 },
          { time: 1.4, percentage: 100 },
          { time: 2.3, percentage: 100 },
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
    firstSeenData: sampleFirstSeenData,
    availabilityRateData: sampleAvailabilityRateData,
    continentalPropagationData: [
      {
        continent: 'EU',
        color: '#ec4899',
        data: [
          { time: 0.9, percentage: 0 },
          { time: 1.2, percentage: 100 },
          { time: 2.3, percentage: 100 },
        ],
      },
      {
        continent: 'AS',
        color: '#06b6d4',
        data: [
          { time: 0.9, percentage: 0 },
          { time: 1.8, percentage: 100 },
          { time: 2.3, percentage: 100 },
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
    firstSeenData: sampleFirstSeenData,
    availabilityRateData: sampleAvailabilityRateData,
    continentalPropagationData: [
      {
        continent: 'EU',
        data: [
          { time: 0.9, percentage: 0 },
          { time: 1.1, percentage: 100 },
          { time: 2.3, percentage: 100 },
        ],
      },
      {
        continent: 'NA',
        data: [
          { time: 0.9, percentage: 0 },
          { time: 1.15, percentage: 100 },
          { time: 2.3, percentage: 100 },
        ],
      },
      {
        continent: 'AS',
        data: [
          { time: 0.9, percentage: 0 },
          { time: 1.2, percentage: 100 },
          { time: 2.3, percentage: 100 },
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
    firstSeenData: sampleFirstSeenData,
    availabilityRateData: sampleAvailabilityRateData,
    continentalPropagationData: [
      {
        continent: 'EU',
        data: [
          { time: 0.9, percentage: 0 },
          { time: 1.5, percentage: 25 },
          { time: 1.8, percentage: 50 },
          { time: 2.0, percentage: 100 },
          { time: 2.3, percentage: 100 },
        ],
      },
      {
        continent: 'NA',
        data: [
          { time: 0.9, percentage: 0 },
          { time: 1.6, percentage: 20 },
          { time: 1.9, percentage: 60 },
          { time: 2.1, percentage: 100 },
          { time: 2.3, percentage: 100 },
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
    firstSeenData: sampleFirstSeenData,
    availabilityRateData: sampleAvailabilityRateData,
    continentalPropagationData: [
      {
        continent: 'EU',
        data: [
          { time: 0.9, percentage: 0 },
          { time: 1.4, percentage: 50 },
          { time: 1.6, percentage: 100 },
          { time: 2.3, percentage: 100 },
        ],
      },
      {
        continent: 'NA',
        data: [
          { time: 0.9, percentage: 0 },
          { time: 1.4, percentage: 50 },
          { time: 1.6, percentage: 100 },
          { time: 2.3, percentage: 100 },
        ],
      },
      {
        continent: 'AS',
        data: [
          { time: 0.9, percentage: 0 },
          { time: 1.4, percentage: 50 },
          { time: 1.6, percentage: 100 },
          { time: 2.3, percentage: 100 },
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
    firstSeenData: sampleFirstSeenData,
    availabilityRateData: sampleAvailabilityRateData,
    continentalPropagationData: [
      {
        continent: 'EU',
        data: [
          { time: 0.9, percentage: 0 },
          { time: 1.0, percentage: 100 },
          { time: 2.3, percentage: 100 },
        ],
      },
      {
        continent: 'NA',
        data: [
          { time: 0.9, percentage: 0 },
          { time: 1.3, percentage: 0 },
          { time: 1.5, percentage: 100 },
          { time: 2.3, percentage: 100 },
        ],
      },
      {
        continent: 'AS',
        data: [
          { time: 0.9, percentage: 0 },
          { time: 1.6, percentage: 0 },
          { time: 1.9, percentage: 100 },
          { time: 2.3, percentage: 100 },
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
    firstSeenData: sampleFirstSeenData,
    availabilityRateData: sampleAvailabilityRateData,
    continentalPropagationData: [
      {
        continent: 'EU',
        data: [
          { time: 0.9, percentage: 0 },
          { time: 1.4, percentage: 100 },
          { time: 2.3, percentage: 100 },
        ],
      },
      {
        continent: 'NA',
        data: [
          { time: 0.9, percentage: 0 },
          { time: 1.6, percentage: 75 },
          { time: 2.3, percentage: 75 },
        ],
      },
      {
        continent: 'OC',
        data: [
          { time: 0.9, percentage: 0 },
          { time: 1.8, percentage: 50 },
          { time: 2.3, percentage: 50 },
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
    firstSeenData: sampleFirstSeenData,
    availabilityRateData: sampleAvailabilityRateData,
    continentalPropagationData: [],
  },
};

/**
 * Early phase - showing data up to 1 second
 */
export const EarlyPhase: Story = {
  name: 'Early Phase (1s)',
  args: {
    currentTime: 1.0,
    firstSeenData: sampleFirstSeenData,
    availabilityRateData: sampleAvailabilityRateData,
    continentalPropagationData: allContinentsPropagationData,
  },
};

/**
 * Peak phase - showing data up to 1.5 seconds
 */
export const PeakPhase: Story = {
  name: 'Peak Phase (1.5s)',
  args: {
    currentTime: 1.5,
    firstSeenData: sampleFirstSeenData,
    availabilityRateData: sampleAvailabilityRateData,
    continentalPropagationData: allContinentsPropagationData,
  },
};

/**
 * Complete phase - all data visible
 */
export const CompletePhase: Story = {
  name: 'Complete Phase (12s)',
  args: {
    currentTime: 12.0,
    firstSeenData: sampleFirstSeenData,
    availabilityRateData: sampleAvailabilityRateData,
    continentalPropagationData: allContinentsPropagationData,
  },
};

/**
 * Very early - no blobs seen yet
 */
export const VeryEarly: Story = {
  name: 'Very Early (0.5s)',
  args: {
    currentTime: 0.5,
    firstSeenData: sampleFirstSeenData,
    availabilityRateData: sampleAvailabilityRateData,
    continentalPropagationData: allContinentsPropagationData,
  },
};
