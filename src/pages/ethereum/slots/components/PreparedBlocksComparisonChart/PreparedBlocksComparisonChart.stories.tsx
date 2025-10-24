import type { Meta, StoryObj } from '@storybook/react-vite';
import { PreparedBlocksComparisonChart } from './PreparedBlocksComparisonChart';
import type { FctPreparedBlock } from '@/api/types.gen';
import type { ProposedBlockData } from './PreparedBlocksComparisonChart.types';

const meta = {
  title: 'Pages/Ethereum/Slots/PreparedBlocksComparisonChart',
  component: PreparedBlocksComparisonChart,
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
} satisfies Meta<typeof PreparedBlocksComparisonChart>;

export default meta;
type Story = StoryObj<typeof meta>;

// Mock prepared blocks from different execution clients
const mockPreparedBlocks: FctPreparedBlock[] = [
  {
    meta_client_name: 'geth-lighthouse-node1',
    meta_client_version: 'v1.13.0',
    meta_client_implementation: 'geth',
    execution_payload_value: '1234567890000000000', // ~1.23 ETH
    consensus_payload_value: '456789000000000', // ~0.0005 ETH
    execution_payload_transactions_count: 142,
    execution_payload_gas_used: 14200000,
    execution_payload_gas_limit: 30000000,
    slot: 8500000,
    slot_start_date_time: 1700000000,
  },
  {
    meta_client_name: 'besu-teku-node1',
    meta_client_version: 'v23.10.0',
    meta_client_implementation: 'besu',
    execution_payload_value: '1456789012000000000', // ~1.46 ETH (best)
    consensus_payload_value: '567890000000000', // ~0.0006 ETH
    execution_payload_transactions_count: 158,
    execution_payload_gas_used: 15800000,
    execution_payload_gas_limit: 30000000,
    slot: 8500000,
    slot_start_date_time: 1700000000,
  },
  {
    meta_client_name: 'nethermind-nimbus-node1',
    meta_client_version: 'v1.21.0',
    meta_client_implementation: 'nethermind',
    execution_payload_value: '1123456789000000000', // ~1.12 ETH
    consensus_payload_value: '445678000000000', // ~0.0004 ETH
    execution_payload_transactions_count: 135,
    execution_payload_gas_used: 13500000,
    execution_payload_gas_limit: 30000000,
    slot: 8500000,
    slot_start_date_time: 1700000000,
  },
  {
    meta_client_name: 'erigon-prysm-node1',
    meta_client_version: 'v2.52.0',
    meta_client_implementation: 'erigon',
    execution_payload_value: '1345678901000000000', // ~1.35 ETH
    consensus_payload_value: '534567000000000', // ~0.0005 ETH
    execution_payload_transactions_count: 150,
    execution_payload_gas_used: 15000000,
    execution_payload_gas_limit: 30000000,
    slot: 8500000,
    slot_start_date_time: 1700000000,
  },
];

const mockProposedBlock: ProposedBlockData = {
  execution_payload_value: '1289012345000000000', // ~1.29 ETH (suboptimal)
  consensus_payload_value: '489012000000000', // ~0.0005 ETH
  execution_payload_gas_used: 14500000,
};

/**
 * Default story showing prepared blocks comparison without a proposed block
 */
export const Default: Story = {
  args: {
    preparedBlocks: mockPreparedBlocks,
  },
};

/**
 * Shows prepared blocks with the actually proposed block for comparison
 * Highlights that Besu would have been optimal but a suboptimal block was proposed
 */
export const WithProposedBlock: Story = {
  args: {
    preparedBlocks: mockPreparedBlocks,
    proposedBlock: mockProposedBlock,
  },
};

/**
 * Shows prepared blocks where the proposed block was optimal
 */
export const ProposedBlockIsOptimal: Story = {
  args: {
    preparedBlocks: mockPreparedBlocks.slice(0, 3), // Exclude erigon and besu
    proposedBlock: {
      execution_payload_value: '1456789012000000000', // Best reward
      consensus_payload_value: '567890000000000',
      execution_payload_gas_used: 15800000,
    },
  },
};

/**
 * Shows only two execution clients for comparison
 */
export const TwoClients: Story = {
  args: {
    preparedBlocks: mockPreparedBlocks.slice(0, 2),
    proposedBlock: mockProposedBlock,
  },
};

/**
 * Shows case with minimal data (single prepared block)
 */
export const SingleBlock: Story = {
  args: {
    preparedBlocks: [mockPreparedBlocks[0]],
  },
};

/**
 * Empty state - no prepared blocks
 */
export const EmptyState: Story = {
  args: {
    preparedBlocks: [],
  },
};

/**
 * Large difference between best prepared and proposed (missed opportunity)
 */
export const LargeDelta: Story = {
  args: {
    preparedBlocks: mockPreparedBlocks,
    proposedBlock: {
      execution_payload_value: '900000000000000000', // ~0.9 ETH (much worse)
      consensus_payload_value: '400000000000000', // ~0.0004 ETH
      execution_payload_gas_used: 10000000,
    },
  },
};

/**
 * Multiple blocks from same client (should group and show best)
 */
export const MultipleGethBlocks: Story = {
  args: {
    preparedBlocks: [
      {
        ...mockPreparedBlocks[0],
        meta_client_name: 'geth-lighthouse-node1',
        execution_payload_value: '1000000000000000000', // 1 ETH
      },
      {
        ...mockPreparedBlocks[0],
        meta_client_name: 'geth-prysm-node2',
        execution_payload_value: '1500000000000000000', // 1.5 ETH (better)
      },
      {
        ...mockPreparedBlocks[0],
        meta_client_name: 'geth-teku-node3',
        execution_payload_value: '1200000000000000000', // 1.2 ETH
      },
      ...mockPreparedBlocks.slice(1), // Other clients
    ],
  },
};
