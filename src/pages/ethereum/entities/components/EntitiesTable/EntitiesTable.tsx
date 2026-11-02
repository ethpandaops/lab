import { useMemo, useState, type JSX } from 'react';
import { useNavigate } from '@tanstack/react-router';

import { Sparkline } from '@/components/Charts/Sparkline';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { Entity } from '@/components/Ethereum/Entity';
import { TableCard, TableSearch } from '@/pages/ethereum/validators/components';
import { formatCompact } from '@/pages/ethereum/validators/utils/overview';

import type { EntityStake } from '../../hooks';
import { formatEthChange } from '../../utils/overview';

interface EntityRow extends EntityStake {
  share: number;
}

export interface EntitiesTableProps {
  entities: EntityStake[];
  totalStakeEth: number;
}

const DASH = <span className="text-muted">-</span>;

/**
 * Every entity with stake, searchable and sortable; change and trend cover the window.
 */
export function EntitiesTable({ entities, totalStakeEth }: EntitiesTableProps): JSX.Element {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  // Memoised: DataTable returns to page 1 whenever its data array changes
  const rows = useMemo<EntityRow[]>(() => {
    const query = search.trim().toLowerCase();
    return entities
      .filter(e => e.validators > 0 && e.entity.toLowerCase().includes(query))
      .map(e => ({
        ...e,
        share: totalStakeEth ? e.stakeEth / totalStakeEth : 0,
      }));
  }, [entities, totalStakeEth, search]);

  const columns: DataTableColumn<EntityRow>[] = [
    {
      id: 'entity',
      header: 'Entity',
      accessorKey: 'entity',
      cell: ({ row }) => <Entity entity={row.original.entity} />,
      meta: { cellClassName: 'text-foreground' },
    },
    {
      id: 'validators',
      header: 'Validators',
      accessorKey: 'validators',
      cell: ({ row }) => row.original.validators.toLocaleString(),
      meta: { cellClassName: 'text-foreground tabular-nums' },
    },
    {
      id: 'stake',
      header: 'Stake',
      accessorKey: 'stakeEth',
      cell: ({ row }) => `${formatCompact(row.original.stakeEth)} ETH`,
      meta: { cellClassName: 'text-foreground tabular-nums' },
    },
    {
      id: 'share',
      header: 'Share',
      accessorKey: 'share',
      cell: ({ row }) => `${(row.original.share * 100).toFixed(2)}%`,
      meta: { cellClassName: 'tabular-nums' },
    },
    {
      id: 'change',
      header: 'Change',
      accessorKey: 'changeEth',
      cell: ({ row }) => (Math.round(row.original.changeEth) === 0 ? DASH : formatEthChange(row.original.changeEth)),
      meta: { cellClassName: 'tabular-nums' },
    },
    {
      id: 'trend',
      header: 'Trend',
      enableSorting: false,
      cell: ({ row }) => <Sparkline data={row.original.series} width={96} height={20} smooth={false} />,
    },
    {
      id: 'compounding',
      header: 'Compounding',
      accessorFn: e => (e.stakeEth ? e.compoundingEth / e.stakeEth : 0),
      cell: ({ getValue }) => `${((getValue() as number) * 100).toFixed(0)}%`,
      meta: { cellClassName: 'tabular-nums' },
    },
  ];

  return (
    <TableCard
      title="All entities"
      filters={<TableSearch value={search} onChange={setSearch} placeholder="Search entities" />}
    >
      <DataTable
        data={rows}
        columns={columns}
        pageSize={10}
        hideGlobalFilter
        hideColumnVisibility
        getRowId={e => e.entity}
        onRowClick={e => navigate({ to: '/ethereum/entities/$entity', params: { entity: e.entity } })}
        emptyMessage="No entities match this search"
      />
    </TableCard>
  );
}
