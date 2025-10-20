import type { Meta, StoryObj } from '@storybook/react-vite';
import { ClientLogo } from './ClientLogo';

const meta = {
  title: 'Components/Ethereum/ClientLogo',
  component: ClientLogo,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ClientLogo>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Lighthouse consensus client logo
 */
export const Lighthouse: Story = {
  args: {
    client: 'lighthouse',
  },
};

/**
 * Prysm consensus client logo
 */
export const Prysm: Story = {
  args: {
    client: 'prysm',
  },
};

/**
 * Teku consensus client logo
 */
export const Teku: Story = {
  args: {
    client: 'teku',
  },
};

/**
 * Nimbus consensus client logo
 */
export const Nimbus: Story = {
  args: {
    client: 'nimbus',
  },
};

/**
 * Lodestar consensus client logo
 */
export const Lodestar: Story = {
  args: {
    client: 'lodestar',
  },
};

/**
 * Larger logo (32px)
 */
export const Large: Story = {
  args: {
    client: 'lighthouse',
    size: 32,
  },
};

/**
 * Small logo (16px)
 */
export const Small: Story = {
  args: {
    client: 'prysm',
    size: 16,
  },
};

/**
 * Multiple logos in a row
 */
export const MultipleClients: Story = {
  args: {
    client: 'lighthouse',
  },
  render: () => (
    <div className="flex items-center gap-2">
      <ClientLogo client="lighthouse" />
      <ClientLogo client="prysm" />
      <ClientLogo client="teku" />
      <ClientLogo client="nimbus" />
      <ClientLogo client="lodestar" />
    </div>
  ),
};
