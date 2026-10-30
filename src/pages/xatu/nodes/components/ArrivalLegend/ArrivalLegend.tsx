import type { JSX } from 'react';
import clsx from 'clsx';
import { ARRIVAL_TIER_CLASSES } from '../../constants';
import type { ArrivalTier } from '../../utils/node-stats';

const TIERS: Array<{ tier: ArrivalTier; label: string }> = [
  { tier: 'excellent', label: '<1s' },
  { tier: 'good', label: '1–2s' },
  { tier: 'fair', label: '2–3s' },
  { tier: 'slow', label: '3–4s' },
  { tier: 'poor', label: '4s+' },
];

/**
 * Key for colours that encode arrival time.
 */
export function ArrivalLegend({ className }: { className?: string }): JSX.Element {
  return (
    <div className={clsx('flex flex-wrap items-center gap-x-3 gap-y-1 text-xs/5 text-muted', className)}>
      {TIERS.map(({ tier, label }) => (
        <span key={tier} className="flex items-center gap-1.5">
          <span className={clsx('size-2 rounded-full', ARRIVAL_TIER_CLASSES[tier])} />
          {label}
        </span>
      ))}
    </div>
  );
}
