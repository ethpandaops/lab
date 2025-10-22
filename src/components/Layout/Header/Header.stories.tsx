import type { Meta, StoryObj } from '@storybook/react-vite';
import { Header } from './Header';

const meta: Meta = {
  title: 'Components/Layout/Header',
  component: Header,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => (
      <div className="min-w-96 rounded-lg bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
  },
};

export default meta;
type Story = StoryObj;

/**
 * Default header with title, description, and accent
 */
export const Default: Story = {
  args: {
    title: 'Welcome to the Dashboard',
    description: 'Track your metrics and monitor performance in real-time',
    showAccent: true,
  },
};

/**
 * Extra small header (xs)
 */
export const ExtraSmall: Story = {
  args: {
    title: 'User Settings',
    description: 'Manage your preferences',
    size: 'xs',
    showAccent: true,
  },
};

/**
 * Small header (sm)
 */
export const Small: Story = {
  args: {
    title: 'Dashboard Overview',
    description: 'Quick insights and metrics',
    size: 'sm',
    showAccent: true,
  },
};

/**
 * Medium header (md) - default size
 */
export const Medium: Story = {
  args: {
    title: 'Welcome to the Dashboard',
    description: 'Track your metrics and monitor performance in real-time',
    size: 'md',
    showAccent: true,
  },
};

/**
 * Large header (lg)
 */
export const Large: Story = {
  args: {
    title: 'Analytics Platform',
    description: 'Comprehensive data insights and visualizations for your organization',
    size: 'lg',
    showAccent: true,
  },
};

/**
 * Extra large header (xl)
 */
export const ExtraLarge: Story = {
  args: {
    title: 'Enterprise Dashboard',
    description: 'Advanced monitoring and analytics for large-scale operations and data-driven decision making',
    size: 'xl',
    showAccent: true,
  },
};

/**
 * Header with title only
 */
export const TitleOnly: Story = {
  args: {
    title: 'Settings',
  },
};

/**
 * Header without accent bar
 */
export const WithoutAccent: Story = {
  args: {
    title: 'User Profile',
    description: 'Manage your account settings and preferences',
    showAccent: false,
  },
};

/**
 * Header with long title and description
 */
export const LongContent: Story = {
  args: {
    title: 'Comprehensive Analytics Dashboard for Real-Time Monitoring',
    description:
      'This dashboard provides detailed insights into your system performance, user engagement metrics, and operational data across multiple channels and time periods',
    showAccent: true,
  },
};

/**
 * Header with short punchy title
 */
export const ShortTitle: Story = {
  args: {
    title: 'Home',
    description: 'Welcome back!',
    showAccent: true,
  },
};
