import type { Meta, StoryObj } from '@storybook/react-vite';
import { type JSX, useState } from 'react';
import { SegmentedControl } from './SegmentedControl';

const meta = {
  title: 'Components/Forms/SegmentedControl',
  component: SegmentedControl,
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
} satisfies Meta<typeof SegmentedControl>;

export default meta;
type Story = StoryObj<typeof meta>;

const TIME_WINDOWS = [
  { value: '24h', label: '24h' },
  { value: '7d', label: '7d' },
  { value: '30d', label: '30d' },
  { value: '90d', label: '90d' },
  { value: '1y', label: '1y' },
  { value: 'all', label: 'All' },
];

function TimeWindowExample(): JSX.Element {
  const [value, setValue] = useState('7d');
  return <SegmentedControl options={TIME_WINDOWS} value={value} onChange={setValue} ariaLabel="Time window" />;
}

export const Default: Story = {
  args: {} as never,
  render: () => <TimeWindowExample />,
};
