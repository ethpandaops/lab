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
  { time: 1420, blobId: '0', color: '#06b6d4' },
  { time: 1370, blobId: '1', color: '#ec4899' },
  { time: 1370, blobId: '2', color: '#22c55e' },
  { time: 1600, blobId: '3', color: '#3b82f6' },
  { time: 1800, blobId: '4', color: '#a855f7' },
  { time: 1200, blobId: '5', color: '#f59e0b' },
  { time: 900, blobId: 'B', color: '#ef4444' },
];

// Generate availability rate data with smooth curve - data point every 50ms
const generateAvailabilityRateData = (): Array<{ time: number; nodes: number }> => {
  const data = [];
  const interval = 50; // 50ms intervals
  const maxTime = 12000;

  for (let time = 0; time <= maxTime; time += interval) {
    let nodes = 0;

    // Smooth curve: rapid rise to peak at ~1s, then gradual decay
    if (time < 500) {
      // Slow start
      nodes = Math.round((time / 1000) * 4);
    } else if (time < 1000) {
      // Rapid rise
      nodes = Math.round(2 + ((time - 500) / 1000) * 44);
    } else if (time < 1200) {
      // Peak plateau
      nodes = 25;
    } else if (time < 2000) {
      // Initial decay
      nodes = Math.round(25 - ((time - 1200) / 800) * 13);
    } else if (time < 4000) {
      // Gradual decay
      nodes = Math.round(12 - ((time - 2000) / 2000) * 7);
    } else if (time < 8000) {
      // Slow decay
      nodes = Math.round(5 - ((time - 4000) / 4000) * 3);
    } else if (time < 10000) {
      // Very slow decay
      nodes = 2;
    } else if (time < 12000) {
      // Final decay
      nodes = 1;
    } else {
      nodes = 0;
    }

    data.push({
      time,
      nodes: Math.max(0, nodes),
    });
  }

  return data;
};

const sampleAvailabilityRateData = generateAvailabilityRateData();

const allContinentsPropagationData = [
  {
    continent: 'EU',
    color: '#ec4899',
    data: [
      { time: 900, percentage: 0 },
      { time: 1200, percentage: 75 },
      { time: 1400, percentage: 100 },
      { time: 2300, percentage: 100 },
    ],
  },
  {
    continent: 'NA',
    color: '#22c55e',
    data: [
      { time: 900, percentage: 0 },
      { time: 1300, percentage: 60 },
      { time: 1500, percentage: 100 },
      { time: 2300, percentage: 100 },
    ],
  },
  {
    continent: 'AS',
    color: '#06b6d4',
    data: [
      { time: 900, percentage: 0 },
      { time: 1400, percentage: 45 },
      { time: 1700, percentage: 100 },
      { time: 2300, percentage: 100 },
    ],
  },
  {
    continent: 'OC',
    color: '#3b82f6',
    data: [
      { time: 900, percentage: 0 },
      { time: 1600, percentage: 30 },
      { time: 1900, percentage: 100 },
      { time: 2300, percentage: 100 },
    ],
  },
  {
    continent: 'SA',
    color: '#f59e0b',
    data: [
      { time: 900, percentage: 0 },
      { time: 1500, percentage: 40 },
      { time: 1800, percentage: 100 },
      { time: 2300, percentage: 100 },
    ],
  },
  {
    continent: 'AF',
    color: '#a855f7',
    data: [
      { time: 900, percentage: 0 },
      { time: 1700, percentage: 25 },
      { time: 2000, percentage: 100 },
      { time: 2300, percentage: 100 },
    ],
  },
];

/**
 * Default story with all continents showing blob data propagation up to 2.5s
 */
export const Default: Story = {
  args: {
    currentTime: 2500,
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
          <span className="text-sm text-muted">Current time: {(currentTime / 1000).toFixed(1)}s</span>
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
      { time: 1420, blobId: '0', color: '#06b6d4' },
      { time: 1370, blobId: '1', color: '#ec4899' },
      { time: 1370, blobId: '2', color: '#22c55e' },
    ],
    availabilityRateData: sampleAvailabilityRateData,
    continentalPropagationData: [
      {
        continent: 'EU',
        color: '#ec4899',
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
    firstSeenData: sampleFirstSeenData,
    availabilityRateData: sampleAvailabilityRateData,
    continentalPropagationData: [
      {
        continent: 'EU',
        color: '#ec4899',
        data: [
          { time: 900, percentage: 0 },
          { time: 1200, percentage: 100 },
          { time: 2300, percentage: 100 },
        ],
      },
      {
        continent: 'AS',
        color: '#06b6d4',
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
    firstSeenData: sampleFirstSeenData,
    availabilityRateData: sampleAvailabilityRateData,
    continentalPropagationData: [
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
    firstSeenData: sampleFirstSeenData,
    availabilityRateData: sampleAvailabilityRateData,
    continentalPropagationData: [
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
    firstSeenData: sampleFirstSeenData,
    availabilityRateData: sampleAvailabilityRateData,
    continentalPropagationData: [
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
    firstSeenData: sampleFirstSeenData,
    availabilityRateData: sampleAvailabilityRateData,
    continentalPropagationData: [
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
    firstSeenData: sampleFirstSeenData,
    availabilityRateData: sampleAvailabilityRateData,
    continentalPropagationData: [
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
    currentTime: 1000,
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
    currentTime: 1500,
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
    currentTime: 12000,
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
    currentTime: 500,
    firstSeenData: sampleFirstSeenData,
    availabilityRateData: sampleAvailabilityRateData,
    continentalPropagationData: allContinentsPropagationData,
  },
};
