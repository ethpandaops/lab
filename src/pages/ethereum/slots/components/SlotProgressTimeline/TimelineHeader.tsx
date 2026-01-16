import type { JSX } from 'react';

interface TimelineHeaderProps {
  labelWidth: number;
}

/**
 * Header row showing time markers (0s to 12s).
 */
export function TimelineHeader({ labelWidth }: TimelineHeaderProps): JSX.Element {
  return (
    <div className="mb-2 flex">
      <div style={{ width: labelWidth }} className="shrink-0" />
      <div className="flex-1">
        <div className="flex justify-between text-xs text-muted">
          <span>0s</span>
          <span>2s</span>
          <span>4s</span>
          <span>6s</span>
          <span>8s</span>
          <span>10s</span>
          <span>12s</span>
        </div>
      </div>
      <div className="w-20 shrink-0" />
    </div>
  );
}
