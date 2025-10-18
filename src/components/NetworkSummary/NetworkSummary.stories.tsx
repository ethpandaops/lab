import type { Meta, StoryObj } from '@storybook/react-vite';
import { NetworkSummary } from './NetworkSummary';

const meta = {
  title: 'Components/NetworkSummary',
  component: NetworkSummary,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof NetworkSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
