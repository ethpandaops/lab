import type { Meta, StoryObj } from '@storybook/react-vite';
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
 * Default story with all continents showing blob data propagation
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
