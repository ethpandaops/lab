import { useQuery } from '@tanstack/react-query';
import { fctPreparedBlockServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { FctPreparedBlock } from '@/api/types.gen';
import { useTableBounds } from '@/hooks/useBounds';
import { SECONDS_PER_SLOT } from '@/utils/beacon';
import { parseClientName } from '../utils';

/**
 * Extended block data with parsed client names
 */
export interface ParsedBlock extends FctPreparedBlock {
  parsedExecutionClient: string | null;
  parsedConsensusClient: string | null;
}

export interface SlotBlocksGroup {
  slot: number;
  slotStartDateTime: number;
  blocks: ParsedBlock[];
  executionClients: Set<string>;
  consensusClients: Set<string>;
}

/**
 * Pre-calculated block counts for each client in each slot
 * Key format: "slot:client:isExecution"
 */
export type BlockCountMap = Map<string, number>;

/**
 * Client pairing counts
 * Key format: "execClient:consensusClient"
 */
export type ClientPairingMap = Map<string, number>;

export interface UseSlotBlocksResult {
  slotGroups: SlotBlocksGroup[];
  allExecutionClients: string[];
  allConsensusClients: string[];
  blockCountMap: BlockCountMap;
  maxBlockCount: number;
  clientPairingMap: ClientPairingMap;
  maxPairingCount: number;
  allBlocks: ParsedBlock[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
}

const SLOTS_TO_SHOW = 6;

/**
 * Hook to fetch prepared blocks and group them by slot
 * Returns the last N slots with their blocks organized by client combinations
 * Uses bounds API to determine the latest available data, then queries by timestamp
 */
export function useSlotBlocks(): UseSlotBlocksResult {
  // Get bounds for the fct_prepared_block table
  // Bounds contain timestamps (slot_start_date_time), not slot numbers
  const { data: bounds, isLoading: boundsLoading, error: boundsError } = useTableBounds('fct_prepared_block');

  // Calculate the timestamp range to query: last N slots worth of time from the max timestamp
  // Each slot is SECONDS_PER_SLOT (12) seconds
  const maxTimestamp = bounds?.max;
  const minTimestamp = maxTimestamp ? maxTimestamp - SLOTS_TO_SHOW * SECONDS_PER_SLOT : undefined;

  const {
    data,
    error,
    isPending: dataPending,
    isFetching: dataFetching,
  } = useQuery({
    ...fctPreparedBlockServiceListOptions({
      query: {
        // Query by timestamp range (slot_start_date_time field)
        slot_start_date_time_gte: minTimestamp,
        slot_start_date_time_lte: maxTimestamp,
        page_size: 1000, // Fetch enough to cover multiple slots and all client combinations
        order_by: 'slot desc',
      },
    }),
    // Only enable query when we have bounds
    enabled: !!bounds && !!minTimestamp && !!maxTimestamp,
    // Keep previous data while fetching new data (prevents flash)
    placeholderData: previousData => previousData,
  });

  // Handle errors from either bounds or data query
  if (boundsError) {
    return {
      slotGroups: [],
      allExecutionClients: [],
      allConsensusClients: [],
      blockCountMap: new Map(),
      maxBlockCount: 0,
      clientPairingMap: new Map(),
      maxPairingCount: 0,
      allBlocks: [],
      isLoading: false,
      isFetching: false,
      error: boundsError as Error,
    };
  }

  if (error) {
    return {
      slotGroups: [],
      allExecutionClients: [],
      allConsensusClients: [],
      blockCountMap: new Map(),
      maxBlockCount: 0,
      clientPairingMap: new Map(),
      maxPairingCount: 0,
      allBlocks: [],
      isLoading: false,
      isFetching: false,
      error: error as Error,
    };
  }

  // Initial loading (no data yet) - use isPending which is only true on first load
  if (boundsLoading || dataPending || !bounds) {
    return {
      slotGroups: [],
      allExecutionClients: [],
      allConsensusClients: [],
      blockCountMap: new Map(),
      maxBlockCount: 0,
      clientPairingMap: new Map(),
      maxPairingCount: 0,
      allBlocks: [],
      isLoading: true,
      isFetching: true,
      error: null,
    };
  }

  if (!data?.fct_prepared_block) {
    return {
      slotGroups: [],
      allExecutionClients: [],
      allConsensusClients: [],
      blockCountMap: new Map(),
      maxBlockCount: 0,
      clientPairingMap: new Map(),
      maxPairingCount: 0,
      allBlocks: [],
      isLoading: false,
      isFetching: dataFetching,
      error: null,
    };
  }

  // Parse client names ONCE and augment blocks
  const parsedBlocks: ParsedBlock[] = data.fct_prepared_block.map(block => {
    const { executionClient, consensusClient } = parseClientName(block.meta_client_name);
    return {
      ...block,
      parsedExecutionClient: executionClient,
      parsedConsensusClient: consensusClient,
    };
  });

  // Group blocks by slot
  const slotMap = new Map<number, SlotBlocksGroup>();
  const allExecClients = new Set<string>();
  const allConsensusClients = new Set<string>();

  for (const block of parsedBlocks) {
    if (!block.slot || !block.slot_start_date_time) continue;

    if (!slotMap.has(block.slot)) {
      slotMap.set(block.slot, {
        slot: block.slot,
        slotStartDateTime: block.slot_start_date_time,
        blocks: [],
        executionClients: new Set(),
        consensusClients: new Set(),
      });
    }

    const group = slotMap.get(block.slot)!;
    group.blocks.push(block);

    // Track clients at slot level and globally
    if (block.parsedExecutionClient) {
      group.executionClients.add(block.parsedExecutionClient);
      allExecClients.add(block.parsedExecutionClient);
    }
    if (block.parsedConsensusClient) {
      group.consensusClients.add(block.parsedConsensusClient);
      allConsensusClients.add(block.parsedConsensusClient);
    }
  }

  // Convert to array and sort by slot descending, then take first N
  const slotGroups = Array.from(slotMap.values())
    .sort((a, b) => b.slot - a.slot)
    .slice(0, SLOTS_TO_SHOW);

  // Pre-calculate block counts for each client in each slot
  // This eliminates the need for components to loop and count repeatedly
  const blockCountMap = new Map<string, number>();

  for (const group of slotGroups) {
    // Track unique nodes (not blocks) per client per slot
    const execNodeMap = new Map<string, Set<string>>(); // client -> Set of node names
    const consensusNodeMap = new Map<string, Set<string>>(); // client -> Set of node names

    for (const block of group.blocks) {
      // Execution clients
      if (block.parsedExecutionClient && block.meta_client_name) {
        if (!execNodeMap.has(block.parsedExecutionClient)) {
          execNodeMap.set(block.parsedExecutionClient, new Set());
        }
        execNodeMap.get(block.parsedExecutionClient)!.add(block.meta_client_name);
      }

      // Consensus clients
      if (block.parsedConsensusClient && block.meta_client_name) {
        if (!consensusNodeMap.has(block.parsedConsensusClient)) {
          consensusNodeMap.set(block.parsedConsensusClient, new Set());
        }
        consensusNodeMap.get(block.parsedConsensusClient)!.add(block.meta_client_name);
      }
    }

    // Store counts in the map with key format "slot:client:isExecution"
    execNodeMap.forEach((nodes, client) => {
      const key = `${group.slot}:${client}:true`;
      blockCountMap.set(key, nodes.size);
    });

    consensusNodeMap.forEach((nodes, client) => {
      const key = `${group.slot}:${client}:false`;
      blockCountMap.set(key, nodes.size);
    });
  }

  // Find the maximum count for color scaling
  const maxBlockCount = Math.max(...Array.from(blockCountMap.values()), 1);

  // Calculate client pairing counts
  // Count unique node pairings (not individual blocks)
  const clientPairingMap = new Map<string, Set<string>>(); // "exec:consensus" -> Set of node names

  for (const block of parsedBlocks) {
    if (block.parsedExecutionClient && block.parsedConsensusClient && block.meta_client_name) {
      const key = `${block.parsedExecutionClient}:${block.parsedConsensusClient}`;
      if (!clientPairingMap.has(key)) {
        clientPairingMap.set(key, new Set());
      }
      clientPairingMap.get(key)!.add(block.meta_client_name);
    }
  }

  // Convert Set sizes to counts
  const pairingCounts = new Map<string, number>();
  for (const [key, nodes] of clientPairingMap.entries()) {
    pairingCounts.set(key, nodes.size);
  }

  const maxPairingCount = Math.max(...Array.from(pairingCounts.values()), 1);

  return {
    slotGroups,
    allExecutionClients: Array.from(allExecClients).sort(),
    allConsensusClients: Array.from(allConsensusClients).sort(),
    blockCountMap,
    maxBlockCount,
    clientPairingMap: pairingCounts,
    maxPairingCount,
    allBlocks: parsedBlocks,
    isLoading: false,
    isFetching: dataFetching,
    error: null,
  };
}
