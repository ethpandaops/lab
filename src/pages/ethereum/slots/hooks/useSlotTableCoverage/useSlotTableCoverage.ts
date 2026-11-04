import { useState } from 'react';
import { useBounds } from '@/hooks/useBounds';
import { useNetwork } from '@/hooks/useNetwork';

/** Settled attestation tables the slot page reads, each with a head counterpart for slots they don't cover yet */
export type SettledAttestationTable =
  | 'fct_attestation_correctness'
  | 'int_attestation_attested'
  | 'fct_attestation_liveness_by_entity';

const SETTLED_TABLES: SettledAttestationTable[] = [
  'fct_attestation_correctness',
  'int_attestation_attested',
  'fct_attestation_liveness_by_entity',
];

export interface SlotTableCoverage {
  /** True until the bounds have loaded (or failed to) */
  isLoading: boolean;
  /** Whether to read the settled table; false means its `_head` counterpart */
  settled: Record<SettledAttestationTable, boolean>;
  /** The table's first slot time when this slot predates it, otherwise undefined */
  dataStart: (table: string) => number | undefined;
}

interface SettledChoice {
  key: string;
  settled: Record<SettledAttestationTable, boolean>;
}

/**
 * Which tables cover a slot, from `/bounds`.
 *
 * Settled tables are read when they already reach the slot; their `_head` counterparts serve newer slots. The choice
 * is made once per slot, so a table settling while the page is open does not swap sources and reload the page.
 */
export function useSlotTableCoverage(slotTimestamp: number): SlotTableCoverage {
  const { currentNetwork } = useNetwork();
  const { data: bounds, isLoading } = useBounds();
  const key = `${currentNetwork?.name}:${slotTimestamp}`;

  const [choice, setChoice] = useState<SettledChoice | null>(null);
  if (currentNetwork && !isLoading && choice?.key !== key) {
    // Without bounds (the request failed), every table falls back to head
    const settled = Object.fromEntries(
      SETTLED_TABLES.map(table => [table, !!bounds?.[table] && slotTimestamp <= bounds[table].max])
    ) as Record<SettledAttestationTable, boolean>;
    setChoice({ key, settled });
  }
  const current = choice?.key === key ? choice : null;

  return {
    isLoading: !current,
    settled:
      current?.settled ??
      (Object.fromEntries(SETTLED_TABLES.map(table => [table, false])) as Record<SettledAttestationTable, boolean>),
    dataStart: table => {
      const min = bounds?.[table]?.min;
      return min !== undefined && slotTimestamp < min ? min : undefined;
    },
  };
}

/** "No data before 2025-05-14" (or "No entity data before …"), for a slot older than the table's first row */
export function noDataBefore(start: number, subject?: string): string {
  return `No ${subject ? `${subject} ` : ''}data before ${new Date(start * 1000).toISOString().slice(0, 10)}`;
}
