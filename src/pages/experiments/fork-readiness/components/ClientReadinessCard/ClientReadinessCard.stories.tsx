import type { Meta, StoryObj } from '@storybook/react-vite';
import { ClientReadinessCard } from './ClientReadinessCard';

const meta = {
  title: 'Pages/Experiments/ForkReadiness/ClientReadinessCard',
  component: ClientReadinessCard,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof ClientReadinessCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * All nodes are ready (100% readiness).
 * Progress bar is green, all version badges are green.
 */
export const AllReady: Story = {
  args: {
    data: {
      clientName: 'lighthouse',
      totalNodes: 4,
      readyNodes: 4,
      readyPercentage: 100,
      minVersion: '8.0.0-rc.0',
      nodes: [
        {
          nodeName: 'corp-noasn-city/sparingparsley27/hashed-26181929',
          version: 'v8.0.0-rc.0-e5b4983',
          isReady: true,
          classification: 'lighthouse',
          lastSeen: Date.now() / 1000,
        },
        {
          nodeName: 'ethpandaops/hoodi/12731b4787',
          version: 'v8.0.0-rc.0-e5b4983',
          isReady: true,
          classification: 'lighthouse',
          lastSeen: Date.now() / 1000,
        },
        {
          nodeName: 'ethpandaops/hoodi/2aead16614',
          version: 'v8.0.0-rc.0-e5b4983',
          isReady: true,
          classification: 'lighthouse',
          lastSeen: Date.now() / 1000,
        },
        {
          nodeName: 'ethpandaops/hoodi/utility-hoodi-lighthouse-erigon-001',
          version: 'v8.0.0-rc.1-f13d061+',
          isReady: true,
          classification: 'lighthouse',
          lastSeen: Date.now() / 1000,
        },
      ],
    },
  },
};

/**
 * Partially ready (75% readiness).
 * Progress bar is orange, mix of green and red version badges.
 */
export const PartiallyReady: Story = {
  args: {
    data: {
      clientName: 'nimbus',
      totalNodes: 4,
      readyNodes: 3,
      readyPercentage: 75,
      minVersion: '25.9.2',
      nodes: [
        {
          nodeName: 'pub-asn-city/impulsecanopener30/hashed-458084d5',
          version: 'v25.9.2-9839f1-stateofus',
          isReady: true,
          classification: 'nimbus',
          lastSeen: Date.now() / 1000,
        },
        {
          nodeName: 'pub-asn-city/sometimewiring39/hashed-9f550d7d',
          version: 'v25.9.2-9839f1-stateofus',
          isReady: true,
          classification: 'nimbus',
          lastSeen: Date.now() / 1000,
        },
        {
          nodeName: 'pub-asn-city/sometimewiring39/hashed-b61cffc4',
          version: 'v25.9.2-9839f1-stateofus',
          isReady: true,
          classification: 'nimbus',
          lastSeen: Date.now() / 1000,
        },
        {
          nodeName: 'ethpandaops/hoodi/utility-hoodi-nimbus-besu-001',
          version: 'v25.7.1-92defe-stateofus',
          isReady: false,
          classification: 'nimbus',
          lastSeen: Date.now() / 1000,
        },
      ],
    },
  },
};

/**
 * No nodes ready (0% readiness).
 * Progress bar is orange (empty), all version badges are red.
 */
export const NoneReady: Story = {
  args: {
    data: {
      clientName: 'prysm',
      totalNodes: 3,
      readyNodes: 0,
      readyPercentage: 0,
      minVersion: '5.1.0',
      nodes: [
        {
          nodeName: 'pub-asn-city/user1/hashed-abc123',
          version: 'v5.0.5',
          isReady: false,
          classification: 'prysm',
          lastSeen: Date.now() / 1000,
        },
        {
          nodeName: 'pub-asn-city/user2/hashed-def456',
          version: 'v5.0.8',
          isReady: false,
          classification: 'prysm',
          lastSeen: Date.now() / 1000,
        },
        {
          nodeName: 'ethpandaops/hoodi/utility-hoodi-prysm-geth-001',
          version: 'v5.0.9',
          isReady: false,
          classification: 'prysm',
          lastSeen: Date.now() / 1000,
        },
      ],
    },
  },
};

/**
 * Single node, ready.
 */
export const SingleNodeReady: Story = {
  args: {
    data: {
      clientName: 'teku',
      totalNodes: 1,
      readyNodes: 1,
      readyPercentage: 100,
      minVersion: '24.10.0',
      nodes: [
        {
          nodeName: 'ethpandaops/hoodi/utility-hoodi-teku-nethermind-001',
          version: 'v24.10.1',
          isReady: true,
          classification: 'teku',
          lastSeen: Date.now() / 1000,
        },
      ],
    },
  },
};

/**
 * Single node, not ready.
 */
export const SingleNodeNotReady: Story = {
  args: {
    data: {
      clientName: 'lodestar',
      totalNodes: 1,
      readyNodes: 0,
      readyPercentage: 0,
      minVersion: '1.35.0',
      nodes: [
        {
          nodeName: 'pub-asn-city/testuser/hashed-xyz789',
          version: 'v1.34.0',
          isReady: false,
          classification: 'lodestar',
          lastSeen: Date.now() / 1000,
        },
      ],
    },
  },
};

/**
 * Many nodes (8 total, 50% ready).
 * Tests scrolling and truncation behavior.
 */
export const ManyNodes: Story = {
  args: {
    data: {
      clientName: 'lighthouse',
      totalNodes: 8,
      readyNodes: 4,
      readyPercentage: 50,
      minVersion: '8.0.0',
      nodes: [
        {
          nodeName: 'corp-noasn-city/verylongusernamethatshouldtruncate123/hashed-abc',
          version: 'v8.1.0',
          isReady: true,
          classification: 'lighthouse',
          lastSeen: Date.now() / 1000,
        },
        {
          nodeName: 'corp-noasn-city/anotherlongusername456/hashed-def',
          version: 'v8.0.5',
          isReady: true,
          classification: 'lighthouse',
          lastSeen: Date.now() / 1000,
        },
        {
          nodeName: 'pub-asn-city/shortname/hashed-123',
          version: 'v8.0.2',
          isReady: true,
          classification: 'lighthouse',
          lastSeen: Date.now() / 1000,
        },
        {
          nodeName: 'ethpandaops/hoodi/utility-hoodi-lighthouse-very-long-name-erigon-001',
          version: 'v8.0.1',
          isReady: true,
          classification: 'lighthouse',
          lastSeen: Date.now() / 1000,
        },
        {
          nodeName: 'corp-noasn-city/oldnode1/hashed-old1',
          version: 'v7.9.9',
          isReady: false,
          classification: 'lighthouse',
          lastSeen: Date.now() / 1000,
        },
        {
          nodeName: 'corp-noasn-city/oldnode2/hashed-old2',
          version: 'v7.9.8',
          isReady: false,
          classification: 'lighthouse',
          lastSeen: Date.now() / 1000,
        },
        {
          nodeName: 'pub-asn-city/oldnode3/hashed-old3',
          version: 'v7.9.5',
          isReady: false,
          classification: 'lighthouse',
          lastSeen: Date.now() / 1000,
        },
        {
          nodeName: 'ethpandaops/hoodi/utility-hoodi-lighthouse-old-version-001',
          version: 'v7.9.0',
          isReady: false,
          classification: 'lighthouse',
          lastSeen: Date.now() / 1000,
        },
      ],
    },
  },
};

/**
 * Grid layout showing multiple client cards with different states.
 */
export const GridLayout: Story = {
  args: {
    data: {
      clientName: '',
      totalNodes: 0,
      readyNodes: 0,
      readyPercentage: 0,
      minVersion: '',
      nodes: [],
    },
  },
  render: () => (
    <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
      <ClientReadinessCard
        data={{
          clientName: 'lighthouse',
          totalNodes: 4,
          readyNodes: 4,
          readyPercentage: 100,
          minVersion: '8.0.0-rc.0',
          nodes: [
            {
              nodeName: 'corp-noasn-city/user1/hash1',
              version: 'v8.0.0',
              isReady: true,
              classification: 'lighthouse',
              lastSeen: Date.now() / 1000,
            },
            {
              nodeName: 'ethpandaops/hoodi/node2',
              version: 'v8.0.1',
              isReady: true,
              classification: 'lighthouse',
              lastSeen: Date.now() / 1000,
            },
            {
              nodeName: 'pub-asn-city/user3/hash3',
              version: 'v8.0.0',
              isReady: true,
              classification: 'lighthouse',
              lastSeen: Date.now() / 1000,
            },
            {
              nodeName: 'ethpandaops/hoodi/node4',
              version: 'v8.0.2',
              isReady: true,
              classification: 'lighthouse',
              lastSeen: Date.now() / 1000,
            },
          ],
        }}
      />
      <ClientReadinessCard
        data={{
          clientName: 'nimbus',
          totalNodes: 4,
          readyNodes: 3,
          readyPercentage: 75,
          minVersion: '25.9.2',
          nodes: [
            {
              nodeName: 'pub-asn-city/user1/hash1',
              version: 'v25.9.2',
              isReady: true,
              classification: 'nimbus',
              lastSeen: Date.now() / 1000,
            },
            {
              nodeName: 'pub-asn-city/user2/hash2',
              version: 'v25.9.3',
              isReady: true,
              classification: 'nimbus',
              lastSeen: Date.now() / 1000,
            },
            {
              nodeName: 'ethpandaops/hoodi/node3',
              version: 'v25.9.2',
              isReady: true,
              classification: 'nimbus',
              lastSeen: Date.now() / 1000,
            },
            {
              nodeName: 'ethpandaops/hoodi/node4',
              version: 'v25.7.1',
              isReady: false,
              classification: 'nimbus',
              lastSeen: Date.now() / 1000,
            },
          ],
        }}
      />
      <ClientReadinessCard
        data={{
          clientName: 'prysm',
          totalNodes: 2,
          readyNodes: 1,
          readyPercentage: 50,
          minVersion: '5.1.0',
          nodes: [
            {
              nodeName: 'corp-noasn-city/user1/hash1',
              version: 'v5.1.2',
              isReady: true,
              classification: 'prysm',
              lastSeen: Date.now() / 1000,
            },
            {
              nodeName: 'pub-asn-city/user2/hash2',
              version: 'v5.0.9',
              isReady: false,
              classification: 'prysm',
              lastSeen: Date.now() / 1000,
            },
          ],
        }}
      />
      <ClientReadinessCard
        data={{
          clientName: 'teku',
          totalNodes: 3,
          readyNodes: 0,
          readyPercentage: 0,
          minVersion: '24.10.0',
          nodes: [
            {
              nodeName: 'ethpandaops/hoodi/node1',
              version: 'v24.9.0',
              isReady: false,
              classification: 'teku',
              lastSeen: Date.now() / 1000,
            },
            {
              nodeName: 'pub-asn-city/user2/hash2',
              version: 'v24.8.5',
              isReady: false,
              classification: 'teku',
              lastSeen: Date.now() / 1000,
            },
            {
              nodeName: 'corp-noasn-city/user3/hash3',
              version: 'v24.9.1',
              isReady: false,
              classification: 'teku',
              lastSeen: Date.now() / 1000,
            },
          ],
        }}
      />
    </div>
  ),
};
