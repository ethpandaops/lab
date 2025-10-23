import type { Meta, StoryObj } from '@storybook/react-vite';
import { ClientLogo } from './ClientLogo';

const meta = {
  title: 'Components/Ethereum/ClientLogo',
  component: ClientLogo,
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
} satisfies Meta<typeof ClientLogo>;

export default meta;
type Story = StoryObj<typeof meta>;

// Execution Clients

/**
 * Geth execution client logo
 */
export const Geth: Story = {
  args: {
    client: 'geth',
  },
};

/**
 * Nethermind execution client logo
 */
export const Nethermind: Story = {
  args: {
    client: 'nethermind',
  },
};

/**
 * Besu execution client logo
 */
export const Besu: Story = {
  args: {
    client: 'besu',
  },
};

/**
 * Erigon execution client logo
 */
export const Erigon: Story = {
  args: {
    client: 'erigon',
  },
};

/**
 * Reth execution client logo
 */
export const Reth: Story = {
  args: {
    client: 'reth',
  },
};

// Consensus Clients

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
 * Tysm consensus client logo
 */
export const Tysm: Story = {
  args: {
    client: 'tysm',
  },
};

/**
 * Grandine consensus client logo
 */
export const Grandine: Story = {
  args: {
    client: 'grandine',
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
 * All execution clients in a row
 */
export const AllExecutionClients: Story = {
  args: {
    client: 'geth',
  },
  render: () => (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-foreground">Execution Clients</div>
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center gap-1">
          <ClientLogo client="geth" />
          <span className="text-xs text-muted">geth</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <ClientLogo client="nethermind" />
          <span className="text-xs text-muted">nethermind</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <ClientLogo client="besu" />
          <span className="text-xs text-muted">besu</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <ClientLogo client="erigon" />
          <span className="text-xs text-muted">erigon</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <ClientLogo client="reth" />
          <span className="text-xs text-muted">reth</span>
        </div>
      </div>
    </div>
  ),
};

/**
 * All consensus clients in a row
 */
export const AllConsensusClients: Story = {
  args: {
    client: 'lighthouse',
  },
  render: () => (
    <div className="space-y-4">
      <div className="text-sm font-semibold text-foreground">Consensus Clients</div>
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-center gap-1">
          <ClientLogo client="lighthouse" />
          <span className="text-xs text-muted">lighthouse</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <ClientLogo client="prysm" />
          <span className="text-xs text-muted">prysm</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <ClientLogo client="teku" />
          <span className="text-xs text-muted">teku</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <ClientLogo client="nimbus" />
          <span className="text-xs text-muted">nimbus</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <ClientLogo client="lodestar" />
          <span className="text-xs text-muted">lodestar</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <ClientLogo client="tysm" />
          <span className="text-xs text-muted">tysm</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <ClientLogo client="grandine" />
          <span className="text-xs text-muted">grandine</span>
        </div>
      </div>
    </div>
  ),
};
