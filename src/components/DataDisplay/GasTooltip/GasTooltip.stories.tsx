import type { Meta, StoryObj } from '@storybook/react-vite';
import { GasTooltip } from './GasTooltip';

const meta: Meta<typeof GasTooltip> = {
  title: 'Components/DataDisplay/GasTooltip',
  component: GasTooltip,
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div className="flex min-h-[200px] min-w-[400px] items-center justify-center rounded-xs bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof GasTooltip>;

/**
 * Intrinsic gas tooltip
 */
export const Intrinsic: Story = {
  args: {
    type: 'intrinsic',
  },
  render: args => (
    <div className="flex items-center gap-1 text-sm text-foreground">
      Intrinsic Gas: 21,000 <GasTooltip {...args} />
    </div>
  ),
};

/**
 * EVM execution gas tooltip
 */
export const EVM: Story = {
  args: {
    type: 'evm',
  },
  render: args => (
    <div className="flex items-center gap-1 text-sm text-foreground">
      EVM Execution: 761,325 <GasTooltip {...args} />
    </div>
  ),
};

/**
 * Gas refund tooltip
 */
export const Refund: Story = {
  args: {
    type: 'refund',
  },
  render: args => (
    <div className="flex items-center gap-1 text-sm text-foreground">
      Refund: -162,000 <GasTooltip {...args} />
    </div>
  ),
};

/**
 * Receipt gas tooltip
 */
export const Receipt: Story = {
  args: {
    type: 'receipt',
  },
  render: args => (
    <div className="flex items-center gap-1 text-sm text-foreground">
      Receipt Gas: 620,933 <GasTooltip {...args} />
    </div>
  ),
};

/**
 * Self gas tooltip (for frame detail)
 */
export const Self: Story = {
  args: {
    type: 'self',
  },
  render: args => (
    <div className="flex items-center gap-1 text-sm text-foreground">
      Self Gas: 95,234 <GasTooltip {...args} />
    </div>
  ),
};

/**
 * Cumulative gas tooltip (for frame detail)
 */
export const Cumulative: Story = {
  args: {
    type: 'cumulative',
  },
  render: args => (
    <div className="flex items-center gap-1 text-sm text-foreground">
      Cumulative Gas: 180,000 <GasTooltip {...args} />
    </div>
  ),
};

/**
 * Small size (default)
 */
export const SmallSize: Story = {
  args: {
    type: 'intrinsic',
    size: 'sm',
  },
  render: args => (
    <div className="flex items-center gap-1 text-xs text-foreground">
      Small icon <GasTooltip {...args} />
    </div>
  ),
};

/**
 * Medium size
 */
export const MediumSize: Story = {
  args: {
    type: 'intrinsic',
    size: 'md',
  },
  render: args => (
    <div className="flex items-center gap-1 text-sm text-foreground">
      Medium icon <GasTooltip {...args} />
    </div>
  ),
};

/**
 * Large size
 */
export const LargeSize: Story = {
  args: {
    type: 'intrinsic',
    size: 'lg',
  },
  render: args => (
    <div className="flex items-center gap-1 text-base text-foreground">
      Large icon <GasTooltip {...args} />
    </div>
  ),
};

/**
 * Custom content
 */
export const CustomContent: Story = {
  args: {
    type: 'intrinsic',
    customContent: (
      <div>
        <div className="mb-1 text-sm font-medium text-foreground">Custom Explanation</div>
        <div className="text-xs text-muted">This is a custom tooltip content that overrides the default.</div>
        <div className="mt-2 text-xs text-primary">Learn more →</div>
      </div>
    ),
  },
  render: args => (
    <div className="flex items-center gap-1 text-sm text-foreground">
      Custom tooltip <GasTooltip {...args} />
    </div>
  ),
};

/**
 * Multiple tooltips in a row
 */
export const MultipleTooltips: Story = {
  render: () => (
    <div className="flex items-center gap-4 text-sm">
      <span className="flex items-center gap-1">
        Intrinsic <GasTooltip type="intrinsic" />
      </span>
      <span className="flex items-center gap-1">
        EVM <GasTooltip type="evm" />
      </span>
      <span className="flex items-center gap-1">
        Refund <GasTooltip type="refund" />
      </span>
      <span className="flex items-center gap-1">
        Receipt <GasTooltip type="receipt" />
      </span>
    </div>
  ),
};
