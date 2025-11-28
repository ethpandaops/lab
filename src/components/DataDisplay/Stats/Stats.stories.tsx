import type { Meta, StoryObj } from '@storybook/react-vite';
import { CursorArrowRaysIcon, EnvelopeOpenIcon, UsersIcon } from '@heroicons/react/24/outline';
import { Stats } from './Stats';

const meta = {
  title: 'Components/DataDisplay/Stats',
  component: Stats,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    Story => (
      <div className="rounded-lg bg-surface p-6">
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
