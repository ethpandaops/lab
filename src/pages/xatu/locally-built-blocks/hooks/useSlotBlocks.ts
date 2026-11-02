import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fctPreparedBlockServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { FctPreparedBlock } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { parseClientName } from '../utils';
import type { PreparedBlockQuery } from '../utils/block-query';

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

/** Slots in the timeline */
const SLOTS_TO_SHOW = 6;

/** Rows fetched for the timeline, enough for its slots with every node */
const TIMELINE_ROWS = 500;

/** Refresh interval while the timeline follows the newest slots, one slot */
const LIVE_REFETCH_MS = 12_000;

/** Unique nodes per key */
function countNodes(blocks: ParsedBlock[], keyOf: (block: ParsedBlock) => string | null): Map<string, number> {
  const nodes = new Map<string, Set<string>>();
  for (const block of blocks) {
    const key = keyOf(block);
    if (!key || !block.meta_client_name) continue;
    if (!nodes.has(key)) nodes.set(key, new Set());
    nodes.get(key)!.add(block.meta_client_name);
  }
  return new Map([...nodes].map(([key, names]) => [key, names.size]));
}

/**
 * The newest slots with blocks matching the filters, grouped by slot, with per-client and pairing node counts.
 * `live` refreshes every slot, for queries without an upper bound.
 */
export function useSlotBlocks(filters: PreparedBlockQuery, live: boolean): UseSlotBlocksResult {
  const { currentNetwork } = useNetwork();

  const { data, error, isPending, isFetching } = useQuery({
    ...fctPreparedBlockServiceListOptions({
      query: { ...filters, page_size: TIMELINE_ROWS, order_by: 'slot_start_date_time desc' },
    }),
    enabled: !!currentNetwork && !!filters.slot_start_date_time_gte,
    placeholderData: keepPreviousData,
    refetchInterval: live ? LIVE_REFETCH_MS : false,
  });

  const parsedBlocks: ParsedBlock[] = (data?.fct_prepared_block ?? []).map(block => {
    const { executionClient, consensusClient } = parseClientName(block.meta_client_name);
    return { ...block, parsedExecutionClient: executionClient, parsedConsensusClient: consensusClient };
  });

  const slotMap = new Map<number, SlotBlocksGroup>();
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
    if (block.parsedExecutionClient) group.executionClients.add(block.parsedExecutionClient);
    if (block.parsedConsensusClient) group.consensusClients.add(block.parsedConsensusClient);
  }

  const slotGroups = [...slotMap.values()].sort((a, b) => b.slot - a.slot).slice(0, SLOTS_TO_SHOW);
  const allBlocks = slotGroups.flatMap(group => group.blocks);

  const blockCountMap: BlockCountMap = new Map();
  for (const group of slotGroups) {
    countNodes(group.blocks, block => block.parsedExecutionClient).forEach((count, client) =>
      blockCountMap.set(`${group.slot}:${client}:true`, count)
    );
    countNodes(group.blocks, block => block.parsedConsensusClient).forEach((count, client) =>
      blockCountMap.set(`${group.slot}:${client}:false`, count)
    );
  }

  const clientPairingMap: ClientPairingMap = countNodes(allBlocks, block =>
    block.parsedExecutionClient && block.parsedConsensusClient
      ? `${block.parsedExecutionClient}:${block.parsedConsensusClient}`
      : null
  );

  return {
    slotGroups,
    allExecutionClients: [...new Set(slotGroups.flatMap(group => [...group.executionClients]))].sort(),
    allConsensusClients: [...new Set(slotGroups.flatMap(group => [...group.consensusClients]))].sort(),
    blockCountMap,
    maxBlockCount: Math.max(...blockCountMap.values(), 1),
    clientPairingMap,
    maxPairingCount: Math.max(...clientPairingMap.values(), 1),
    allBlocks,
    isLoading: isPending,
    isFetching,
    error: error as Error | null,
  };
}
