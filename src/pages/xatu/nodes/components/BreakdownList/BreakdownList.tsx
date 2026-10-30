import type { JSX, ReactNode } from 'react';
import { Card } from '@/components/Layout/Card';

export interface BreakdownItem {
  key: string;
  label: ReactNode;
  /** Shown before the label, e.g. a client logo or flag */
  icon?: ReactNode;
  count: number;
  /** Share bar colour; neutral when omitted */
  color?: string;
  /** Trailing secondary value, e.g. a median arrival */
  detail?: ReactNode;
}

export interface BreakdownListProps {
  title: string;
  subtitle?: string;
  items: BreakdownItem[];
  /** Rows shown before the rest are folded into "Other" */
  limit?: number;
  /** Header of the trailing detail column */
  detailLabel?: string;
}

/**
 * Ranked counts with share bars, largest first; rows past `limit` fold into one "Other" row.
 */
export function BreakdownList({ title, subtitle, items, limit = 8, detailLabel }: BreakdownListProps): JSX.Element {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const sorted = [...items].sort((a, b) => b.count - a.count);
  const shown = sorted.slice(0, limit);
  const rest = sorted.slice(limit);
  if (rest.length > 0) {
    shown.push({
      key: '__other',
      label: <span className="text-muted">{`${rest.length} others`}</span>,
      count: rest.reduce((sum, item) => sum + item.count, 0),
    });
  }

  return (
    <Card title={title} subtitle={subtitle}>
      <div className="mb-2 flex gap-3 text-xs/5 font-medium text-muted">
        <span className="flex-1" />
        <span className="w-10 text-right">Nodes</span>
        {detailLabel && <span className="w-16 text-right">{detailLabel}</span>}
      </div>
      <ul className="flex flex-col gap-2.5">
        {shown.map(item => (
          <li key={item.key}>
            <div className="flex items-center gap-3">
              {item.icon && <span className="flex w-5 shrink-0 justify-center">{item.icon}</span>}
              <span className="min-w-0 flex-1 truncate text-sm/6 text-foreground">{item.label}</span>
              <span className="w-10 shrink-0 text-right text-sm/6 font-medium text-foreground tabular-nums">
                {item.count}
              </span>
              {detailLabel && (
                <span className="w-16 shrink-0 text-right text-xs/6 text-muted tabular-nums">{item.detail ?? '–'}</span>
              )}
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-muted"
                style={{
                  width: `${total > 0 ? (item.count / total) * 100 : 0}%`,
                  ...(item.color ? { backgroundColor: item.color } : {}),
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
