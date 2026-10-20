import type { JSX } from 'react';
import clsx from 'clsx';
import { formatSlot } from '@/utils';
import { HELD_TO_FINALITY_MS, type StallEpisode, formatDurationMs } from '../../fast-confirmation.utils';

export interface ScarListProps {
  episodes: StallEpisode[];
  selectedEpoch: number | null;
  onSelect: (epoch: number) => void;
}

const MAX_ROWS = 14;

/**
 * The episodes where the node confirmed blocks late, worst first. Selecting one highlights
 * its epoch in the block field.
 */
export function ScarList({ episodes, selectedEpoch, onSelect }: ScarListProps): JSX.Element {
  const worst = [...episodes].sort((a, b) => b.worstMs - a.worstMs).slice(0, MAX_ROWS);

  if (!worst.length) {
    return <p className="text-sm text-muted">No late confirmations yet.</p>;
  }

  return (
    <ol className="flex flex-col divide-y divide-border">
      {worst.map(e => {
        const epoch = Math.floor(e.startSlot / 32);
        const held = e.worstMs >= HELD_TO_FINALITY_MS;
        return (
          <li key={`${e.node}-${e.startSlot}`}>
            <button
              type="button"
              onClick={() => onSelect(epoch)}
              className={clsx(
                'grid w-full grid-cols-[7.5rem_1fr_auto] items-baseline gap-3 px-2 py-2 text-left text-sm transition-colors hover:bg-primary/5',
                selectedEpoch === epoch && 'bg-primary/10'
              )}
            >
              <span className="text-muted tabular-nums">
                {new Date(e.startDateTime * 1000).toISOString().slice(5, 16).replace('T', ' ')}
              </span>
              <span className="text-foreground">
                {e.blocks === 1
                  ? `Slot ${formatSlot(e.startSlot)}`
                  : `${e.blocks} blocks from slot ${formatSlot(e.startSlot)}`}
                {held && <span className="ml-2 text-xs text-danger">held until finality</span>}
              </span>
              <span className={clsx('font-semibold tabular-nums', held ? 'text-danger' : 'text-warning')}>
                {formatDurationMs(e.worstMs)}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
