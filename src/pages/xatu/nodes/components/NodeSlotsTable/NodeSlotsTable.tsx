import type { JSX } from 'react';
import { DataTable } from '@/components/DataTable';
import type { DataTableColumn } from '@/components/DataTable/DataTable.types';
import { Slot } from '@/components/Ethereum/Slot';
import { Card } from '@/components/Layout/Card';
import type { NodeDataColumns } from '../../hooks/useNodeDataColumns';
import type { NodePerformance } from '../../hooks/useNodePerformance';
import { formatMs } from '../../utils/node-stats';

export interface NodeSlotsTableProps {
  performance: NodePerformance;
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
}

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
];

/**
 * Every slot in the range, newest first, with when the node saw each block, head, attestation and data column.
 */
export function NodeSlotsTable({ performance, columns: dataColumns, endSlot }: NodeSlotsTableProps): JSX.Element {
  const rows: SlotRow[] = [];
  for (let slot = endSlot - 1; slot >= performance.window.startSlot; slot--) {
    const block = performance.block.get(slot);
    const head = performance.head.get(slot);
    rows.push({
      slot,
      block,
      head,
      attestation: performance.attestations.get(slot)?.p50,
      lastColumn: dataColumns?.slots.get(slot)?.last,
    });
  }

  return (
    <Card title="Slots">
      <DataTable
        data={rows}
        columns={columns}
        density="comfortable"
        pageSize={25}
        getRowId={row => String(row.slot)}
        hideGlobalFilter
        hideColumnVisibility
      />
    </Card>
  );
}
