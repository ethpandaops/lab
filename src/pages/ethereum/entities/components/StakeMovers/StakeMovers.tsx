import type { JSX } from 'react';

import { Entity } from '@/components/Ethereum/Entity';
import { Card } from '@/components/Layout/Card';

import type { EntityStake } from '../../hooks';
import { formatEthChange } from '../../utils/overview';

/** Entities shown on each side */
const PER_SIDE = 8;

export interface StakeMoversProps {
  entities: EntityStake[];
}

/**
 * Entities whose stake grew or shrank the most over the window, on a bar that diverges from zero.
 */
export function StakeMovers({ entities }: StakeMoversProps): JSX.Element {
  const named = entities.filter(e => e.entity !== 'unknown');
  const gained = named
    .filter(e => Math.round(e.changeEth) > 0)
    .sort((a, b) => b.changeEth - a.changeEth)
    .slice(0, PER_SIDE);
  const lost = named
    .filter(e => Math.round(e.changeEth) < 0)
    .sort((a, b) => a.changeEth - b.changeEth)
    .slice(0, PER_SIDE)
    .reverse();
  const rows = [...gained, ...lost];
  const scale = Math.max(...rows.map(e => Math.abs(e.changeEth)), 1);

  return (
    <Card title="Biggest movers">
      {rows.length === 0 ? (
        <p className="text-sm text-muted">No entity changed stake in this window.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {rows.map(e => {
            const width = `${(Math.abs(e.changeEth) / scale) * 50}%`;
            return (
              <li key={e.entity} className="flex items-center gap-3 text-sm/6">
                <Entity entity={e.entity} className="w-44 shrink-0 truncate text-foreground" />
                <span className="relative h-2.5 flex-1">
                  <span className="absolute inset-y-[-3px] left-1/2 w-px bg-border" />
                  <span
                    className="absolute inset-y-0 rounded-xs bg-primary/70"
                    style={e.changeEth > 0 ? { left: '50%', width } : { right: '50%', width }}
                  />
                </span>
                <span className="w-24 shrink-0 text-right font-medium text-foreground tabular-nums">
                  {formatEthChange(e.changeEth)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
