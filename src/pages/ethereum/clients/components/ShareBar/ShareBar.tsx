import type { JSX } from 'react';

export interface ShareBarProps {
  /** Share, 0-100 */
  share: number;
  color: string;
}

/**
 * A share as a filled bar.
 */
export function ShareBar({ share, color }: ShareBarProps): JSX.Element {
  return (
    <div className="h-2 w-full rounded-full bg-border/50">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.min(100, Math.max(0, share))}%`, backgroundColor: color }}
      />
    </div>
  );
}
