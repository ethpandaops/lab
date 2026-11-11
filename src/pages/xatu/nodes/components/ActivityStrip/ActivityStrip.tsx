import { type JSX, useState } from 'react';
import clsx from 'clsx';
import { Card } from '@/components/Layout/Card';
import { useTimezone } from '@/hooks/useTimezone';
import { rowsByBucket, type NodeHistory } from '../../hooks/useNodeHistory';
import { formatMs } from '../../utils/node-stats';
import { SLOTS_PER_BUCKET } from '../../constants';
import { bucketHeading } from '../../utils/time-buckets';

export interface ActivityStripProps {
  /** The node's block rollups */
  block: NodeHistory;
  /** Slots with a block per bucket start; a bucket without a count falls back to every slot */
  blockSlots: Map<number, number>;
}

interface Bar {
  start: number;
  /** Before the node's first report in the range */
  before: boolean;
  seen: number;
  /** Slots with a block */
  total: number;
  /** Whether `total` comes from the proposal table rather than every slot */
  counted: boolean;
  p50: number | null;
}

/**
 * One bar per hour, day or week, filled to the share of the bucket's blocks the node saw.
 */
export function ActivityStrip({ block, blockSlots }: ActivityStripProps): JSX.Element {
  const { timezone } = useTimezone();
  const [hovered, setHovered] = useState<Bar | null>(null);
  const byBucket = rowsByBucket(block.rows);
  const first = block.rows.length > 0 ? Math.min(...block.rows.map(row => row.start)) : Infinity;
  const bars: Bar[] = block.buckets
    .map(start => ({
      start,
      before: start < first,
      seen: byBucket.get(start)?.count ?? 0,
      total: blockSlots.get(start) ?? SLOTS_PER_BUCKET[block.granularity],
      counted: blockSlots.has(start),
      p50: byBucket.get(start)?.p50 ?? null,
    }))
    // The newest bucket may not be ingested yet
    .filter((bar, index, all) => bar.total > 0 && !(index === all.length - 1 && bar.seen === 0));
  const settled = bars.filter(bar => bar.counted);
  const settledSeen = settled.reduce((sum, bar) => sum + bar.seen, 0);
  const settledTotal = settled.reduce((sum, bar) => sum + (bar.before ? 0 : bar.total), 0);

  return (
    <Card
      title="Activity"
      actions={
        <span className="flex flex-wrap justify-end gap-x-3 text-xs/5 text-muted tabular-nums">
          {hovered ? (
            <>
              <span>{bucketHeading(hovered.start, block.granularity, timezone)}</span>
              {hovered.before ? (
                <span>not reporting yet</span>
              ) : (
                <>
                  <span>
                    <span className="text-foreground">{hovered.seen.toLocaleString()}</span> of{' '}
                    {hovered.total.toLocaleString()} {hovered.counted ? 'blocks' : 'slots'}
                  </span>
                  <span>
                    p50 <span className="text-foreground">{formatMs(hovered.p50)}</span>
                  </span>
                </>
              )}
            </>
          ) : (
            <span>
              <span className="text-foreground">
                {settledTotal > 0 ? ((settledSeen / settledTotal) * 100).toFixed(1) : '–'}%
              </span>{' '}
              of blocks seen
            </span>
          )}
        </span>
      }
    >
      <div
        className={clsx('flex h-9 items-stretch', bars.length > 120 ? 'gap-px' : 'gap-0.5')}
        onMouseLeave={() => setHovered(null)}
      >
        {bars.map(bar => (
          <div
            key={bar.start}
            className="group flex flex-1 cursor-default items-stretch"
            onMouseEnter={() => setHovered(bar)}
          >
            <span
              className={clsx(
                'flex w-full items-end overflow-hidden rounded-xs',
                bar.before ? 'bg-border-40' : 'bg-border-60'
              )}
            >
              {!bar.before && (
                <span
                  className="w-full bg-muted transition-colors group-hover:bg-foreground"
                  style={{ height: `${Math.min(100, (bar.seen / bar.total) * 100)}%` }}
                />
              )}
            </span>
          </div>
        ))}
      </div>
      {bars.length > 0 && (
        <div className="mt-2 flex justify-between text-xs/5 text-muted tabular-nums">
          <span>{bucketHeading(bars[0].start, block.granularity, timezone)}</span>
          <span>{bucketHeading(bars[bars.length - 1].start, block.granularity, timezone)}</span>
        </div>
      )}
    </Card>
  );
}
