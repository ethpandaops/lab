import type { Meta, StoryObj } from '@storybook/react-vite';
import { MultiLineDownloadDemo } from './MultiLineDownloadDemo';

const meta: Meta<typeof MultiLineDownloadDemo> = {
  title: 'Components/Charts/MultiLine/DownloadDemo',
  component: MultiLineDownloadDemo,
  decorators: [
    Story => (
      <div className="min-w-[900px] rounded-sm bg-background p-6">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof MultiLineDownloadDemo>;

export const Default: Story = {};
