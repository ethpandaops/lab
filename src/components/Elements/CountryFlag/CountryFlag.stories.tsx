import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, waitFor, within } from 'storybook/test';

import { CountryFlag } from './CountryFlag';

const meta = {
  title: 'Components/Elements/CountryFlag',
  component: CountryFlag,
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
} satisfies Meta<typeof CountryFlag>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { code: 'DE', title: 'Germany' },
  play: async ({ canvasElement }) => {
    const flag = within(canvasElement).getByRole('img', { name: 'Germany' });
    await waitFor(() => expect(flag.querySelector('img')).not.toBeNull());
  },
};

export const BesideAName: Story = {
  args: { code: 'jp' },
  render: args => (
    <ul className="flex flex-col gap-2 text-sm text-foreground">
      {[
        ['us', 'United States'],
        ['de', 'Germany'],
        ['jp', 'Japan'],
        ['gb', 'United Kingdom'],
        ['ch', 'Switzerland'],
      ].map(([code, name]) => (
        <li key={code} className="flex items-center gap-2">
          <CountryFlag {...args} code={code} />
          {name}
        </li>
      ))}
    </ul>
  ),
};

export const Unknown: Story = {
  args: { code: 'other', showUnknown: true },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('svg')).not.toBeNull();
  },
};
