import type { Meta, StoryObj } from '@storybook/react-vite';
import { Validator } from './Validator';

const meta = {
  title: 'Components/Ethereum/Validator',
  component: Validator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Validator>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Linked to the validator inspect page
 */
export const Default: Story = {
  args: {
    index: 1234567,
  },
};

/**
 * Plain text
 */
export const NoLink: Story = {
  args: {
    index: 1234567,
    noLink: true,
  },
};
