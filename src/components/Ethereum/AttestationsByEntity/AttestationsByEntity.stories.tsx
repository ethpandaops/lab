import type { Meta, StoryObj } from '@storybook/react-vite';
import { AttestationsByEntity } from './AttestationsByEntity';

const meta = {
  title: 'Components/Ethereum/AttestationsByEntity',
  component: AttestationsByEntity,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AttestationsByEntity>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Shows the top 10 entities with missed attestations
 */
export const MissedAttestations: Story = {
  args: {
    data: [
      { entity: 'Lido', count: 234 },
      { entity: 'Coinbase', count: 156 },
      { entity: 'Kraken', count: 89 },
      { entity: 'Binance', count: 67 },
      { entity: 'Rocket Pool', count: 45 },
      { entity: 'Staked.us', count: 34 },
      { entity: 'Bitcoin Suisse', count: 28 },
      { entity: 'Figment', count: 23 },
      { entity: 'Stakewise', count: 18 },
      { entity: 'Allnodes', count: 12 },
    ],
    title: 'Missed Attestations by Entity',
    subtitle: '706 total missed attestations',
    anchorId: 'missed-attestations',
  },
};

/**
 * Shows the top attesters (successful attestations)
 */
export const TopAttesters: Story = {
  args: {
    data: [
      { entity: 'Lido', count: 12543 },
      { entity: 'Coinbase', count: 8932 },
      { entity: 'Kraken', count: 6721 },
      { entity: 'Binance', count: 5834 },
      { entity: 'Rocket Pool', count: 4521 },
      { entity: 'Staked.us', count: 3210 },
      { entity: 'Bitcoin Suisse', count: 2567 },
      { entity: 'Figment', count: 1987 },
      { entity: 'Stakewise', count: 1543 },
      { entity: 'Allnodes', count: 1234 },
    ],
    title: 'Top Attesters by Entity',
    subtitle: '49,092 total attestations',
    anchorId: 'top-attesters',
  },
};

/**
 * Shows a vertical bar chart orientation
 */
export const VerticalOrientation: Story = {
  args: {
    data: [
      { entity: 'Lido', count: 234 },
      { entity: 'Coinbase', count: 156 },
      { entity: 'Kraken', count: 89 },
      { entity: 'Binance', count: 67 },
      { entity: 'Rocket Pool', count: 45 },
    ],
    title: 'Missed Attestations (Vertical)',
    subtitle: '591 total missed',
    anchorId: 'missed-vertical',
    orientation: 'vertical',
  },
};

/**
 * Shows fewer entities (top 5 instead of 10)
 */
export const Top5Only: Story = {
  args: {
    data: [
      { entity: 'Lido', count: 234 },
      { entity: 'Coinbase', count: 156 },
      { entity: 'Kraken', count: 89 },
      { entity: 'Binance', count: 67 },
      { entity: 'Rocket Pool', count: 45 },
    ],
    title: 'Top 5 Entities - Missed Attestations',
    subtitle: '591 total missed attestations',
    anchorId: 'top-5',
  },
};

/**
 * Shows empty state when no data is available
 */
export const EmptyState: Story = {
  args: {
    data: [],
    title: 'Missed Attestations by Entity',
    anchorId: 'empty-state',
    emptyMessage: 'No missed attestations for this slot',
  },
};

/**
 * Shows custom empty message
 */
export const CustomEmptyMessage: Story = {
  args: {
    data: [],
    title: 'Attestations by Entity',
    anchorId: 'custom-empty',
    emptyMessage: 'Perfect! All validators attested successfully.',
  },
};
