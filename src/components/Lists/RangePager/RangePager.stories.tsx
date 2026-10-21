import type { Meta, StoryObj } from '@storybook/react-vite';
import { type JSX, useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { RangePager } from './RangePager';
import { getRangePage } from './RangePager.utils';

const meta = {
  title: 'Components/Lists/RangePager',
  component: RangePager,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => (
      <div className="min-w-[720px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof RangePager>;

export default meta;
type Story = StoryObj<typeof meta>;

function SlotsExample({ initialFrom }: { initialFrom?: number }): JSX.Element {
  const [from, setFrom] = useState<number | undefined>(initialFrom);
  const page = getRangePage(from, 15478210, 13000000, 50);
  return <RangePager page={page} noun="slot" onNavigate={setFrom} />;
}

export const Latest: Story = {
  args: {} as never,
  render: () => <SlotsExample />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('button', { name: 'Latest slots' })).toBeDisabled();
    await userEvent.click(canvas.getByRole('button', { name: /Older/ }));
    await expect(canvas.getByText('15478160')).toBeInTheDocument();
    await userEvent.type(canvas.getByPlaceholderText('Go to slot'), '14000000');
    await userEvent.click(canvas.getByRole('button', { name: 'Go' }));
    await expect(canvas.getByText('14000000')).toBeInTheDocument();
  },
};

export const Oldest: Story = {
  args: {} as never,
  render: () => <SlotsExample initialFrom={0} />,
};
