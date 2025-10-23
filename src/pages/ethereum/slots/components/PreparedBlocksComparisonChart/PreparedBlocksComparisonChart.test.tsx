import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PreparedBlocksComparisonChart } from './PreparedBlocksComparisonChart';
import type { FctPreparedBlock } from '@/api/types.gen';
import type { ProposedBlockData } from './PreparedBlocksComparisonChart.types';

// Mock the theme colors hook
vi.mock('@/hooks/useThemeColors', () => ({
  useThemeColors: () => ({
    foreground: '#000000',
    background: '#ffffff',
    muted: '#666666',
    border: '#cccccc',
    success: '#22c55e',
    accent: '#3b82f6',
    warning: '#f59e0b',
  }),
}));

describe('PreparedBlocksComparisonChart', () => {
  const mockPreparedBlocks: FctPreparedBlock[] = [
    {
      meta_client_name: 'geth-lighthouse-1',
      meta_client_version: 'v1.10.0',
      execution_payload_value: '1000000000000000000', // 1 ETH
      consensus_payload_value: '500000000000000000', // 0.5 ETH
      execution_payload_transactions_count: 150,
      execution_payload_gas_used: 15000000,
      slot: 1000,
      slot_start_date_time: 1234567890,
    },
    {
      meta_client_name: 'besu-prysm-1',
      meta_client_version: 'v2.0.0',
      execution_payload_value: '1200000000000000000', // 1.2 ETH
      consensus_payload_value: '600000000000000000', // 0.6 ETH
      execution_payload_transactions_count: 180,
      execution_payload_gas_used: 18000000,
      slot: 1000,
      slot_start_date_time: 1234567890,
    },
  ];

  const mockProposedBlock: ProposedBlockData = {
    execution_payload_value: '1100000000000000000', // 1.1 ETH
    consensus_payload_value: '550000000000000000', // 0.55 ETH
    execution_payload_gas_used: 16000000,
  };

  it('renders empty state when no prepared blocks', () => {
    render(<PreparedBlocksComparisonChart preparedBlocks={[]} />);

    expect(screen.getByText('No prepared blocks available for comparison')).toBeInTheDocument();
  });

  it('renders chart with prepared blocks', () => {
    render(<PreparedBlocksComparisonChart preparedBlocks={mockPreparedBlocks} />);

    expect(screen.getByText('Prepared Blocks Comparison')).toBeInTheDocument();
    expect(screen.getByText('2 prepared blocks')).toBeInTheDocument();
  });

  it('shows best client information', () => {
    render(<PreparedBlocksComparisonChart preparedBlocks={mockPreparedBlocks} />);

    // Besu should be best with 1.8 ETH total
    expect(screen.getByText(/Best Client:/)).toBeInTheDocument();
    expect(screen.getByText('besu')).toBeInTheDocument();
  });

  it('shows proposed block and delta when provided', () => {
    render(<PreparedBlocksComparisonChart preparedBlocks={mockPreparedBlocks} proposedBlock={mockProposedBlock} />);

    expect(screen.getByText(/Proposed:/)).toBeInTheDocument();
    expect(screen.getByText(/Delta:/)).toBeInTheDocument();
  });

  it('calculates rewards correctly', () => {
    render(<PreparedBlocksComparisonChart preparedBlocks={mockPreparedBlocks} proposedBlock={mockProposedBlock} />);

    // Besu total: 1.8 ETH
    // Proposed: 1.65 ETH
    // Delta: +0.15 ETH
    expect(screen.getByText(/1.800000 ETH/)).toBeInTheDocument();
    expect(screen.getByText(/1.650000 ETH/)).toBeInTheDocument();
  });

  it('groups blocks by execution client', () => {
    const multipleGethBlocks: FctPreparedBlock[] = [
      {
        meta_client_name: 'geth-lighthouse-1',
        execution_payload_value: '1000000000000000000',
        consensus_payload_value: '500000000000000000',
        slot: 1000,
        slot_start_date_time: 1234567890,
      },
      {
        meta_client_name: 'geth-prysm-2',
        execution_payload_value: '1500000000000000000', // Higher reward
        consensus_payload_value: '500000000000000000',
        slot: 1000,
        slot_start_date_time: 1234567890,
      },
    ];

    render(<PreparedBlocksComparisonChart preparedBlocks={multipleGethBlocks} />);

    // Should only show one geth entry (the better one)
    expect(screen.getByText('geth')).toBeInTheDocument();
    expect(screen.getByText('1 prepared blocks')).toBeInTheDocument();
  });
});
