import clsx from 'clsx';
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
  /** Width of the label column */
  labelClassName?: string;
}

/**
 * Ranked rows with a share bar, under labelled Share and count columns.
 */
export function ShareTable({ rows, labelHeader, countHeader, labelClassName = 'w-40' }: ShareTableProps): JSX.Element {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-3 text-xs/5 text-muted">
        <span className={clsx(labelClassName, 'min-w-0 truncate')}>{labelHeader}</span>
        <span className="min-w-12 flex-1" />
        <span className="w-14 shrink-0 text-right">Share</span>
        <span className="w-16 shrink-0 text-right">{countHeader}</span>
      </div>
      {rows.map(row => (
        <div key={row.key} className="flex items-center gap-3">
          {/* The label gives way before the bar on narrow screens, wrapping rather than cutting off */}
          <span className={clsx(labelClassName, 'min-w-0 wrap-break-word')}>{row.label}</span>
          <span className="min-w-12 flex-1">
            <ShareBar share={row.share} color={row.color} />
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
