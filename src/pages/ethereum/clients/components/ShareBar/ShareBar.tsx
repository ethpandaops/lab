import type { JSX } from 'react';
import clsx from 'clsx';
import { DIVERSITY_THRESHOLDS } from '../../utils/client-versions';

export interface ShareBarProps {
  /** Share, 0-100 */
  share: number;
  color: string;
  /** Draw the 33%, 50% and 67% diversity thresholds */
  showThresholds?: boolean;
}

/**
 * A share as a filled bar, with the client diversity thresholds marked.
 */
export function ShareBar({ share, color, showThresholds = true }: ShareBarProps): JSX.Element {
  return (
    <div className={clsx('relative w-full', showThresholds && 'pb-3.5')}>
      <div className="relative h-2 w-full rounded-full bg-border/50">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, Math.max(0, share))}%`, backgroundColor: color }}
        />
        {showThresholds &&
          DIVERSITY_THRESHOLDS.map(threshold => (
            <span
              key={threshold.label}
              className="absolute -top-0.5 h-3 w-px bg-foreground/40"
              style={{ left: `${threshold.share}%` }}
            />
          ))}
      </div>
      {showThresholds &&
        DIVERSITY_THRESHOLDS.map(threshold => (
          <span
            key={threshold.label}
            className="absolute bottom-0 -translate-x-1/2 text-[10px]/3 text-muted"
            style={{ left: `${threshold.share}%` }}
          >
            {threshold.label}
          </span>
        ))}
    </div>
  );
}
