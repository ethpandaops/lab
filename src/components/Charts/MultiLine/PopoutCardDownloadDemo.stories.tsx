import type { Meta, StoryObj } from '@storybook/react-vite';
import { PopoutCardDownloadDemo } from './PopoutCardDownloadDemo';

const meta: Meta<typeof PopoutCardDownloadDemo> = {
  title: 'Components/Charts/MultiLine/PopoutCardDownload',
  component: PopoutCardDownloadDemo,
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
type Story = StoryObj<typeof PopoutCardDownloadDemo>;

/**
 * Real example showing how to add download functionality to a PopoutCard chart.
 * This matches the pattern used in /ethereum/epochs charts like GasChart.
 */
export const Default: Story = {};
