import type { Meta, StoryObj } from '@storybook/react-vite';
import { BeaconchainLink } from './BeaconchainLink';

const meta = {
  title: 'Components/Ethereum/BeaconchainLink',
  component: BeaconchainLink,
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
} satisfies Meta<typeof BeaconchainLink>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Link to a specific slot
 */
export const SlotLink: Story = {
  args: {
    slot: 10234567,
  },
};

/**
 * Link to a specific epoch
 */
export const EpochLink: Story = {
  args: {
    epoch: 319827,
  },
};

/**
 * Multiple links in a row
 */
export const Multiple: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <BeaconchainLink slot={10234567} />
      <BeaconchainLink epoch={319827} />
    </div>
  ),
};

/**
 * Link with custom className
 */
export const CustomStyling: Story = {
  args: {
    slot: 10234567,
    className: 'bg-accent hover:bg-primary',
  },
};
