import type { Meta, StoryObj } from '@storybook/react-vite';
import { LoadingContainer } from './LoadingContainer';

const meta = {
  title: 'Components/Layout/LoadingContainer',
  component: LoadingContainer,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => (
      <div className="min-w-80 rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
  argTypes: {
    shimmer: {
      control: 'boolean',
      description: 'Use shimmer animation instead of pulse',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes (e.g., rounded-xl, h-4, w-full)',
    },
  },
} satisfies Meta<typeof LoadingContainer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    className: 'h-4 w-64 rounded-sm',
    shimmer: true,
  },
};

export const Pulse: Story = {
  args: {
    className: 'h-4 w-64 rounded-sm',
    shimmer: false,
  },
};

export const RoundedXL: Story = {
  args: {
    className: 'h-16 w-full rounded-xl',
    shimmer: true,
  },
};

export const Circle: Story = {
  args: {
    className: 'size-16 rounded-full',
    shimmer: true,
  },
};

export const MultipleElements: Story = {
  render: () => (
    <div className="space-y-4">
      <LoadingContainer className="h-8 w-48 rounded-sm" />
      <LoadingContainer className="h-4 w-full rounded-sm" />
      <LoadingContainer className="h-4 w-3/4 rounded-sm" />
      <div className="flex gap-4">
        <LoadingContainer className="size-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <LoadingContainer className="h-4 w-full rounded-sm" />
          <LoadingContainer className="h-4 w-2/3 rounded-sm" />
        </div>
      </div>
    </div>
  ),
};

export const CardSkeleton: Story = {
  render: () => (
    <div className="w-full max-w-md rounded-sm bg-white p-6 shadow-sm dark:bg-zinc-800">
      <div className="flex gap-x-4">
        <LoadingContainer className="size-12 rounded-full" />
        <div className="flex-1 space-y-3">
          <LoadingContainer className="h-4 w-32 rounded-sm" />
          <LoadingContainer className="h-3 w-full rounded-sm" />
          <LoadingContainer className="h-3 w-5/6 rounded-sm" />
        </div>
      </div>
    </div>
  ),
};
