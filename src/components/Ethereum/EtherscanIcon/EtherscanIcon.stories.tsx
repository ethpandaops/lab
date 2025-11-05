import type { Meta, StoryObj } from '@storybook/react-vite';
import { EtherscanIcon } from './EtherscanIcon';

const meta = {
  title: 'Components/Ethereum/EtherscanIcon',
  component: EtherscanIcon,
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
} satisfies Meta<typeof EtherscanIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default size (h-5 w-5 / 20px)
 */
export const Default: Story = {
  args: {},
};

/**
 * Small icon (h-4 w-4 / 16px)
 */
export const Small: Story = {
  args: {
    className: 'h-4 w-4',
  },
};

/**
 * Large icon (h-8 w-8 / 32px)
 */
export const Large: Story = {
  args: {
    className: 'h-8 w-8',
  },
};

/**
 * Extra large icon (h-12 w-12 / 48px)
 */
export const ExtraLarge: Story = {
  args: {
    className: 'h-12 w-12',
  },
};

/**
 * Icon with custom color
 */
export const CustomColor: Story = {
  args: {
    className: 'h-8 w-8 text-accent',
  },
};

/**
 * Multiple sizes comparison
 */
export const SizeComparison: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <EtherscanIcon className="h-4 w-4" />
      <EtherscanIcon className="h-5 w-5" />
      <EtherscanIcon className="h-6 w-6" />
      <EtherscanIcon className="h-8 w-8" />
      <EtherscanIcon className="h-12 w-12" />
    </div>
  ),
};
