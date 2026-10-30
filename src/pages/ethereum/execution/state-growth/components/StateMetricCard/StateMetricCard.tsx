import { type JSX, useMemo } from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/solid';
import clsx from 'clsx';
import { Card } from '@/components/Layout/Card';
import { getDataVizColors } from '@/utils/dataVizColors';

const { DATA_COLORS } = getDataVizColors();

interface StateMetricCardProps {
  label: string;
  currentBytes: number;
  deltaBytes: number;
  deltaPercent: number;
  count?: number;
  countDelta?: number;
  sparklineData?: number[];
  color?: 'cyan' | 'purple' | 'amber' | 'default';
  isHero?: boolean;
}

function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1000) {
    return `${(gb / 1024).toFixed(2)} TB`;
  }
  if (gb >= 1) {
    return `${gb.toFixed(2)} GB`;
  }
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}

function formatDeltaBytes(bytes: number): string {
  const absBytes = Math.abs(bytes);
  const sign = bytes >= 0 ? '+' : '-';

  if (absBytes >= 1024 * 1024 * 1024) {
    return `${sign}${(absBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
  if (absBytes >= 1024 * 1024) {
    return `${sign}${(absBytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  if (absBytes >= 1024) {
    return `${sign}${(absBytes / 1024).toFixed(2)} KB`;
  }
  return `${sign}${absBytes.toFixed(0)} B`;
}

function MiniSparkline({ data, color }: { data: number[]; color: string }): JSX.Element {
  const { path, width, height } = useMemo(() => {
    if (data.length < 2) return { path: '', width: 80, height: 32 };

    const w = 80;
    const h = 32;
    const padding = 2;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((value, index) => {
      const x = padding + (index / (data.length - 1)) * (w - padding * 2);
      const y = h - padding - ((value - min) / range) * (h - padding * 2);
      return `${x},${y}`;
    });

    return {
      path: `M${points.join(' L')}`,
      width: w,
      height: h,
    };
  }, [data]);

  if (data.length < 2) return <div className="h-8 w-20" />;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const colorMap = {
  cyan: {
    sparkline: DATA_COLORS.cyan,
    bg: 'bg-data-cyan/10',
    text: 'text-data-cyan',
  },
  purple: {
    sparkline: DATA_COLORS.purple,
    bg: 'bg-data-purple/10',
    text: 'text-data-purple',
  },
  amber: {
    sparkline: DATA_COLORS.amber,
    bg: 'bg-warning/10',
    text: 'text-warning',
  },
  default: {
    sparkline: DATA_COLORS.blue,
    bg: 'bg-data-blue/10',
    text: 'text-data-blue',
  },
};

export function StateMetricCard({
  label,
  currentBytes,
  deltaBytes,
  deltaPercent,
  count,
  countDelta,
  sparklineData,
  color = 'default',
  isHero = false,
}: StateMetricCardProps): JSX.Element {
  const isPositive = deltaBytes >= 0;
  const Icon = isPositive ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
  const colors = colorMap[color];

  return (
    <Card className={clsx('relative overflow-hidden p-4', isHero && 'col-span-full sm:col-span-1')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-muted">{label}</p>

          <p className={clsx('mt-1 font-bold text-foreground tabular-nums', isHero ? 'text-3xl' : 'text-2xl')}>
            {formatBytes(currentBytes)}
          </p>

          {count !== undefined && (
            <p className="mt-0.5 text-sm text-muted tabular-nums">
              {count.toLocaleString()}
              {countDelta !== undefined && (
                <span className={clsx('ml-1 text-xs', isPositive ? 'text-warning' : 'text-success')}>
                  ({countDelta >= 0 ? '+' : ''}
                  {countDelta.toLocaleString()})
                </span>
              )}
            </p>
          )}

          <div className="mt-2 flex items-center gap-2">
            <div
              className={clsx(
                'flex items-center gap-1 rounded-sm px-1.5 py-0.5',
                isPositive ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
              )}
            >
              <Icon className="size-3" />
              <span className="text-xs font-medium tabular-nums">{formatDeltaBytes(deltaBytes)}</span>
            </div>
            <span className={clsx('text-xs font-medium tabular-nums', isPositive ? 'text-warning' : 'text-success')}>
              {deltaPercent >= 0 ? '+' : ''}
              {deltaPercent.toFixed(3)}%
            </span>
          </div>
        </div>

        {sparklineData && sparklineData.length > 1 && (
          <div className={clsx('shrink-0 rounded-sm p-2', colors.bg)}>
            <MiniSparkline data={sparklineData} color={colors.sparkline} />
          </div>
        )}
      </div>
    </Card>
  );
}
