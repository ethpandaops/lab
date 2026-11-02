import type { JSX, ReactNode } from 'react';
import { ShareBar } from '../ShareBar';

/** One row of a share table */
export interface ShareTableRow {
  key: string;
  label: ReactNode;
  /** Share, 0-100 */
  share: number;
  count: number;
  color: string;
}

export interface ShareTableProps {
  rows: ShareTableRow[];
  /** Header of the label column, e.g. Client or Version */
  labelHeader: string;
  /** Header of the count column, e.g. Blocks or Nodes */
  countHeader: string;
}

/**
 * Ranked rows with a share bar, under labelled Share and count columns.
 */
export function ShareTable({ rows, labelHeader, countHeader }: ShareTableProps): JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3 text-xs/5 text-muted">
        <span className="w-40 shrink-0">{labelHeader}</span>
        <span className="flex-1" />
        <span className="w-14 shrink-0 text-right">Share</span>
        <span className="w-16 shrink-0 text-right">{countHeader}</span>
      </div>
      {rows.map(row => (
        <div key={row.key} className="flex items-center gap-3">
          <span className="w-40 shrink-0 truncate">{row.label}</span>
          <span className="flex-1">
            <ShareBar share={row.share} color={row.color} showThresholds={false} />
          </span>
          <span className="w-14 shrink-0 text-right text-sm/6 font-medium text-foreground tabular-nums">
            {row.share.toFixed(1)}%
          </span>
          <span className="w-16 shrink-0 text-right text-sm/6 text-muted tabular-nums">
            {row.count.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
