import type { Meta, StoryObj } from '@storybook/react-vite';
import { UserCardSkeleton } from './UserCardSkeleton';

const meta = {
  title: 'Pages/Xatu/Contributors/UserCardSkeleton',
  component: UserCardSkeleton,
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
} satisfies Meta<typeof UserCardSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Multiple: Story = {
  render: () => (
    <div className="space-y-4">
      <UserCardSkeleton />
      <UserCardSkeleton />
      <UserCardSkeleton />
      <UserCardSkeleton />
    </div>
  ),
};

export const InGrid: Story = {
  render: () => (
    <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
      <UserCardSkeleton />
      <UserCardSkeleton />
      <UserCardSkeleton />
      <UserCardSkeleton />
    </div>
  ),
};
