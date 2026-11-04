import type { JSX } from 'react';

import { Entity } from '@/components/Ethereum/Entity';
import { Card } from '@/components/Layout/Card';

import type { EntityStake } from '../../hooks';
import { formatEthChange } from '../../utils/overview';

/** Entities shown on each side */
const PER_SIDE = 8;

export interface StakeMoversProps {
  entities: EntityStake[];
  /** The stake window, e.g. "Oct 5 '26 to Nov 4 '26" */
  window: string;
}

/**
 * Entities whose stake grew and shrank the most over the window, side by side on one scale.
 */
export function StakeMovers({ entities, window }: StakeMoversProps): JSX.Element {
  const named = entities.filter(e => e.entity !== 'unknown');
  const gained = named
    .filter(e => Math.round(e.changeEth) > 0)
    .sort((a, b) => b.changeEth - a.changeEth)
    .slice(0, PER_SIDE);
  const lost = named
    .filter(e => Math.round(e.changeEth) < 0)
    .sort((a, b) => a.changeEth - b.changeEth)
    .slice(0, PER_SIDE);
  const scale = Math.max(...[...gained, ...lost].map(e => Math.abs(e.changeEth)), 1);

  const list = (rows: EntityStake[], title: string, barClass: string): JSX.Element => (
    <div className="min-w-0">
      <h3 className="mb-2 text-xs/5 font-medium text-muted">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">None in this window.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {rows.map(e => (
            <li key={e.entity} className="flex items-center gap-3 text-sm/6">
              <Entity entity={e.entity} className="w-36 shrink-0 truncate text-foreground sm:w-44" />
              <span className="relative h-2.5 min-w-8 flex-1">
                <span
                  className={`absolute inset-y-0 left-0 rounded-xs ${barClass}`}
                  style={{ width: `${(Math.abs(e.changeEth) / scale) * 100}%` }}
                />
              </span>
              <span className="w-24 shrink-0 text-right font-medium text-foreground tabular-nums">
                {formatEthChange(e.changeEth)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <Card title="Biggest movers" subtitle={`Change in active effective balance, ${window}`}>
      <div className="grid gap-6 lg:grid-cols-2">
        {list(gained, 'Gained', 'bg-primary/70')}
        {list(lost, 'Lost', 'bg-muted/50')}
      </div>
    </Card>
  );
}
