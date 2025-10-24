import type { Meta, StoryObj } from '@storybook/react-vite';
import { LocallyBuiltBlocksSkeleton } from './LocallyBuiltBlocksSkeleton';

const meta = {
  title: 'Pages/Xatu/Locally Built Blocks/LocallyBuiltBlocksSkeleton',
  component: LocallyBuiltBlocksSkeleton,
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LocallyBuiltBlocksSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
