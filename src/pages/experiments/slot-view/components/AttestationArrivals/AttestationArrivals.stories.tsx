import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { AttestationArrivals } from './AttestationArrivals';
import type { AttestationDataPoint } from './AttestationArrivals.types';

// Generate realistic attestation arrival data
// Most attestations arrive in the first 4 seconds, with a long tail
const generateAttestationData = (): AttestationDataPoint[] => {
  return [
    { time: 0.0, count: 0 },
    { time: 0.5, count: 150 },
    { time: 1.0, count: 800 },
    { time: 1.5, count: 1200 },
    { time: 2.0, count: 1500 },
    { time: 2.5, count: 1100 },
    { time: 3.0, count: 800 },
    { time: 3.5, count: 500 },
    { time: 4.0, count: 300 },
    { time: 4.5, count: 200 },
    { time: 5.0, count: 150 },
    { time: 5.5, count: 100 },
    { time: 6.0, count: 80 },
    { time: 6.5, count: 60 },
    { time: 7.0, count: 40 },
    { time: 7.5, count: 30 },
    { time: 8.0, count: 20 },
    { time: 8.5, count: 15 },
    { time: 9.0, count: 10 },
    { time: 9.5, count: 8 },
    { time: 10.0, count: 5 },
    { time: 10.5, count: 3 },
    { time: 11.0, count: 2 },
    { time: 11.5, count: 1 },
    { time: 12.0, count: 0 },
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
    currentTime: 4.0,
    data: ATTESTATION_DATA,
    totalExpected: TOTAL_EXPECTED,
  },
};

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
        <AttestationArrivals currentTime={currentTime} data={ATTESTATION_DATA} totalExpected={TOTAL_EXPECTED} />
      </div>
    );
  },
};

export const EarlyPhase: Story = {
  name: 'Early Phase (1s)',
  args: {
    currentTime: 1.0,
    data: ATTESTATION_DATA,
    totalExpected: TOTAL_EXPECTED,
  },
};

export const PeakPhase: Story = {
  name: 'Peak Phase (2s)',
  args: {
    currentTime: 2.0,
    data: ATTESTATION_DATA,
    totalExpected: TOTAL_EXPECTED,
  },
};

export const MidPhase: Story = {
  name: 'Mid Phase (4s)',
  args: {
    currentTime: 4.0,
    data: ATTESTATION_DATA,
    totalExpected: TOTAL_EXPECTED,
  },
};

export const LatePhase: Story = {
  name: 'Late Phase (8s)',
  args: {
    currentTime: 8.0,
    data: ATTESTATION_DATA,
    totalExpected: TOTAL_EXPECTED,
  },
};

export const Complete: Story = {
  name: 'Slot Complete (12s)',
  args: {
    currentTime: 12.0,
    data: ATTESTATION_DATA,
    totalExpected: TOTAL_EXPECTED,
  },
};

export const VeryEarly: Story = {
  name: 'Very Early (0.5s)',
  args: {
    currentTime: 0.5,
    data: ATTESTATION_DATA,
    totalExpected: TOTAL_EXPECTED,
  },
};

export const NoData: Story = {
  name: 'No Attestations Yet',
  args: {
    currentTime: 0.0,
    data: ATTESTATION_DATA,
    totalExpected: TOTAL_EXPECTED,
  },
};
