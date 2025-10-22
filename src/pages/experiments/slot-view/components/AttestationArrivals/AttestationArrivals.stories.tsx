import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { AttestationArrivals } from './AttestationArrivals';
import type { AttestationDataPoint } from './AttestationArrivals.types';

// Generate realistic attestation arrival data
// Most attestations arrive in the first 4 seconds, with a long tail
const generateAttestationData = (): AttestationDataPoint[] => {
  return [
    { time: 0, count: 0 },
    { time: 500, count: 150 },
    { time: 1000, count: 800 },
    { time: 1500, count: 1200 },
    { time: 2000, count: 1500 },
    { time: 2500, count: 1100 },
    { time: 3000, count: 800 },
    { time: 3500, count: 500 },
    { time: 4000, count: 300 },
    { time: 4500, count: 200 },
    { time: 5000, count: 150 },
    { time: 5500, count: 100 },
    { time: 6000, count: 80 },
    { time: 6500, count: 60 },
    { time: 7000, count: 40 },
    { time: 7500, count: 30 },
    { time: 8000, count: 20 },
    { time: 8500, count: 15 },
    { time: 9000, count: 10 },
    { time: 9500, count: 8 },
    { time: 10000, count: 5 },
    { time: 10500, count: 3 },
    { time: 11000, count: 2 },
    { time: 11500, count: 1 },
    { time: 12000, count: 0 },
  ];
};

const ATTESTATION_DATA = generateAttestationData();
const TOTAL_EXPECTED = ATTESTATION_DATA.reduce((sum, point) => sum + point.count, 0);

const meta = {
  title: 'Pages/Experiments/SlotView/AttestationArrivals',
  component: AttestationArrivals,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof AttestationArrivals>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    currentTime: 4000,
    data: ATTESTATION_DATA,
    totalExpected: TOTAL_EXPECTED,
  },
};

export const Interactive: Story = {
  name: 'Interactive with Auto-Progress',
  args: {
    currentTime: 0,
    data: ATTESTATION_DATA,
    totalExpected: TOTAL_EXPECTED,
  },
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
        <AttestationArrivals currentTime={currentTime} data={ATTESTATION_DATA} totalExpected={TOTAL_EXPECTED} />
      </div>
    );
  },
};

export const EarlyPhase: Story = {
  name: 'Early Phase (1s)',
  args: {
    currentTime: 1000,
    data: ATTESTATION_DATA,
    totalExpected: TOTAL_EXPECTED,
  },
};

export const PeakPhase: Story = {
  name: 'Peak Phase (2s)',
  args: {
    currentTime: 2000,
    data: ATTESTATION_DATA,
    totalExpected: TOTAL_EXPECTED,
  },
};

export const MidPhase: Story = {
  name: 'Mid Phase (4s)',
  args: {
    currentTime: 4000,
    data: ATTESTATION_DATA,
    totalExpected: TOTAL_EXPECTED,
  },
};

export const LatePhase: Story = {
  name: 'Late Phase (8s)',
  args: {
    currentTime: 8000,
    data: ATTESTATION_DATA,
    totalExpected: TOTAL_EXPECTED,
  },
};

export const Complete: Story = {
  name: 'Slot Complete (12s)',
  args: {
    currentTime: 12000,
    data: ATTESTATION_DATA,
    totalExpected: TOTAL_EXPECTED,
  },
};

export const VeryEarly: Story = {
  name: 'Very Early (0.5s)',
  args: {
    currentTime: 500,
    data: ATTESTATION_DATA,
    totalExpected: TOTAL_EXPECTED,
  },
};

export const NoData: Story = {
  name: 'No Attestations Yet',
  args: {
    currentTime: 0,
    data: ATTESTATION_DATA,
    totalExpected: TOTAL_EXPECTED,
  },
};
