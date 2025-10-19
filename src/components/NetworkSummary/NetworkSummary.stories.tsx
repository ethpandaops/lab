import type { Meta, StoryObj } from '@storybook/react-vite';
import { NetworkSummary } from './NetworkSummary';

const meta = {
  title: 'Components/NetworkSummary',
  component: NetworkSummary,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'select',
      options: ['horizontal', 'vertical'],
      description: 'Layout orientation for the summary',
    },
  },
} satisfies Meta<typeof NetworkSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  args: {
    orientation: 'horizontal',
  },
};

export const Vertical: Story = {
  args: {
    orientation: 'vertical',
  },
  decorators: [
    Story => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
};
