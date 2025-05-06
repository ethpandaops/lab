import { Node, Proposer } from '@/api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb';

export interface BlockData {
  block_root?: string;
  blockRoot?: string;
  execution_payload_block_hash?: string;
  executionPayloadBlockHash?: string;
  execution_payload_transactions_count?: number;
  executionPayloadTransactionsCount?: number;
  execution_payload_block_number?: number | string;
  executionPayloadBlockNumber?: number | string;
  execution_payload_blob_gas_used?: number | string;
  executionPayloadBlobGasUsed?: number | string;
  slotTime?: number;
  blockTotalBytes?: number;
  [key: string]: any;
}

export interface BidData {
  relayName: string;
  value: number;
  time: number;
  blockHash?: string;
  builderPubkey?: string;
  isWinning?: boolean;
}

export interface WinningBidData {
  blockHash: string;
  value: number;
  relayName: string;
  builderPubkey?: string;
}

export interface TimeRange {
  min: number;
  max: number;
  ticks: number[];
}

export interface ValueRange {
  min: number;
  max: number;
}

// Enum for phase types
export enum Phase {
  Building = 'building',
  Propagating = 'propagating',
  Attesting = 'attesting',
  Accepted = 'accepted'
}

// Common props interface for block production components
export interface BlockProductionBaseProps {
  bids: BidData[];
  currentTime: number; // in ms relative to slot start
  relayColors: Record<string, string>;
  winningBid?: WinningBidData | null;
  slot?: number;
  proposer?: Proposer;
  proposerEntity?: string;
  nodes?: Record<string, Node>;
  blockTime?: number;
  nodeBlockSeen?: Record<string, number>;
  nodeBlockP2P?: Record<string, number>;
  block?: BlockData;
}