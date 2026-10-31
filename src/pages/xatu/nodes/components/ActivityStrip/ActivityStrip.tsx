import { type JSX, useState } from 'react';
import clsx from 'clsx';
import { Card } from '@/components/Layout/Card';
import { useTimezone } from '@/hooks/useTimezone';
import { rowsByBucket, type NodeHistory } from '../../hooks/useNodeHistory';
import { formatMs } from '../../utils/node-stats';
import { bucketHeading, expectedSlots } from '../../utils/time-buckets';

export interface ActivityStripProps {
  /** The node's block rollups */
  block: NodeHistory;
  rangeLabel: string;
  /** Bucket starts where the node was behind the network */
  behind?: Set<number>;
}

interface Bar {
  start: number;
  /** Before the node's first report in the range */
  before: boolean;
  /** Still in progress, so recent slots may not be ingested yet */
  current: boolean;
  /** Trailing the network by more than a slot: the node was catching up */
  behind: boolean;
  seen: number;
  total: number;
  p50: number | null;
}

/** Share of a bucket's slots a node can miss before the bar is flagged; mainnet misses about 1% of slots */
const GAP_THRESHOLD = 0.9;

function barClass(bar: Bar): string {
  if (bar.before) return 'bg-border/60';
  if (bar.current) return 'bg-muted/45 group-hover:bg-muted';
  if (bar.seen === 0) return 'bg-danger';
  if (bar.behind) return 'bg-warning';
  if (bar.seen / bar.total < GAP_THRESHOLD) return 'bg-warning';
  return 'bg-success/70 group-hover:bg-success';
}

/**
 * Status-page bars, one per hour or day, flagged where the node saw few or no blocks or was catching up.
 */
export function ActivityStrip({ block, rangeLabel, behind }: ActivityStripProps): JSX.Element {
  const { timezone } = useTimezone();
  const [hovered, setHovered] = useState<Bar | null>(null);
  const now = Date.now() / 1000;
  const byBucket = rowsByBucket(block.rows);
  const first = block.rows.length > 0 ? Math.min(...block.rows.map(row => row.start)) : Infinity;
  const bars: Bar[] = block.buckets
    .map((start, index) => ({
      start,
      before: start < first,
      current: index === block.buckets.length - 1,
      behind: behind?.has(start) ?? false,
      seen: byBucket.get(start)?.count ?? 0,
      total: expectedSlots(start, block.granularity, now),
      p50: byBucket.get(start)?.p50 ?? null,
    }))
    // The bucket in progress may not be ingested yet
    .filter((bar, index, all) => bar.total > 0 && !(index === all.length - 1 && bar.seen === 0));
  // The bucket in progress lags ingestion, so leave it out of the share
  const settled = bars.filter(bar => !bar.current);
  const settledSeen = settled.reduce((sum, bar) => sum + bar.seen, 0);
  const settledTotal = settled.reduce((sum, bar) => sum + (bar.before ? 0 : bar.total), 0);

  return (
    <Card
      title="Activity"
      subtitle={rangeLabel}
      actions={
        <span className="text-xs/5 text-muted tabular-nums">
          {hovered ? (
            <>
              {bucketHeading(hovered.start, block.granularity, timezone)} ·{' '}
              {hovered.before ? (
                'not reporting yet'
              ) : (
                <>
                  <span className="text-foreground">
                    {hovered.seen.toLocaleString()}/{hovered.total.toLocaleString()}
                  </span>{' '}
                  slots · p50 <span className="text-foreground">{formatMs(hovered.p50)}</span>
                  {hovered.behind && <span className="text-warning"> · catching up</span>}
                </>
              )}
            </>
          ) : (
            <>
              <span className="text-foreground">
                {settledTotal > 0 ? ((settledSeen / settledTotal) * 100).toFixed(1) : '–'}%
              </span>{' '}
              of slots seen
            </>
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
            <span className={clsx('w-full rounded-xs transition-colors', barClass(bar))} />
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
