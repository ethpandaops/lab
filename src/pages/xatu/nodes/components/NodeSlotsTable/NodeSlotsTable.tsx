import type { JSX } from 'react';
import clsx from 'clsx';
import { DataTable } from '@/components/DataTable';
import type { DataTableColumn } from '@/components/DataTable/DataTable.types';
import { Slot } from '@/components/Ethereum/Slot';
import { Card } from '@/components/Layout/Card';
import type { NetworkObservations } from '../../hooks/useNetworkObservations';
import type { NodeDataColumns } from '../../hooks/useNodeDataColumns';
import type { NodePerformance } from '../../hooks/useNodePerformance';
import { formatMs } from '../../utils/node-stats';

export interface NodeSlotsTableProps {
  performance: NodePerformance;
  network: NetworkObservations | null;
  columns: NodeDataColumns | null;
  /** End (exclusive) of the slots ingested so far */
  endSlot: number;
}

interface SlotRow {
  slot: number;
  block?: number;
  head?: number;
  attestation?: number;
  lastColumn?: number;
  /** Block arrival minus the network median */
  delta?: number;
}

/** A block this much later than the network median is flagged */
const LATE_DELTA_MS = 1000;

const columns: DataTableColumn<SlotRow>[] = [
  {
    id: 'slot',
    header: 'Slot',
    accessorKey: 'slot',
    cell: ({ row }) => <Slot slot={row.original.slot} />,
    meta: { cellClassName: 'text-foreground' },
  },
  ...(
    [
      ['block', 'Block'],
      ['head', 'Head'],
      ['attestation', 'Attestation p50'],
      ['lastColumn', 'Last column'],
    ] as const
  ).map(
    ([key, header]): DataTableColumn<SlotRow> => ({
      id: key,
      header,
      accessorFn: row => row[key],
      sortUndefined: 'last',
      cell: ({ getValue }) => formatMs(getValue() as number | undefined),
      meta: { cellClassName: 'text-foreground tabular-nums' },
    })
  ),
  {
    id: 'delta',
    header: 'vs network median',
    accessorFn: row => row.delta,
    sortUndefined: 'last',
    cell: ({ getValue }) => {
      const delta = getValue() as number | undefined;
      if (delta === undefined) return '–';
      return (
        <span className={clsx(delta > LATE_DELTA_MS && 'text-warning')}>
          {delta > 0 ? '+' : ''}
          {formatMs(delta)}
        </span>
      );
    },
    meta: { cellClassName: 'text-muted tabular-nums' },
  },
];

/**
 * Every slot in the range, newest first, with what the node saw and how it compares to the network.
 */
export function NodeSlotsTable({
  performance,
  network,
  columns: dataColumns,
  endSlot,
}: NodeSlotsTableProps): JSX.Element {
  const networkMedian = new Map(network?.slots.map(slot => [slot.slot, slot.p50]) ?? []);
  const rows: SlotRow[] = [];
  for (let slot = endSlot - 1; slot >= performance.window.startSlot; slot--) {
    const block = performance.block.get(slot);
    const head = performance.head.get(slot);
    const median = networkMedian.get(slot);
    rows.push({
      slot,
      block,
      head,
      attestation: performance.attestations.get(slot)?.p50,
      lastColumn: dataColumns?.slots.get(slot)?.last,
      delta: block !== undefined && median != null ? block - median : undefined,
    });
  }

  return (
    <Card title="Recent slots" subtitle="Last 64 slots">
      <div className="-m-4 sm:-m-5">
        <DataTable
          data={rows}
          columns={columns}
          pageSize={25}
          getRowId={row => String(row.slot)}
          hideGlobalFilter
          hideColumnVisibility
        />
      </div>
    </Card>
  );
}
