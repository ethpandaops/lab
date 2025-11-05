import type { Meta, StoryObj } from '@storybook/react-vite';
import { EtherscanLink } from './EtherscanLink';

const meta = {
  title: 'Components/Ethereum/EtherscanLink',
  component: EtherscanLink,
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof EtherscanLink>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Link to a specific execution block number
 */
export const BlockLink: Story = {
  args: {
    blockNumber: 21234567,
  },
};

/**
 * Multiple links in a row
 */
export const Multiple: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <EtherscanLink blockNumber={21234567} />
      <EtherscanLink blockNumber={21234568} />
    </div>
  ),
};

/**
 * Link with custom className
 */
export const CustomStyling: Story = {
  args: {
    blockNumber: 21234567,
    className: 'bg-accent hover:bg-primary',
  },
};

/**
 * Without blockNumber (renders nothing)
 */
export const NoBlockNumber: Story = {
  args: {},
};
