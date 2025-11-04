import type { Meta, StoryObj } from '@storybook/react-vite';

import { ForkLabel } from './ForkLabel';

const meta = {
  title: 'Components/Ethereum/ForkLabel',
  component: ForkLabel,
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
} satisfies Meta<typeof ForkLabel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Phase0: Story = {
  args: {
    fork: 'phase0',
  },
};

export const Altair: Story = {
  args: {
    fork: 'altair',
  },
};

export const Bellatrix: Story = {
  args: {
    fork: 'bellatrix',
  },
};

export const Capella: Story = {
  args: {
    fork: 'capella',
  },
};

export const Deneb: Story = {
  args: {
    fork: 'deneb',
  },
};

export const Electra: Story = {
  args: {
    fork: 'electra',
  },
};

export const Fulu: Story = {
  args: {
    fork: 'fulu',
  },
};

export const SmallSize: Story = {
  args: {
    fork: 'deneb',
    size: 'sm',
  },
};

export const MediumSize: Story = {
  args: {
    fork: 'deneb',
    size: 'md',
  },
};

export const LargeSize: Story = {
  args: {
    fork: 'deneb',
    size: 'lg',
  },
};

export const WithoutIcon: Story = {
  args: {
    fork: 'bellatrix',
    showIcon: false,
  },
};

export const AllForks: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <ForkLabel fork="phase0" />
        <ForkLabel fork="altair" />
        <ForkLabel fork="bellatrix" />
        <ForkLabel fork="capella" />
        <ForkLabel fork="deneb" />
        <ForkLabel fork="electra" />
        <ForkLabel fork="fulu" />
      </div>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="w-20 text-sm text-muted">Small:</span>
        <ForkLabel fork="deneb" size="sm" />
      </div>
      <div className="flex items-center gap-3">
        <span className="w-20 text-sm text-muted">Medium:</span>
        <ForkLabel fork="deneb" size="md" />
      </div>
      <div className="flex items-center gap-3">
        <span className="w-20 text-sm text-muted">Large:</span>
        <ForkLabel fork="deneb" size="lg" />
      </div>
    </div>
  ),
};
