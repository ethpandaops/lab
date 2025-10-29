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
  blockNumber: number;
  timestamp: number;
  newSlots: number;
  clearedSlots: number;
  netStateChangeBytes: number;
  estimatedBytesAdded: number;
  estimatedBytesFreed: number;
}

/**
 * State adder (contract adding storage)
 */
export interface StateAdder {
  rank: number;
  address: string;
  slotsAdded: number;
  estimatedBytesAdded: number;
  category?: string;
  label?: string;
  percentageOfTotal: number;
}

/**
 * Top state adders response
 */
export interface TopStateAddersResponse {
  period: StatePeriod;
  startBlock: number;
  endBlock: number;
  totalSlotsAdded: number;
  adders: StateAdder[];
}

/**
 * State remover (contract clearing storage)
 */
export interface StateRemover {
  rank: number;
  address: string;
  slotsCleared: number;
  estimatedBytesFreed: number;
  estimatedGasRefund: number;
  category?: string;
  label?: string;
  percentageOfTotal: number;
}

/**
 * Top state removers response
 */
export interface TopStateRemoversResponse {
  period: StatePeriod;
  startBlock: number;
  endBlock: number;
  totalSlotsCleared: number;
  removers: StateRemover[];
}

/**
 * State growth data point
 */
export interface StateGrowthDataPoint {
  timestamp: number;
  blockNumber: number;
  newSlots: number;
  clearedSlots: number;
  netStateChangeBytes: number;
}

/**
 * State growth summary
 */
export interface StateGrowthSummary {
  totalNewSlots: number;
  totalClearedSlots: number;
  netStateChangeBytes: number;
  averageBlockGrowthBytes: number;
}

/**
 * State growth chart response
 */
export interface StateGrowthChartResponse {
  period: StatePeriod;
  granularity: StateGranularity;
  startBlock: number;
  endBlock: number;
  dataPoints: StateGrowthDataPoint[];
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
