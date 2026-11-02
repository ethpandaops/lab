import type { JSX } from 'react';
import { DIVERSITY_THRESHOLDS } from '../../utils/client-versions';

export interface ShareBarProps {
  /** Share, 0-100 */
  share: number;
  color: string;
  /** Mark ⅓, ½ and ⅔ with faint ticks */
  showThresholds?: boolean;
}

/**
 * A share as a filled bar, optionally with faint ticks at ⅓, ½ and ⅔.
 */
export function ShareBar({ share, color, showThresholds = true }: ShareBarProps): JSX.Element {
  return (
    <div className="relative h-2 w-full rounded-full bg-border/50">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.min(100, Math.max(0, share))}%`, backgroundColor: color }}
      />
      {showThresholds &&
        DIVERSITY_THRESHOLDS.map(threshold => (
          <span
            key={threshold.share}
            aria-hidden
            className="absolute -top-px h-2.5 w-px bg-foreground/20"
            style={{ left: `${threshold.share}%` }}
          />
        ))}
    </div>
  );
}
