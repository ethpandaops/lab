import type { Meta, StoryObj } from '@storybook/react-vite';
import { GasFlowDiagram } from './GasFlowDiagram';

const meta: Meta<typeof GasFlowDiagram> = {
  title: 'Components/Charts/GasFlowDiagram',
  component: GasFlowDiagram,
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-xs bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof GasFlowDiagram>;

/**
 * Default gas flow diagram showing a typical successful transaction
 */
export const Default: Story = {
  args: {
    intrinsicGas: 21608,
    evmGas: 761325,
    gasRefund: 162000,
    receiptGas: 620933,
  },
};

/**
 * Complex transaction with high gas usage and significant refund
 */
export const ComplexTransaction: Story = {
  args: {
    intrinsicGas: 47234,
    evmGas: 1969778,
    gasRefund: 672000,
    receiptGas: 1593109,
  },
};

/**
 * Simple transfer with minimal gas
 */
export const SimpleTransfer: Story = {
  args: {
    intrinsicGas: 21000,
    evmGas: 0,
    gasRefund: 0,
    receiptGas: 21000,
  },
};

/**
 * Failed transaction where intrinsic gas is unavailable
 */
export const FailedTransaction: Story = {
  args: {
    intrinsicGas: null,
    evmGas: 80000,
    gasRefund: 0,
    receiptGas: 80000,
  },
};

/**
 * Compact mode for inline display
 */
export const Compact: Story = {
  args: {
    intrinsicGas: 21608,
    evmGas: 761325,
    gasRefund: 162000,
    receiptGas: 620933,
    compact: true,
  },
};

/**
 * Without labels (values only)
 */
export const NoLabels: Story = {
  args: {
    intrinsicGas: 21608,
    evmGas: 761325,
    gasRefund: 162000,
    receiptGas: 620933,
    showLabels: false,
  },
};

/**
 * Without formula at the bottom
 */
export const NoFormula: Story = {
  args: {
    intrinsicGas: 21608,
    evmGas: 761325,
    gasRefund: 162000,
    receiptGas: 620933,
    showFormula: false,
  },
};

/**
 * Transaction with no refund
 */
export const NoRefund: Story = {
  args: {
    intrinsicGas: 21000,
    evmGas: 50000,
    gasRefund: 0,
    receiptGas: 71000,
  },
};

/**
 * Large gas values (millions)
 */
export const LargeValues: Story = {
  args: {
    intrinsicGas: 500000,
    evmGas: 15000000,
    gasRefund: 3000000,
    receiptGas: 12500000,
  },
};

/**
 * Compact mode with large values
 */
export const CompactLargeValues: Story = {
  args: {
    intrinsicGas: 500000,
    evmGas: 15000000,
    gasRefund: 3000000,
    receiptGas: 12500000,
    compact: true,
  },
};
