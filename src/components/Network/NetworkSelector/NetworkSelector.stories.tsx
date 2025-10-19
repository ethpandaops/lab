import type { Meta, StoryObj } from '@storybook/react-vite';
import { NetworkSelector } from '@/components/Network/NetworkSelector';

const meta: Meta<typeof NetworkSelector> = {
  title: 'Components/Network/NetworkSelector',
  component: NetworkSelector,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof NetworkSelector>;

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
