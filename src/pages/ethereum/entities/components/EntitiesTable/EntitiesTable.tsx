import { useMemo, useState, type JSX } from 'react';
import { useNavigate } from '@tanstack/react-router';
import clsx from 'clsx';

import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { Entity } from '@/components/Ethereum/Entity';
import { entityLabel } from '@/pages/ethereum/clients/utils/client-share';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { TableCard, TableSearch } from '@/pages/ethereum/validators/components';
import { formatCompact } from '@/pages/ethereum/validators/utils/overview';

import type { EntityStake } from '../../hooks';
import { formatEthChange } from '../../utils/overview';
import {
  compare,
  formatSample,
  formatShare,
  metricById,
  proposals,
  verdictClass,
  type Comparison,
  type MetricId,
  type PerformanceCounts,
} from '../../utils/performance';

type View = 'stake' | 'attestations' | 'proposals';

const VIEW_OPTIONS: Array<{ value: View; label: string }> = [
  { value: 'stake', label: 'Stake' },
  { value: 'attestations', label: 'Attestations' },
  { value: 'proposals', label: 'Proposals' },
];

const VIEW_METRICS: Record<Exclude<View, 'stake'>, MetricId[]> = {
  attestations: ['attested', 'head', 'target', 'inclusion'],
  proposals: ['missed', 'orphaned', 'mev', 'mev-value'],
};

interface EntityRow extends EntityStake {
  share: number;
  counts?: PerformanceCounts;
  comparisons: Partial<Record<MetricId, Comparison>>;
}

export interface EntitiesTableProps {
  /** Card title */
  title?: string;
  entities: EntityStake[];
  totalStakeEth: number;
  /** Counts per entity over the window */
  performance: Map<string, PerformanceCounts>;
  network: PerformanceCounts;
  /** Stake window, e.g. "Oct 5 to Nov 4" */
  stakeWindow: string;
  /** Performance window, e.g. "Oct 5 to Nov 4" */
  performanceWindow: string;
}

const DASH = <span className="text-muted">-</span>;

/** A performance column: the value coloured against the network, faded when the sample is too small to compare */
function metricColumn(id: MetricId): DataTableColumn<EntityRow> {
  const metric = metricById(id);
  return {
    id,
    header: metric.label,
    // Too small to compare sorts last either way
    accessorFn: row => {
      const comparison = row.comparisons[id];
      return comparison?.value === null || comparison?.verdict === 'thin' ? undefined : comparison?.value;
    },
    sortUndefined: 'last',
    sortDescFirst: !metric.lowerIsBetter,
    cell: ({ row }) => {
      const comparison = row.original.comparisons[id];
      if (!comparison || comparison.value === null) return DASH;
      return (
        <span
          className={clsx(
            comparison.verdict === 'thin' ? 'text-muted/70' : (verdictClass(comparison.verdict) ?? 'text-foreground')
          )}
          title={
            comparison.difference === null || comparison.verdict === 'thin'
              ? `Too few ${metric.sample} to compare`
              : `${metric.delta(comparison.difference)} vs network`
          }
        >
          {metric.format(comparison.value)}
        </span>
      );
    },
    meta: { cellClassName: 'tabular-nums whitespace-nowrap' },
  };
}

/**
 * Every entity with stake, searchable and sortable, seen by its stake, its attestations or its proposals. Change and
 * trend cover the stake window; performance columns cover the performance window and read against the network.
 */
export function EntitiesTable({
  title = 'All entities',
  entities,
  totalStakeEth,
  performance,
  network,
  stakeWindow,
  performanceWindow,
}: EntitiesTableProps): JSX.Element {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<View>('stake');

  // Memoised: DataTable returns to page 1 whenever its data array changes
  const rows = useMemo<EntityRow[]>(() => {
    const query = search.trim().toLowerCase();
    const ids = Object.values(VIEW_METRICS).flat();
    return entities
      .filter(e => e.validators > 0 && e.entity.toLowerCase().includes(query))
      .map(e => {
        const counts = performance.get(e.entity);
        return {
          ...e,
          share: totalStakeEth ? e.stakeEth / totalStakeEth : 0,
          counts,
          comparisons: counts ? Object.fromEntries(ids.map(id => [id, compare(metricById(id), counts, network)])) : {},
        };
      });
  }, [entities, totalStakeEth, search, performance, network]);

  const entityColumn: DataTableColumn<EntityRow> = {
    id: 'entity',
    header: 'Entity',
    accessorKey: 'entity',
    cell: ({ row }) => <Entity entity={row.original.entity} label={entityLabel(row.original.entity)} />,
    meta: { cellClassName: 'text-foreground' },
  };

  const stakeColumns: DataTableColumn<EntityRow>[] = [
    entityColumn,
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
      cell: ({ row }) => formatShare(row.original.share),
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
      id: 'compounding',
      header: 'Compounding',
      accessorFn: e => (e.stakeEth ? e.compoundingEth / e.stakeEth : 0),
      cell: ({ getValue }) => `${((getValue() as number) * 100).toFixed(0)}%`,
      meta: { cellClassName: 'tabular-nums' },
    },
  ];

  const sampleColumn = (kind: 'duties' | 'proposals'): DataTableColumn<EntityRow> => ({
    id: kind,
    header: kind === 'duties' ? 'Duties' : 'Proposals',
    accessorFn: row => (row.counts ? (kind === 'duties' ? row.counts.duties : proposals(row.counts)) : undefined),
    sortUndefined: 'last',
    cell: ({ getValue }) => (getValue() === undefined ? DASH : formatSample(getValue() as number)),
    meta: { cellClassName: 'text-foreground tabular-nums' },
  });

  const columns =
    view === 'stake'
      ? stakeColumns
      : [
          entityColumn,
          sampleColumn(view === 'attestations' ? 'duties' : 'proposals'),
          ...VIEW_METRICS[view].map(metricColumn),
        ];

  return (
    <TableCard
      title={title}
      actions={<SegmentedControl options={VIEW_OPTIONS} value={view} onChange={setView} ariaLabel="Table view" />}
      filters={<TableSearch value={search} onChange={setSearch} placeholder="Search entities" />}
      footer={
        <p className="text-xs/5 text-muted">
          {view === 'stake'
            ? `Active effective balance on the latest day; change over ${stakeWindow}.`
            : `Finalized chain, ${performanceWindow}, per ${view === 'attestations' ? 'attestation duty' : 'proposal'}. Green and red values differ from the network by more than chance would give an entity of that size; faded ones rest on too few ${view === 'attestations' ? 'duties' : 'proposals'} to compare and sort last.`}
        </p>
      }
    >
      <DataTable
        // Each view starts from its own default order
        key={view}
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
