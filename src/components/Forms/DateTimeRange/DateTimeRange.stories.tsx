import type { Meta, StoryObj } from '@storybook/react-vite';
import { type JSX, useState } from 'react';
import { expect, fireEvent, userEvent, within } from 'storybook/test';
import { DateTimeRange } from './DateTimeRange';

const meta = {
  title: 'Components/Forms/DateTimeRange',
  component: DateTimeRange,
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
} satisfies Meta<typeof DateTimeRange>;

export default meta;
type Story = StoryObj<typeof meta>;

function Example(): JSX.Element {
  const [range, setRange] = useState<{ from?: number; to?: number }>({});
  return (
    <div className="flex flex-col gap-2">
      <DateTimeRange label="Time" from={range.from} to={range.to} onChange={(from, to) => setRange({ from, to })} />
      <output className="text-xs text-muted">{range.from === undefined ? 'open' : 'set'}</output>
      <button type="button" onClick={() => setRange({})}>
        Reset
      </button>
    </div>
  );
}

export const Default: Story = {
  args: {} as never,
  render: () => <Example />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const from = canvas.getByLabelText('Time from') as HTMLInputElement;
    fireEvent.change(from, { target: { value: '2026-01-02T03:04' } });
    await expect(canvas.getByText('set')).toBeInTheDocument();
    await userEvent.click(canvas.getByText('Reset'));
    await expect(canvas.getByText('open')).toBeInTheDocument();
    await expect(from.value).toBe('');
  },
};
