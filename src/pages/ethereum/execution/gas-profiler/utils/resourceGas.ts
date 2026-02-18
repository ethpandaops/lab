/**
 * Resource gas types, constants, and helpers.
 *
 * Resource categories decompose EVM gas into the system resources it pays for:
 * Compute, Memory, Address Access, State Growth, History, Bloom Topics, Block Size.
 *
 * This is a different dimension from opcode categories which answer
 * "which EVM instructions used gas?" -- resource categories answer
 * "what system resources did gas pay for?"
 */

import type {
  IntBlockResourceGas,
  IntTransactionResourceGas,
  IntTransactionCallFrameOpcodeResourceGas,
} from '@/api/types.gen';

/** Canonical resource category names */
export const RESOURCE_CATEGORIES = [
  'Compute',
  'Memory',
  'Address Access',
  'State Growth',
  'History',
  'Bloom Topics',
  'Block Size',
] as const;

export type ResourceCategory = (typeof RESOURCE_CATEGORIES)[number];

/** Color scheme deliberately distinct from opcode CATEGORY_COLORS */
export const RESOURCE_COLORS: Record<string, string> = {
  Compute: '#3b82f6', // blue
  Memory: '#8b5cf6', // violet
  'Address Access': '#f59e0b', // amber
  'State Growth': '#ef4444', // red
  History: '#06b6d4', // cyan
  'Bloom Topics': '#ec4899', // pink
  'Block Size': '#64748b', // slate
  Refund: '#22c55e', // green
};

/** A single resource breakdown entry for display */
export interface ResourceGasEntry {
  category: string;
  gas: number;
  percentage: number;
  color: string;
}

/**
 * Extract resource gas fields from a block or transaction resource gas record
 * into a sorted array of entries suitable for chart display.
 */
export function toResourceEntries(
  record: IntBlockResourceGas | IntTransactionResourceGas | null | undefined
): ResourceGasEntry[] {
  if (!record) return [];

  const raw: [string, number][] = [
    ['Compute', record.gas_compute ?? 0],
    ['Memory', record.gas_memory ?? 0],
    ['Address Access', record.gas_address_access ?? 0],
    ['State Growth', record.gas_state_growth ?? 0],
    ['History', record.gas_history ?? 0],
    ['Bloom Topics', record.gas_bloom_topics ?? 0],
    ['Block Size', record.gas_block_size ?? 0],
  ];

  const total = raw.reduce((sum, [, v]) => sum + v, 0);
  if (total === 0) return [];

  return raw
    .filter(([, v]) => v > 0)
    .map(([category, gas]) => ({
      category,
      gas,
      percentage: (gas / total) * 100,
      color: RESOURCE_COLORS[category] ?? '#9ca3af',
    }))
    .sort((a, b) => b.gas - a.gas);
}

/**
 * Aggregate per-opcode resource gas records into category totals.
 * Used for call-frame-level resource breakdown.
 */
export function aggregateOpcodeResourceGas(records: IntTransactionCallFrameOpcodeResourceGas[]): ResourceGasEntry[] {
  const totals: Record<string, number> = {};

  for (const r of records) {
    totals['Compute'] = (totals['Compute'] ?? 0) + (r.gas_compute ?? 0);
    totals['Memory'] = (totals['Memory'] ?? 0) + (r.gas_memory ?? 0);
    totals['Address Access'] = (totals['Address Access'] ?? 0) + (r.gas_address_access ?? 0);
    totals['State Growth'] = (totals['State Growth'] ?? 0) + (r.gas_state_growth ?? 0);
    totals['History'] = (totals['History'] ?? 0) + (r.gas_history ?? 0);
    totals['Bloom Topics'] = (totals['Bloom Topics'] ?? 0) + (r.gas_bloom_topics ?? 0);
    totals['Block Size'] = (totals['Block Size'] ?? 0) + (r.gas_block_size ?? 0);
  }

  const total = Object.values(totals).reduce((sum, v) => sum + v, 0);
  if (total === 0) return [];

  return Object.entries(totals)
    .filter(([, v]) => v > 0)
    .map(([category, gas]) => ({
      category,
      gas,
      percentage: (gas / total) * 100,
      color: RESOURCE_COLORS[category] ?? '#9ca3af',
    }))
    .sort((a, b) => b.gas - a.gas);
}

/** Per-opcode resource attribution row */
export interface OpcodeResourceRow {
  opcode: string;
  totalGas: number;
  count: number;
  compute: number;
  memory: number;
  addressAccess: number;
  stateGrowth: number;
  history: number;
  bloomTopics: number;
  blockSize: number;
}

/**
 * Transform per-opcode resource gas records into rows for the resource table.
 * Aggregates records sharing the same opcode name (across call frames / transactions).
 */
export function toOpcodeResourceRows(records: IntTransactionCallFrameOpcodeResourceGas[]): OpcodeResourceRow[] {
  const map = new Map<string, OpcodeResourceRow>();

  for (const r of records) {
    const opcode = r.opcode ?? 'UNKNOWN';
    const existing = map.get(opcode);
    if (existing) {
      existing.totalGas += r.gas ?? 0;
      existing.count += r.count ?? 0;
      existing.compute += r.gas_compute ?? 0;
      existing.memory += r.gas_memory ?? 0;
      existing.addressAccess += r.gas_address_access ?? 0;
      existing.stateGrowth += r.gas_state_growth ?? 0;
      existing.history += r.gas_history ?? 0;
      existing.bloomTopics += r.gas_bloom_topics ?? 0;
      existing.blockSize += r.gas_block_size ?? 0;
    } else {
      map.set(opcode, {
        opcode,
        totalGas: r.gas ?? 0,
        count: r.count ?? 0,
        compute: r.gas_compute ?? 0,
        memory: r.gas_memory ?? 0,
        addressAccess: r.gas_address_access ?? 0,
        stateGrowth: r.gas_state_growth ?? 0,
        history: r.gas_history ?? 0,
        bloomTopics: r.gas_bloom_topics ?? 0,
        blockSize: r.gas_block_size ?? 0,
      });
    }
  }

  return [...map.values()].sort((a, b) => b.totalGas - a.totalGas);
}

/** Get the refund value from a resource gas record (block or transaction level) */
export function getResourceRefund(record: IntBlockResourceGas | IntTransactionResourceGas | null | undefined): number {
  return record?.gas_refund ?? 0;
}

/** Get total resource gas (sum of all 7 categories, excluding refund) */
export function getTotalResourceGas(
  record: IntBlockResourceGas | IntTransactionResourceGas | null | undefined
): number {
  if (!record) return 0;
  return (
    (record.gas_compute ?? 0) +
    (record.gas_memory ?? 0) +
    (record.gas_address_access ?? 0) +
    (record.gas_state_growth ?? 0) +
    (record.gas_history ?? 0) +
    (record.gas_bloom_topics ?? 0) +
    (record.gas_block_size ?? 0)
  );
}
