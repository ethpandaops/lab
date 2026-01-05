import type { Meta, StoryObj } from '@storybook/react-vite';

import { EIP7870SpecsBanner } from './EIP7870SpecsBanner';

const meta = {
  title: 'Components/Ethereum/EIP7870SpecsBanner',
  component: EIP7870SpecsBanner,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div className="min-w-[700px] rounded-sm bg-background p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof EIP7870SpecsBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};

export const Attester: Story = {
  args: {
    nodeClass: 'attester',
  },
};

export const FullNode: Story = {
  args: {
    nodeClass: 'full-node',
  },
};

export const LocalBlockBuilder: Story = {
  args: {
    nodeClass: 'local-block-builder',
  },
};

export const AllNodeClasses: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div>
        <span className="mb-2 block text-sm text-muted">Attester (default):</span>
        <EIP7870SpecsBanner nodeClass="attester" />
      </div>
      <div>
        <span className="mb-2 block text-sm text-muted">Full Node:</span>
        <EIP7870SpecsBanner nodeClass="full-node" />
      </div>
      <div>
        <span className="mb-2 block text-sm text-muted">Local Block Builder:</span>
        <EIP7870SpecsBanner nodeClass="local-block-builder" />
      </div>
    </div>
  ),
};
