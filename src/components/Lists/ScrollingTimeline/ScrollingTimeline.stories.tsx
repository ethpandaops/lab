import { useState, useEffect } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScrollingTimeline } from './ScrollingTimeline';
import type { TimelineItem } from './ScrollingTimeline.types';
import { Badge } from '@/components/Elements/Badge';

const meta = {
  title: 'Components/Lists/ScrollingTimeline',
  component: ScrollingTimeline,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
  argTypes: {
    currentTime: {
      control: 'number',
    },
    height: {
      control: 'text',
    },
    autoScroll: {
      control: 'boolean',
    },
  },
} satisfies Meta<typeof ScrollingTimeline>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sample data for Ethereum slot timeline
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
    timestamp: 1.2,
    content: (
      <div className="flex items-center gap-2">
        <span>Blob 2 in</span>
        <span className="font-medium">Germany</span>
      </div>
    ),
  },
  {
    id: '3',
    timestamp: 1.4,
    content: (
      <div className="flex items-center gap-2">
        <span>Blob 1 in</span>
        <span className="font-medium">Finland</span>
      </div>
    ),
  },
  {
    id: '4',
    timestamp: 1.6,
    content: (
      <div className="flex items-center gap-2">
        <span>Blob 5 in</span>
        <span className="font-medium">The Netherlands</span>
      </div>
    ),
  },
  {
    id: '5',
    timestamp: 2.1,
    content: (
      <div className="flex items-center gap-2">
        <span>Blob 3 in</span>
        <span className="font-medium">Cyprus</span>
      </div>
    ),
  },
  {
    id: '6',
    timestamp: 3.5,
    content: (
      <div className="flex items-center gap-2">
        <span>Blob 6 in</span>
        <span className="font-medium">Finland</span>
      </div>
    ),
  },
  {
    id: '7',
    timestamp: 4.2,
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
    timestamp: 4.8,
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
    timestamp: 6.5,
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
    timestamp: 8.3,
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
    timestamp: 9.1,
    content: (
      <div className="flex items-center gap-2">
        <span>Blob 4 in</span>
        <span className="font-medium">Germany</span>
      </div>
    ),
  },
  {
    id: '12',
    timestamp: 10.5,
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
    items: ethereumEvents,
    currentTime: 4.5,
    height: '500px',
    autoScroll: true,
  },
};

export const WithAutoScrolling: Story = {
  args: {
    items: ethereumEvents,
    currentTime: 0,
  },
  render: () => {
    const [currentTime, setCurrentTime] = useState(0);
    const [isPlaying, setIsPlaying] = useState(true);

    useEffect(() => {
      if (!isPlaying) return;

      const interval = setInterval(() => {
        setCurrentTime(prev => {
          const next = prev + 0.1;
          if (next > 12) return 0;
          return next;
        });
      }, 100);

      return () => clearInterval(interval);
    }, [isPlaying]);

    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="text-sm/6 text-muted">
            Current Time: <span className="font-medium text-foreground">{currentTime.toFixed(1)}s</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="rounded-sm bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90"
            >
              {isPlaying ? 'Pause' : 'Play'}
            </button>
            <button
              onClick={() => setCurrentTime(0)}
              className="rounded-sm bg-muted/20 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted/30"
            >
              Reset
            </button>
          </div>
        </div>
        <ScrollingTimeline items={ethereumEvents} currentTime={currentTime} height="500px" />
      </div>
    );
  },
};

export const WithCustomFormatting: Story = {
  args: {
    items: ethereumEvents,
    currentTime: 5.0,
    height: '500px',
    formatTime: (timestamp: number) => {
      const minutes = Math.floor(timestamp / 60);
      const seconds = timestamp % 60;
      return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`;
    },
  },
};

export const DisabledAutoScroll: Story = {
  args: {
    items: ethereumEvents,
    currentTime: 4.5,
    height: '500px',
    autoScroll: false,
  },
};

export const ShortList: Story = {
  args: {
    items: ethereumEvents.slice(0, 5),
    currentTime: 1.5,
    height: '300px',
  },
};

export const TallContainer: Story = {
  args: {
    items: ethereumEvents,
    currentTime: 6.0,
    height: '700px',
  },
};

export const WithExplicitStatus: Story = {
  args: {
    items: [
      {
        id: '1',
        timestamp: 0,
        content: 'Completed event',
        status: 'completed',
      },
      {
        id: '2',
        timestamp: 1,
        content: 'Active event (highlighted)',
        status: 'active',
      },
      {
        id: '3',
        timestamp: 2,
        content: 'Another completed event',
        status: 'completed',
      },
      {
        id: '4',
        timestamp: 3,
        content: 'Pending event (dimmed)',
        status: 'pending',
      },
      {
        id: '5',
        timestamp: 4,
        content: 'Another pending event',
        status: 'pending',
      },
    ] as TimelineItem[],
    currentTime: 0,
    height: '400px',
  },
};
