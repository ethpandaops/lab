import type { Meta, StoryObj } from '@storybook/react-vite';
import { NetworkIcon } from './NetworkIcon';

const meta = {
  title: 'Components/NetworkIcon',
  component: NetworkIcon,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof NetworkIcon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mainnet: Story = {
  args: {
    networkName: 'mainnet',
  },
};

export const Holesky: Story = {
  args: {
    networkName: 'holesky',
  },
};

export const Sepolia: Story = {
  args: {
    networkName: 'sepolia',
  },
};

export const Hoodi: Story = {
  args: {
    networkName: 'hoodi',
  },
};

export const Unknown: Story = {
  args: {
    networkName: 'unknown-network',
  },
};

export const CustomSize: Story = {
  args: {
    networkName: 'mainnet',
    className: 'size-12',
  },
};

export const AllNetworks: Story = {
  args: {
    networkName: 'mainnet',
  },
  render: () => (
    <div className="flex gap-4">
      <div className="flex flex-col items-center gap-2">
        <NetworkIcon networkName="mainnet" />
        <span className="text-sm/6">Mainnet</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <NetworkIcon networkName="holesky" />
        <span className="text-sm/6">Holesky</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <NetworkIcon networkName="sepolia" />
        <span className="text-sm/6">Sepolia</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <NetworkIcon networkName="hoodi" />
        <span className="text-sm/6">Hoodi</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <NetworkIcon networkName="unknown" />
        <span className="text-sm/6">Unknown</span>
      </div>
    </div>
  ),
};
