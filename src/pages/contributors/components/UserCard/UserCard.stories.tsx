import type { Meta, StoryObj } from '@storybook/react-vite';
import { UserCard } from './UserCard';

const meta = {
  title: 'Pages/Contributors/UserCard',
  component: UserCard,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    Story => (
      <div className="min-w-80 rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof UserCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Individual contributor card with version badge, consensus client logo, and location info.
 */
export const Individual: Story = {
  args: {
    username: 'sparingparsley27',
    classification: 'individual',
    nodeCount: 1,
    locationCount: 1,
    lastSeen: Date.now() / 1000,
    primaryCountry: 'US',
    primaryCity: 'New York',
    clientVersion: 'v0.0.70-7195855',
    consensusImplementations: ['lighthouse'],
  },
};

/**
 * Corporate/Institution contributor card with multiple locations and version badge.
 */
export const Corporate: Story = {
  args: {
    username: 'techcorp42',
    classification: 'corporate',
    nodeCount: 12,
    locationCount: 5,
    lastSeen: Date.now() / 1000 - 3600, // 1 hour ago
    clientVersion: 'v0.0.68-a1b2c3d',
    consensusImplementations: ['prysm'],
  },
};

/**
 * Corporate contributor with single location showing city and country flag.
 */
export const CorporateSingleLocation: Story = {
  args: {
    username: 'smallcorp',
    classification: 'corporate',
    nodeCount: 3,
    locationCount: 1,
    lastSeen: Date.now() / 1000 - 1800,
    primaryCountry: 'GB',
    primaryCity: 'London',
    clientVersion: 'v0.0.65-xyz123',
    consensusImplementations: ['teku'],
  },
};

/**
 * Internal (ethPandaOps) contributor card with multiple locations.
 */
export const Internal: Story = {
  args: {
    username: 'ethpandaops',
    classification: 'internal',
    nodeCount: 42,
    locationCount: 15,
    lastSeen: Date.now() / 1000 - 60, // 1 minute ago
    clientVersion: 'v0.0.71-main',
    consensusImplementations: ['lighthouse'],
  },
};

/**
 * Unclassified contributor card.
 */
export const Unclassified: Story = {
  args: {
    username: 'unknown-node',
    classification: 'unclassified',
    nodeCount: 3,
    locationCount: 2,
    lastSeen: Date.now() / 1000 - 7200, // 2 hours ago
  },
};

/**
 * Interactive card with link showing hover effects.
 * The card is clickable and navigates to the detail page.
 */
export const Interactive: Story = {
  args: {
    username: 'clickable-user',
    classification: 'individual',
    nodeCount: 5,
    locationCount: 3,
    lastSeen: Date.now() / 1000,
    clientVersion: 'v0.0.69-test',
    consensusImplementations: ['nimbus'],
    to: '/contributors/clickable-user',
  },
};

/**
 * Contributor with very long names (tests truncation).
 */
export const LongNames: Story = {
  args: {
    username: 'verylongusernamethatshouldtruncate123456789',
    classification: 'corporate',
    nodeCount: 1,
    locationCount: 1,
    lastSeen: Date.now() / 1000,
  },
};

/**
 * Contributor with version badge and client logo only (no location data).
 */
export const NoLocationData: Story = {
  args: {
    username: 'ethpandaops',
    classification: 'internal',
    nodeCount: 42,
    locationCount: 15,
    lastSeen: Date.now() / 1000,
    clientVersion: 'v0.0.70-stable',
    consensusImplementations: ['lodestar'],
  },
};

/**
 * Contributor running multiple versions.
 */
export const MultipleVersions: Story = {
  args: {
    username: 'power-user',
    classification: 'corporate',
    nodeCount: 8,
    locationCount: 3,
    lastSeen: Date.now() / 1000,
    clientVersion: 'Multi Versions',
    consensusImplementations: ['lighthouse', 'prysm'],
  },
};

/**
 * Grid layout example showing multiple cards.
 */
export const GridLayout: Story = {
  args: {
    username: '',
    classification: 'individual',
    nodeCount: 0,
    locationCount: 0,
    lastSeen: 0,
  },
  render: () => (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <UserCard
        username="abstractdrank74"
        classification="individual"
        nodeCount={1}
        locationCount={1}
        lastSeen={Date.now() / 1000}
        primaryCountry="US"
        primaryCity="San Francisco"
        clientVersion="v0.0.70-7195855"
        consensusImplementations={['lighthouse']}
      />
      <UserCard
        username="besiegedclimber34"
        classification="individual"
        nodeCount={1}
        locationCount={1}
        lastSeen={Date.now() / 1000 - 1800}
        primaryCountry="DE"
        primaryCity="Berlin"
        clientVersion="v0.0.69-abc123"
        consensusImplementations={['prysm']}
      />
      <UserCard
        username="bonniesetup9"
        classification="individual"
        nodeCount={1}
        locationCount={1}
        lastSeen={Date.now() / 1000 - 3600}
        primaryCountry="JP"
        primaryCity="Tokyo"
        clientVersion="v0.0.68-xyz789"
        consensusImplementations={['teku']}
      />
      <UserCard
        username="techcorp"
        classification="corporate"
        nodeCount={8}
        locationCount={3}
        lastSeen={Date.now() / 1000 - 300}
        clientVersion="v0.0.71-corp"
        consensusImplementations={['nimbus']}
      />
      <UserCard
        username="ethpandaops"
        classification="internal"
        nodeCount={25}
        locationCount={12}
        lastSeen={Date.now() / 1000 - 7200}
        clientVersion="v0.0.72-main"
        consensusImplementations={['lodestar']}
      />
      <UserCard
        username="unknown"
        classification="unclassified"
        nodeCount={1}
        locationCount={1}
        lastSeen={Date.now() / 1000 - 1200}
      />
    </div>
  ),
};
