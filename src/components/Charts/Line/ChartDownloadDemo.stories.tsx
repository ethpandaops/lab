import type { Meta, StoryObj } from '@storybook/react';
import { ChartDownloadDemo } from './ChartDownloadDemo';

const meta: Meta<typeof ChartDownloadDemo> = {
  title: 'Components/Charts/Line/ChartDownloadDemo',
  component: ChartDownloadDemo,
  decorators: [
    Story => (
      <div className="min-w-[800px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof ChartDownloadDemo>;

export const Default: Story = {};
