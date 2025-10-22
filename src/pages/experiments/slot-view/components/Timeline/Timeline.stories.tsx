import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { Timeline } from './Timeline';
import { DEFAULT_BEACON_SLOT_PHASES } from '@/utils/beacon';

const meta = {
  title: 'Pages/Experiments/SlotView/Timeline',
  component: Timeline,
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
} satisfies Meta<typeof Timeline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 9.0,
    isPlaying: false,
    isLive: true,
    title: 'Timeline',
  },
};

export const Interactive: Story = {
  name: 'Interactive with Controls',
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 9.0,
    isPlaying: false,
    isLive: true,
    title: 'Timeline',
  },
  render: () => {
    const [currentTime, setCurrentTime] = useState(9.0);
    const [isPlaying, setIsPlaying] = useState(false);

    const handlePlayPause = (): void => {
      setIsPlaying(!isPlaying);
    };

    const handleBackward = (): void => {
      setCurrentTime(prev => Math.max(0, prev - 1));
    };

    const handleForward = (): void => {
      setCurrentTime(prev => Math.min(12, prev + 1));
    };

    const handleTimeClick = (timeMs: number): void => {
      setCurrentTime(timeMs / 1000);
      setIsPlaying(false);
    };

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
      <Timeline
        phases={DEFAULT_BEACON_SLOT_PHASES}
        currentTime={currentTime}
        isPlaying={isPlaying}
        isLive={true}
        onPlayPause={handlePlayPause}
        onBackward={handleBackward}
        onForward={handleForward}
        onTimeClick={handleTimeClick}
      />
    );
  },
};

export const NotLive: Story = {
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 5.5,
    isPlaying: false,
    isLive: false,
    title: 'Timeline',
  },
};

export const Playing: Story = {
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 6.3,
    isPlaying: true,
    isLive: true,
    title: 'Timeline',
  },
};

export const EarlyPhase: Story = {
  name: 'Early Phase (Block Proposal)',
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 2.0,
    isPlaying: false,
    isLive: true,
    title: 'Timeline',
  },
};

export const LatePhase: Story = {
  name: 'Late Phase (Aggregation)',
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 10.5,
    isPlaying: false,
    isLive: true,
    title: 'Timeline',
  },
};

export const Complete: Story = {
  name: 'Slot Complete',
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 12.0,
    isPlaying: false,
    isLive: false,
    title: 'Timeline',
  },
};

export const CustomTitle: Story = {
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 7.2,
    isPlaying: false,
    isLive: true,
    title: 'Slot 1234567',
  },
};
