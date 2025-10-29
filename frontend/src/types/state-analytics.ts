/**
 * State Analytics Types
 *
 * TypeScript interfaces for Ethereum state growth and storage analytics.
 * These types match the protobuf definitions in backend/pkg/server/proto/state_analytics/
 */

/**
 * Period enum for state analytics queries
 */
export enum StatePeriod {
  PERIOD_24H = '24h',
  PERIOD_7D = '7d',
  PERIOD_30D = '30d',
  PERIOD_90D = '90d',
}

/**
 * Granularity enum for chart data
 */
export enum StateGranularity {
  BLOCK = 'block',
  HOUR = 'hour',
  DAY = 'day',
}

/**
 * Latest block state delta response
 */
export interface LatestBlockDeltaResponse {
  block_number: number;
  block_timestamp: { seconds: number };
  new_slots_count: number;
  cleared_slots_count: number;
  modified_slots_count: number;
  net_state_change_bytes: number;
  estimated_bytes_added: number;
  top_contributors?: Array<{
    address?: string;
    new_slots?: number;
    modified_slots?: number;
    cleared_slots?: number;
    net_bytes?: number;
  }>;
}

/**
 * State adder (contract adding storage)
 */
export interface StateAdder {
  rank: number;
  address: string;
  slots_added: number;
  estimated_bytes_added: number;
  category?: string;
  label?: string;
  percentage_of_total: number;
}

/**
 * Top state adders response
 */
export interface TopStateAddersResponse {
  period?: StatePeriod;
  start_block: number;
  end_block: number;
  total_slots_added?: number;
  adders: StateAdder[];
}

/**
 * State remover (contract clearing storage)
 */
export interface StateRemover {
  rank: number;
  address: string;
  slots_cleared: number;
  estimated_bytes_freed: number;
  estimated_gas_refund: number;
  category?: string;
  label?: string;
  percentage_of_total: number;
}

/**
 * Top state removers response
 */
export interface TopStateRemoversResponse {
  period?: StatePeriod;
  start_block: number;
  end_block: number;
  total_slots_cleared?: number;
  removers: StateRemover[];
}

/**
 * State growth data point
 */
export interface StateGrowthDataPoint {
  timestamp: { seconds: number };
  block_number: number;
  slots_added: number;
  slots_cleared: number;
  net_slots: number;
  bytes_added: number;
  bytes_cleared: number;
  net_bytes: number;
}

/**
 * State growth summary
 */
export interface StateGrowthSummary {
  total_slots_added: number;
  total_slots_cleared: number;
  net_slots: number;
  total_bytes_added: number;
  total_bytes_cleared: number;
  net_bytes: number;
  avg_slots_per_block: number;
}

/**
 * State growth chart response
 */
export interface StateGrowthChartResponse {
  period?: StatePeriod;
  granularity?: StateGranularity;
  start_block?: number;
  end_block?: number;
  data_points: StateGrowthDataPoint[];
  summary: StateGrowthSummary;
}

/**
 * Contract state metrics
 */
export interface ContractStateMetrics {
  totalSlotsAdded: number;
  totalSlotsCleared: number;
  netSlots: number;
  estimatedBytesAdded: number;
  estimatedBytesFreed: number;
  netBytes: number;
  firstSeenBlock: number;
  lastSeenBlock: number;
}

/**
 * Contract state event
 */
export interface ContractStateEvent {
  blockNumber: number;
  timestamp: number;
  slotsAdded: number;
  slotsCleared: number;
  netChange: number;
}

/**
 * Contract state activity response
 */
export interface ContractStateActivityResponse {
  address: string;
  label?: string;
  category?: string;
  metrics: ContractStateMetrics;
  recentEvents: ContractStateEvent[];
}

/**
 * Parameters for getStateLatest API call
 */
export interface StateLatestParams {}

/**
 * Parameters for getStateTopAdders API call
 */
export interface StateTopAddersParams {
  period?: StatePeriod;
  limit?: number;
}

/**
 * Parameters for getStateTopRemovers API call
 */
export interface StateTopRemoversParams {
  period?: StatePeriod;
  limit?: number;
}

/**
 * Parameters for getStateGrowthChart API call
 */
export interface StateGrowthChartParams {
  period?: StatePeriod;
  granularity?: StateGranularity;
}

/**
 * Parameters for getContractStateActivity API call
 */
export interface ContractStateActivityParams {
  limit?: number;
}

/**
 * Contract state information (Paradigm diagram)
 */
export interface ContractState {
  storage_slot_count: number;
  total_bytes: number;
  bytecode_bytes: number;
  first_seen_block: number;
  last_active_block: number;
}

/**
 * Contract state entry (Paradigm diagram)
 */
export interface ContractStateEntry {
  address: string;
  label?: string;
  category?: string;
  protocol?: string;
  state: ContractState;
  percentage_of_total: number;
}

/**
 * Contract state composition response (Paradigm diagram flat data)
 */
export interface ContractStateCompositionResponse {
  contracts: ContractStateEntry[];
  block_number: number;
  timestamp: { seconds: number };
  total_state_bytes: number;
}

/**
 * State node for hierarchical visualization (Paradigm diagram tree)
 */
export interface StateNode {
  name: string;
  type: 'root' | 'category' | 'protocol' | 'contract';
  size_bytes: number;
  children?: StateNode[];
  metadata?: Record<string, string>;
}

/**
 * Hierarchical state response (Paradigm diagram tree structure)
 */
export interface HierarchicalStateResponse {
  root: StateNode;
  block_number: number;
  timestamp: { seconds: number };
}

/**
 * Parameters for getContractStateComposition API call
 */
export interface ContractStateCompositionParams {
  limit?: number;
  min_size_bytes?: number;
  include_labels?: boolean;
}

/**
 * Parameters for getHierarchicalState API call
 */
export interface HierarchicalStateParams {
  max_depth?: number;
  contracts_per_protocol?: number;
}
