import { useMemo, useState, type JSX } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { ChevronRightIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';

import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { Entity } from '@/components/Ethereum/Entity';
import { entityLabel } from '@/pages/ethereum/clients/utils/client-share';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { TableCard, TableSearch } from '@/pages/ethereum/validators/components';
import { formatCompact } from '@/pages/ethereum/validators/utils/overview';

import type { EntityStake } from '../../hooks';
import { groupName } from '../../utils/groups';
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
  /** Members of each group row, largest stake first; a group row with members expands to its largest ones */
  members?: Map<string, EntityStake[]>;
  /** Counts per member entity, for the expanded rows */
  memberPerformance?: Map<string, PerformanceCounts>;
}

/** Operators listed when a group row expands */
const EXPANDED_MEMBERS = 5;

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
  members,
  memberPerformance,
}: EntitiesTableProps): JSX.Element {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<View>('stake');
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const query = search.trim().toLowerCase();
  // Members a search matches, so searching for an operator finds its group
  const matching = (group: string): EntityStake[] =>
    (members?.get(group) ?? []).filter(m => m.validators > 0 && m.entity.toLowerCase().includes(query));

  // Memoised: DataTable returns to page 1 whenever its data array changes
  const rows = useMemo<EntityRow[]>(() => {
    const ids = Object.values(VIEW_METRICS).flat();
    return entities
      .filter(
        e =>
          e.validators > 0 &&
          (entityLabel(e.entity).toLowerCase().includes(query) ||
            (members?.get(e.entity) ?? []).some(m => m.validators > 0 && m.entity.toLowerCase().includes(query)))
      )
      .map(e => {
        const counts = performance.get(e.entity);
        return {
          ...e,
          share: totalStakeEth ? e.stakeEth / totalStakeEth : 0,
          counts,
          comparisons: counts ? Object.fromEntries(ids.map(id => [id, compare(metricById(id), counts, network)])) : {},
        };
      });
  }, [entities, totalStakeEth, query, members, performance, network]);

  const entityColumn: DataTableColumn<EntityRow> = {
    id: 'entity',
    header: 'Entity',
    accessorKey: 'entity',
    cell: ({ row }) => {
      const entity = row.original.entity;
      const expandable = (members?.get(entity)?.length ?? 0) > 0;
      if (!expandable) return <Entity entity={entity} label={entityLabel(entity)} />;
      const isOpen = open.has(entity) || query.length > 0;
      return (
        <span className="inline-flex items-center gap-1">
          <button
            type="button"
            onClick={event => {
              event.stopPropagation();
              setOpen(current => {
                const next = new Set(current);
                if (next.has(entity)) next.delete(entity);
                else next.add(entity);
                return next;
              });
            }}
            aria-expanded={isOpen}
            aria-controls={`members-${entity}`}
            aria-label={`${isOpen ? 'Hide' : 'Show'} ${entityLabel(entity)} operators`}
            className="-ml-1 rounded-xs p-0.5 text-muted hover:bg-primary/10 hover:text-foreground"
          >
            <ChevronRightIcon className={clsx('size-4 transition-transform', isOpen && 'rotate-90')} />
          </button>
          <Entity entity={entity} label={entityLabel(entity)} />
        </span>
      );
    },
    meta: { cellClassName: 'text-foreground' },
  };

  /** The group's largest operators (or those the search matches), with the view's measure, and a link to all */
  const renderMembers = (row: EntityRow): JSX.Element | null => {
    const all = members?.get(row.entity);
    if (!all?.length || !(open.has(row.entity) || query.length > 0)) return null;
    const active = all.filter(m => m.validators > 0);
    const shown = (query ? matching(row.entity) : active).slice(0, EXPANDED_MEMBERS);
    const metric = view === 'stake' ? null : metricById(view === 'attestations' ? 'attested' : 'missed');
    return (
      <div id={`members-${row.entity}`} className="flex flex-col gap-2 pl-5">
        <table className="w-full max-w-2xl text-xs/5">
          <thead>
            <tr className="text-left text-muted">
              <th className="pb-1 font-normal">Operator</th>
              <th className="pb-1 text-right font-normal">
                {metric ? (view === 'attestations' ? 'Duties' : 'Proposals') : 'Validators'}
              </th>
              <th className="pb-1 text-right font-normal">{metric ? metric.label : 'Stake'}</th>
              <th className="pb-1 text-right font-normal">
                {metric ? 'vs network' : `Share of ${groupName(row.entity) ?? entityLabel(row.entity)}`}
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map(m => {
              const counts = memberPerformance?.get(m.entity);
              const comparison = metric && counts ? compare(metric, counts, network) : null;
              return (
                <tr key={m.entity}>
                  <td className="max-w-48 truncate py-0.5 pr-3 text-foreground">
                    <Entity entity={m.entity} />
                  </td>
                  <td className="py-0.5 text-right tabular-nums">
                    {metric
                      ? counts
                        ? formatSample(view === 'attestations' ? counts.duties : proposals(counts))
                        : '-'
                      : m.validators.toLocaleString()}
                  </td>
                  <td
                    className={clsx(
                      'py-0.5 text-right tabular-nums',
                      comparison?.verdict === 'thin' ? 'text-muted/70' : 'text-foreground'
                    )}
                  >
                    {metric
                      ? comparison?.value == null
                        ? '-'
                        : metric.format(comparison.value)
                      : `${formatCompact(m.stakeEth)} ETH`}
                  </td>
                  <td
                    className={clsx(
                      'py-0.5 text-right tabular-nums',
                      comparison ? (verdictClass(comparison.verdict) ?? 'text-muted') : 'text-muted'
                    )}
                  >
                    {metric
                      ? !comparison || comparison.difference === null
                        ? '-'
                        : comparison.verdict === 'thin'
                          ? 'Too few'
                          : metric.delta(comparison.difference)
                      : formatShare(row.stakeEth ? m.stakeEth / row.stakeEth : 0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <Link
          to="/ethereum/entities/$entity"
          params={{ entity: row.entity }}
          className="self-start text-xs/5 text-primary hover:underline"
        >
          All {active.length.toLocaleString()} operators
        </Link>
      </div>
    );
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
        renderExpandedRow={renderMembers}
      />
    </TableCard>
  );
}
