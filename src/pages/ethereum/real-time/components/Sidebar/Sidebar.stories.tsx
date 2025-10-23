import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect, useState } from 'react';
import { Sidebar } from './Sidebar';
import { DEFAULT_BEACON_SLOT_PHASES } from '@/utils/beacon';
import type { TimelineItem } from '@/components/Lists/ScrollingTimeline/ScrollingTimeline.types';
import { Badge } from '@/components/Elements/Badge';

const meta = {
  title: 'Pages/Experiments/SlotView/Sidebar',
  component: Sidebar,
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
} satisfies Meta<typeof Sidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sample timeline items for the scrolling timeline
const ethereumEvents: TimelineItem[] = [
  {
    id: '1',
    timestamp: 0,
    content: (
      <div className="flex items-center gap-2">
        <span>Blob 0 in</span>
        <span className="font-medium">The Netherlands</span>
      </div>
    ),
  },
  {
    id: '2',
    timestamp: 1200,
    content: (
      <div className="flex items-center gap-2">
        <span>Blob 2 in</span>
        <span className="font-medium">Germany</span>
      </div>
    ),
  },
  {
    id: '3',
    timestamp: 1400,
    content: (
      <div className="flex items-center gap-2">
        <span>Blob 1 in</span>
        <span className="font-medium">Finland</span>
      </div>
    ),
  },
  {
    id: '4',
    timestamp: 1600,
    content: (
      <div className="flex items-center gap-2">
        <span>Blob 5 in</span>
        <span className="font-medium">The Netherlands</span>
      </div>
    ),
  },
  {
    id: '5',
    timestamp: 2100,
    content: (
      <div className="flex items-center gap-2">
        <span>Blob 3 in</span>
        <span className="font-medium">Cyprus</span>
      </div>
    ),
  },
  {
    id: '6',
    timestamp: 3500,
    content: (
      <div className="flex items-center gap-2">
        <span>Blob 6 in</span>
        <span className="font-medium">Finland</span>
      </div>
    ),
  },
  {
    id: '7',
    timestamp: 4200,
    content: (
      <div className="flex items-center gap-2">
        <Badge color="blue" variant="border" size="small">
          Attestation
        </Badge>
        <span>from validator</span>
        <span className="font-medium">12345</span>
      </div>
    ),
  },
  {
    id: '8',
    timestamp: 4800,
    content: (
      <div className="flex items-center gap-2">
        <Badge color="green" variant="border" size="small">
          Block
        </Badge>
        <span>proposed by</span>
        <span className="font-medium">67890</span>
      </div>
    ),
  },
  {
    id: '9',
    timestamp: 6500,
    content: (
      <div className="flex items-center gap-2">
        <Badge color="purple" variant="border" size="small">
          Aggregation
        </Badge>
        <span>started for slot</span>
        <span className="font-medium">1234567</span>
      </div>
    ),
  },
  {
    id: '10',
    timestamp: 8300,
    content: (
      <div className="flex items-center gap-2">
        <Badge color="yellow" variant="border" size="small">
          Sync
        </Badge>
        <span>committee message from</span>
        <span className="font-medium">Netherlands</span>
      </div>
    ),
  },
  {
    id: '11',
    timestamp: 9100,
    content: (
      <div className="flex items-center gap-2">
        <span>Blob 4 in</span>
        <span className="font-medium">Germany</span>
      </div>
    ),
  },
  {
    id: '12',
    timestamp: 10500,
    content: (
      <div className="flex items-center gap-2">
        <Badge color="indigo" variant="border" size="small">
          Finalized
        </Badge>
        <span>Epoch</span>
        <span className="font-medium">98765</span>
      </div>
    ),
  },
];

export const Default: Story = {
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 6000,
    items: ethereumEvents,
    isPlaying: false,
    isLive: true,
  },
};

export const Interactive: Story = {
  name: 'Interactive with Controls',
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 4000,
    items: ethereumEvents,
    isPlaying: false,
    isLive: true,
  },
  render: () => {
    const [currentTime, setCurrentTime] = useState(4000);
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
      <Sidebar
        phases={DEFAULT_BEACON_SLOT_PHASES}
        currentTime={currentTime}
        items={ethereumEvents}
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

export const EarlyPhase: Story = {
  name: 'Early Phase (Block)',
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 2000,
    items: ethereumEvents,
    isPlaying: false,
    isLive: true,
  },
};

export const MidPhase: Story = {
  name: 'Mid Phase (Attestation)',
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 6500,
    items: ethereumEvents,
    isPlaying: false,
    isLive: true,
  },
};

export const LatePhase: Story = {
  name: 'Late Phase (Aggregation)',
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 10500,
    items: ethereumEvents,
    isPlaying: false,
    isLive: true,
  },
};

export const NotLive: Story = {
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 5500,
    items: ethereumEvents,
    isPlaying: false,
    isLive: false,
  },
};

export const Playing: Story = {
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 6300,
    items: ethereumEvents,
    isPlaying: true,
    isLive: true,
  },
};

export const TallTimeline: Story = {
  name: 'Tall Scrolling Timeline',
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 6000,
    items: ethereumEvents,
    isPlaying: false,
    isLive: true,
  },
};

export const ShortTimeline: Story = {
  name: 'Short Scrolling Timeline',
  args: {
    phases: DEFAULT_BEACON_SLOT_PHASES,
    currentTime: 6000,
    items: ethereumEvents,
    isPlaying: false,
    isLive: true,
  },
};
