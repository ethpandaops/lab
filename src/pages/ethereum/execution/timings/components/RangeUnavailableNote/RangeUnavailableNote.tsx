import type { JSX } from 'react';

/**
 * Empty-state note for sections whose backing data is only aggregated
 * at hourly or finer granularity and is too heavy to fetch for long ranges
 */
export function RangeUnavailableNote(): JSX.Element {
  return (
    <div className="flex h-32 items-center justify-center rounded-sm border border-dashed border-border bg-surface/30 text-sm text-muted">
      Not available for ranges beyond 31 days
    </div>
  );
}
