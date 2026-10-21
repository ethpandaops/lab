import type { JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { Card } from '@/components/Layout/Card';
import { MiniStat } from '@/components/DataDisplay/MiniStat';
import type { FctDataColumnCompletionBySlot } from '@/api/types.gen';
import {
  COMPLETION_PATHS,
  PATH_COLORS,
  PATH_LABELS,
} from '@/pages/ethereum/data-availability/partial-columns/constants';
import type { CompletionPath } from '@/pages/ethereum/data-availability/partial-columns/IndexPage.types';
import { formatSeconds, formatShare } from '@/pages/ethereum/data-availability/partial-columns/utils/partial-columns';
import type { SlotColumnCompletion } from '../../hooks/useSlotColumnCompletion';

export interface SlotColumnCompletionCardProps {
  data: SlotColumnCompletion;
}

/** Completions of one column per path, in stacking order */
function columnPaths(column: FctDataColumnCompletionBySlot): Record<CompletionPath, number> {
  return {
    FULL_GOSSIP: column.full_gossip_completion_count ?? 0,
    PARTIAL_GOSSIP: column.partial_gossip_completion_count ?? 0,
    EL: column.el_completion_count ?? 0,
    RECONSTRUCTION: column.reconstruction_completion_count ?? 0,
    UNKNOWN: column.unknown_completion_count ?? 0,
  };
}

/**
 * How sentry nodes completed the block's data columns: totals by path, cells from the execution layer, timings, and
 * one tile per column split by the paths its nodes used.
 */
export function SlotColumnCompletionCard({ data }: SlotColumnCompletionCardProps): JSX.Element | null {
  const { block, columns, header, isLoading } = data;
  if (isLoading || !block) return null;

  const completions = block.completion_count ?? 0;
  const pathTotals: Array<{ path: CompletionPath; count: number }> = [
    { path: 'FULL_GOSSIP', count: block.full_gossip_completion_count ?? 0 },
    { path: 'PARTIAL_GOSSIP', count: block.partial_gossip_completion_count ?? 0 },
    { path: 'EL', count: block.el_completion_count ?? 0 },
    { path: 'RECONSTRUCTION', count: block.reconstruction_completion_count ?? 0 },
    { path: 'UNKNOWN', count: block.unknown_completion_count ?? 0 },
  ];
  const present = pathTotals.filter(entry => entry.count > 0);

  return (
    <Card
      title="Column Completion"
      subtitle={`${block.node_count ?? 0} sentry nodes`}
      actions={
        <Link to="/ethereum/data-availability/partial-columns" className="text-sm text-primary hover:underline">
          Partial columns
        </Link>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <MiniStat
            label="Completions"
            value={completions.toLocaleString()}
            secondaryText={`${block.column_count ?? 0} columns`}
          />
          <MiniStat
            label="From partials"
            value={formatShare(block.partial_gossip_completion_count ?? 0, completions)}
            secondaryText="Partial gossip"
          />
          <MiniStat
            label="Cells from EL"
            value={formatShare(block.cells_from_el ?? 0, block.cells_total ?? 0)}
            secondaryText="getBlobs"
          />
          <MiniStat
            label="Median completion"
            value={formatSeconds(block.p50_completion_slot_start_diff)}
            secondaryText={`p90 ${formatSeconds(block.p90_completion_slot_start_diff)}`}
          />
          <MiniStat
            label="Median node done"
            value={formatSeconds(block.p50_node_last_completion_slot_start_diff)}
            secondaryText="Last column"
          />
          <MiniStat
            label="Header first seen"
            value={formatSeconds(header?.seen_slot_start_diff)}
            secondaryText={header ? `p50 ${formatSeconds(header.p50_node_seen_slot_start_diff)}` : 'No header push'}
          />
        </div>

        {columns.length > 0 && (
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-16 gap-1">
              {columns.map(column => {
                const counts = columnPaths(column);
                const total = COMPLETION_PATHS.reduce((sum, p) => sum + counts[p], 0);
                const title = [
                  `Column ${column.column_index}`,
                  ...COMPLETION_PATHS.filter(p => counts[p] > 0).map(p => `${PATH_LABELS[p]}: ${counts[p]}`),
                  `p50 ${formatSeconds(column.p50_completion_slot_start_diff)}`,
                ].join('\n');
                return (
                  <span
                    key={column.column_index}
                    title={title}
                    className="flex h-4 overflow-hidden rounded-xs bg-border/50"
                  >
                    {total > 0 &&
                      COMPLETION_PATHS.filter(p => counts[p] > 0).map(p => (
                        <span
                          key={p}
                          className="block h-full"
                          style={{ width: `${(counts[p] / total) * 100}%`, backgroundColor: PATH_COLORS[p] }}
                        />
                      ))}
                  </span>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
              <span>Completions per column by path:</span>
              {present.map(entry => (
                <span key={entry.path} className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-xs" style={{ backgroundColor: PATH_COLORS[entry.path] }} />
                  {PATH_LABELS[entry.path]} ({formatShare(entry.count, completions)})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
