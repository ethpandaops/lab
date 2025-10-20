import type { Meta, StoryObj } from '@storybook/react-vite';
import { NetworkSelect } from './NetworkSelect';

const meta: Meta<typeof NetworkSelect> = {
  title: 'Components/Ethereum/NetworkSelect',
  component: NetworkSelect,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => (
      <div className="min-w-80 rounded-lg bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof NetworkSelect>;

/**
 * Default network selector with label
 */
export const Default: Story = {
  args: {
    showLabel: true,
    label: 'Network',
  },
};

/**
 * Network selector without label (used in header)
 */
export const WithoutLabel: Story = {
  args: {
    showLabel: false,
  },
};

/**
 * Network selector with custom label
 */
export const CustomLabel: Story = {
  args: {
    showLabel: true,
    label: 'Select Network',
  },
};
