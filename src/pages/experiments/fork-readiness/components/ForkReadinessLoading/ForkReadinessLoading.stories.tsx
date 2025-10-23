import type { Meta, StoryObj } from '@storybook/react-vite';
import { ForkReadinessLoading } from './ForkReadinessLoading';

const meta: Meta<typeof ForkReadinessLoading> = {
  title: 'Pages/Experiments/ForkReadiness/ForkReadinessLoading',
  component: ForkReadinessLoading,
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ForkReadinessLoading>;

export const Default: Story = {};
