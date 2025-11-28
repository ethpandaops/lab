import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { Timeline } from './Timeline';
import { DEFAULT_BEACON_SLOT_PHASES } from '@/utils/beacon';

const meta = {
  title: 'Pages/Ethereum/SlotView/Timeline',
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
    currentTime: 9000,
    isPlaying: false,
    isLive: true,
  },
};

export const Interactive: Story = {
  name: 'Interactive with Controls',
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 9000,
    isPlaying: false,
    isLive: true,
  },
  render: () => {
    const [currentTime, setCurrentTime] = useState(9000);
    const [isPlaying, setIsPlaying] = useState(false);

    const handlePlayPause = (): void => {
      setIsPlaying(!isPlaying);
    };

    const handleBackward = (): void => {
      setCurrentTime(prev => Math.max(0, prev - 1000));
    };

    const handleForward = (): void => {
      setCurrentTime(prev => Math.min(12000, prev + 1000));
    };

    const handleTimeClick = (timeMs: number): void => {
      setCurrentTime(timeMs);
      setIsPlaying(false);
    };

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
    currentTime: 5500,
    isPlaying: false,
    isLive: false,
  },
};

export const Playing: Story = {
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 6300,
    isPlaying: true,
    isLive: true,
  },
};

export const EarlyPhase: Story = {
  name: 'Early Phase (Block)',
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 2000,
    isPlaying: false,
    isLive: true,
  },
};

export const LatePhase: Story = {
  name: 'Late Phase (Aggregation)',
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 10500,
    isPlaying: false,
    isLive: true,
  },
};

export const Complete: Story = {
  name: 'Slot Complete',
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 12000,
    isPlaying: false,
    isLive: false,
  },
};

export const NoLiveIndicator: Story = {
  name: 'Without Live Indicator',
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 7200,
    isPlaying: false,
    isLive: false,
  },
};
