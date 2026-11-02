import { useMemo, useState, type JSX } from 'react';
import { useNavigate } from '@tanstack/react-router';
import clsx from 'clsx';

import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { Entity } from '@/components/Ethereum/Entity';
import { TableCard, TableSearch } from '@/pages/ethereum/validators/components';

interface MissedRow {
  entity: string;
  missed: number;
  /** Share of attestations due that were made; null when nothing was due */
  online: number | null;
}

export interface MissedAttestationsTableProps {
  /** Missed attestations per entity over the epochs */
  missedByEntity: Map<string, number>;
  /** Attestations due per entity over the same epochs */
  dueByEntity: Map<string, number>;
}

/**
 * Entities that missed attestations over the epochs, most missed first.
 */
export function MissedAttestationsTable({ missedByEntity, dueByEntity }: MissedAttestationsTableProps): JSX.Element {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  // Memoised: DataTable returns to page 1 whenever its data array changes
  const rows = useMemo<MissedRow[]>(() => {
    const query = search.trim().toLowerCase();
    return [...missedByEntity.entries()]
      .filter(([entity]) => entity.toLowerCase().includes(query))
      .map(([entity, missed]) => {
        const due = dueByEntity.get(entity) ?? 0;
        // Liveness and the validator counts label unmapped validators "unknown" differently, so no rate for it
        const online = due && entity !== 'unknown' ? Math.max(0, 1 - missed / due) : null;
        return { entity, missed, online };
      })
      .sort((a, b) => b.missed - a.missed);
  }, [missedByEntity, dueByEntity, search]);

  const columns: DataTableColumn<MissedRow>[] = [
    {
      id: 'entity',
      header: 'Entity',
      accessorKey: 'entity',
      cell: ({ row }) => <Entity entity={row.original.entity} />,
      meta: { cellClassName: 'text-foreground' },
    },
    {
      id: 'missed',
      header: 'Missed',
      accessorKey: 'missed',
      cell: ({ row }) => row.original.missed.toLocaleString(),
      meta: { cellClassName: 'text-foreground tabular-nums' },
    },
    {
      id: 'online',
      header: 'Online',
      accessorFn: r => r.online ?? -1,
      cell: ({ row }) => {
        const { online } = row.original;
        if (online === null) return <span className="text-muted">-</span>;
        return (
          <span className={clsx(online < 2 / 3 ? 'text-danger' : online < 0.95 ? 'text-warning' : 'text-foreground')}>
            {(online * 100).toFixed(2)}%
          </span>
        );
      },
      meta: { cellClassName: 'tabular-nums' },
    },
  ];

  return (
    <TableCard
      title="Missed attestations"
      filters={<TableSearch value={search} onChange={setSearch} placeholder="Search entities" />}
    >
      <DataTable
        data={rows}
        columns={columns}
        pageSize={10}
        hideGlobalFilter
        hideColumnVisibility
        getRowId={r => r.entity}
        onRowClick={r => navigate({ to: '/ethereum/entities/$entity', params: { entity: r.entity } })}
        emptyMessage="No missed attestations"
      />
    </TableCard>
  );
}
