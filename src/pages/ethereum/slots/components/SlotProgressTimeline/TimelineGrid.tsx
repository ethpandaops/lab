import type { JSX } from 'react';
import clsx from 'clsx';

interface TimelineGridProps {
  labelWidth: number;
}

/**
 * Background grid lines showing time intervals and attestation deadline.
 */
export function TimelineGrid({ labelWidth }: TimelineGridProps): JSX.Element {
  return (
    <div className="pointer-events-none absolute inset-0 right-20" style={{ left: labelWidth }}>
      {[0, 2, 4, 6, 8, 10, 12].map(sec => (
        <div
          key={sec}
          className={clsx('absolute top-0 h-full border-l', sec === 4 ? 'border-success-50' : 'border-border-50')}
          style={{ left: `${(sec / 12) * 100}%` }}
        />
      ))}
      {/* Attestation deadline highlight */}
      <div className="absolute top-0 left-0 h-full w-1/3 bg-success-5" />
    </div>
  );
}
