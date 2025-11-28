import type { Meta, StoryObj } from '@storybook/react-vite';
import { GeographicalChecklistSkeleton } from './GeographicalChecklistSkeleton';

const meta = {
  title: 'Pages/Xatu/Geographical Checklist/GeographicalChecklistSkeleton',
  component: GeographicalChecklistSkeleton,
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GeographicalChecklistSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
