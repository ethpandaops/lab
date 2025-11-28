import type { Meta, StoryObj } from '@storybook/react-vite';
import { Timestamp } from './Timestamp';

const meta = {
  title: 'Components/DataDisplay/Timestamp',
  component: Timestamp,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Timestamp>;

export default meta;
type Story = StoryObj<typeof meta>;

// Get various timestamps for stories
const now = Math.floor(Date.now() / 1000);
const twoMinutesAgo = now - 120;
const oneHourAgo = now - 3600;
const yesterday = now - 86400;
const lastWeek = now - 604800;
const lastMonth = now - 2592000;

/**
 * Default timestamp with relative time format.
 * Click on the timestamp to see all available formats.
 */
export const Default: Story = {
  args: {
    timestamp: twoMinutesAgo,
  },
};

/**
 * Timestamp showing "just now" relative time
 */
export const JustNow: Story = {
  args: {
    timestamp: now - 5,
  },
};

/**
 * Timestamp from one hour ago
 */
export const OneHourAgo: Story = {
  args: {
    timestamp: oneHourAgo,
  },
};

/**
 * Timestamp from yesterday
 */
export const Yesterday: Story = {
  args: {
    timestamp: yesterday,
  },
};

/**
 * Timestamp from last week
 */
export const LastWeek: Story = {
  args: {
    timestamp: lastWeek,
  },
};

/**
 * Timestamp from last month
 */
export const LastMonth: Story = {
  args: {
    timestamp: lastMonth,
  },
};

/**
 * Short format showing date and time
 */
export const ShortFormat: Story = {
  args: {
    timestamp: twoMinutesAgo,
    format: 'short',
  },
};

/**
 * Long format with full date and time
 */
export const LongFormat: Story = {
  args: {
    timestamp: twoMinutesAgo,
    format: 'long',
  },
};

/**
 * Custom format using render function
 */
export const CustomFormat: Story = {
  args: {
    timestamp: twoMinutesAgo,
    format: 'custom',
    children: (ts: number) => `ISO: ${new Date(ts * 1000).toISOString()}`,
  },
};

/**
 * Custom format using ReactNode
 */
export const CustomNode: Story = {
  args: {
    timestamp: twoMinutesAgo,
    format: 'custom',
    children: <span className="font-bold text-primary">Custom Timestamp Display</span>,
  },
};

/**
 * Timestamp with modal disabled - not clickable
 */
export const ModalDisabled: Story = {
  args: {
    timestamp: twoMinutesAgo,
    disableModal: true,
  },
};

/**
 * Future timestamp
 */
export const FutureTimestamp: Story = {
  args: {
    timestamp: now + 7200, // 2 hours from now
  },
};

/**
 * Multiple timestamps in a list
 */
export const MultipleTimestamps: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="w-32 text-sm/5 text-muted">Just now:</span>
        <Timestamp timestamp={now - 5} />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-32 text-sm/5 text-muted">2 minutes ago:</span>
        <Timestamp timestamp={twoMinutesAgo} />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-32 text-sm/5 text-muted">1 hour ago:</span>
        <Timestamp timestamp={oneHourAgo} />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-32 text-sm/5 text-muted">Yesterday:</span>
        <Timestamp timestamp={yesterday} />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-32 text-sm/5 text-muted">Last week:</span>
        <Timestamp timestamp={lastWeek} />
      </div>
    </div>
  ),
};

/**
 * Different formats side by side
 */
export const AllFormats: Story = {
  render: () => (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <span className="w-24 text-sm/5 text-muted">Relative:</span>
        <Timestamp timestamp={twoMinutesAgo} format="relative" />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-24 text-sm/5 text-muted">Short:</span>
        <Timestamp timestamp={twoMinutesAgo} format="short" />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-24 text-sm/5 text-muted">Long:</span>
        <Timestamp timestamp={twoMinutesAgo} format="long" />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-24 text-sm/5 text-muted">Custom:</span>
        <Timestamp timestamp={twoMinutesAgo} format="custom">
          {ts => new Date(ts * 1000).toISOString()}
        </Timestamp>
      </div>
    </div>
  ),
};
