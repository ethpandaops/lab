import type { Meta, StoryObj } from '@storybook/react-vite';
import {
  CursorArrowRaysIcon,
  EnvelopeOpenIcon,
  UsersIcon,
  FireIcon,
  BoltIcon,
  ArrowsRightLeftIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { Stats } from './Stats';

const meta = {
  title: 'Components/DataDisplay/Stats',
  component: Stats,
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
} satisfies Meta<typeof Stats>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Last 30 days',
    stats: [
      {
        id: 1,
        name: 'Total Subscribers',
        value: '71,897',
        icon: UsersIcon,
        delta: {
          value: '122',
          type: 'increase',
        },
        link: {
          to: '/',
          label: 'View all',
        },
      },
      {
        id: 2,
        name: 'Avg. Open Rate',
        value: '58.16%',
        icon: EnvelopeOpenIcon,
        delta: {
          value: '5.4%',
          type: 'increase',
        },
        link: {
          to: '/',
          label: 'View all',
        },
      },
      {
        id: 3,
        name: 'Avg. Click Rate',
        value: '24.57%',
        icon: CursorArrowRaysIcon,
        delta: {
          value: '3.2%',
          type: 'decrease',
        },
        link: {
          to: '/',
          label: 'View all',
        },
      },
    ],
  },
};

export const WithoutTitle: Story = {
  args: {
    stats: [
      {
        id: 1,
        name: 'Total Subscribers',
        value: '71,897',
        icon: UsersIcon,
        delta: {
          value: '122',
          type: 'increase',
        },
      },
      {
        id: 2,
        name: 'Avg. Open Rate',
        value: '58.16%',
        icon: EnvelopeOpenIcon,
        delta: {
          value: '5.4%',
          type: 'increase',
        },
      },
    ],
  },
};

export const WithoutIcons: Story = {
  args: {
    title: 'Performance Metrics',
    stats: [
      {
        id: 1,
        name: 'Total Users',
        value: '12,345',
        delta: {
          value: '8.2%',
          type: 'increase',
        },
        link: {
          to: '/',
          label: 'View details',
        },
      },
      {
        id: 2,
        name: 'Revenue',
        value: '$54,321',
        delta: {
          value: '12.5%',
          type: 'increase',
        },
      },
      {
        id: 3,
        name: 'Conversion Rate',
        value: '3.2%',
        delta: {
          value: '0.8%',
          type: 'decrease',
        },
      },
    ],
  },
};

export const WithoutDelta: Story = {
  args: {
    title: 'Current Stats',
    stats: [
      {
        id: 1,
        name: 'Active Users',
        value: '8,432',
        icon: UsersIcon,
        link: {
          to: '/',
          label: 'View all',
        },
      },
      {
        id: 2,
        name: 'Total Revenue',
        value: '$123,456',
        icon: EnvelopeOpenIcon,
      },
    ],
  },
};

export const MinimalStats: Story = {
  args: {
    stats: [
      {
        id: 1,
        name: 'Users',
        value: '1,234',
      },
      {
        id: 2,
        name: 'Sessions',
        value: '5,678',
      },
      {
        id: 3,
        name: 'Pageviews',
        value: '12,345',
      },
    ],
  },
};

export const NeutralDelta: Story = {
  args: {
    title: 'Mixed Performance',
    stats: [
      {
        id: 1,
        name: 'Subscribers',
        value: '10,000',
        icon: UsersIcon,
        delta: {
          value: '0%',
          type: 'neutral',
        },
      },
      {
        id: 2,
        name: 'Open Rate',
        value: '45%',
        icon: EnvelopeOpenIcon,
        delta: {
          value: '2%',
          type: 'increase',
        },
      },
      {
        id: 3,
        name: 'Bounce Rate',
        value: '12%',
        icon: CursorArrowRaysIcon,
        delta: {
          value: '1%',
          type: 'decrease',
        },
      },
    ],
  },
};

export const SingleStat: Story = {
  args: {
    title: 'Featured Metric',
    stats: [
      {
        id: 1,
        name: 'Total Revenue',
        value: '$1,234,567',
        icon: UsersIcon,
        delta: {
          value: '23.5%',
          type: 'increase',
        },
        link: {
          to: '/',
          label: 'View breakdown',
        },
      },
    ],
  },
};

/** Enhanced style with iconColor, valueClassName, subtitle, and accentColor */
export const EnhancedStyle: Story = {
  args: {
    gridClassName: 'grid grid-cols-2 gap-3 lg:grid-cols-4',
    stats: [
      {
        id: 'gas-impact',
        name: 'Gas Impact',
        value: '+59.8%',
        icon: FireIcon,
        iconColor: '#ef4444',
        valueClassName: 'text-red-500',
        subtitle: '111.4M → 178.0M',
        accentColor: '#ef44444D',
      },
      {
        id: 'transactions',
        name: 'Transactions',
        value: '1,357',
        icon: BoltIcon,
        iconColor: '#3b82f6',
        subtitle: 'across 5 blocks',
        accentColor: '#3b82f633',
      },
      {
        id: 'diverged',
        name: 'Diverged',
        value: '641',
        icon: ArrowsRightLeftIcon,
        iconColor: '#f59e0b',
        valueClassName: 'text-amber-500',
        subtitle: '47.2% of txs',
        accentColor: '#f59e0b33',
      },
      {
        id: 'status',
        name: 'Status Changes',
        value: '633',
        icon: ExclamationTriangleIcon,
        iconColor: '#ef4444',
        valueClassName: 'text-red-500',
        subtitle: 'transactions changed outcome',
        accentColor: '#ef444433',
      },
    ],
  },
};

/** Enhanced style with all-green healthy state */
export const EnhancedHealthy: Story = {
  args: {
    gridClassName: 'grid grid-cols-3 gap-3',
    stats: [
      {
        id: 'diverged',
        name: 'Diverged',
        value: '0',
        icon: ArrowsRightLeftIcon,
        iconColor: '#22c55e',
        subtitle: '0% of txs',
        accentColor: '#22c55e33',
      },
      {
        id: 'status',
        name: 'Status Changes',
        value: '0',
        icon: ExclamationTriangleIcon,
        iconColor: '#22c55e',
        subtitle: 'all outcomes preserved',
        accentColor: '#22c55e33',
      },
      {
        id: 'reverts',
        name: 'Internal Reverts',
        value: '-12',
        icon: CursorArrowRaysIcon,
        iconColor: '#22c55e',
        valueClassName: 'text-green-500',
        subtitle: '24 → 12 total',
        accentColor: '#22c55e33',
      },
    ],
  },
};
