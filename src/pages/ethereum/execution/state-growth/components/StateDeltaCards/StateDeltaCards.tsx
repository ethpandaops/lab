import { type JSX, useState } from 'react';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { Card } from '@/components/Layout/Card';
import { useStateDelta, type DeltaTimeframe } from '../../hooks/useStateDelta';

interface NormalizedDataPoint {
  date: Date;
  dateLabel: string;
  total_bytes: number;
  account_trienode_bytes: number;
  storage_trienode_bytes: number;
  contract_code_bytes: number;
  accounts: number;
  storages: number;
  contract_codes: number;
}

interface StateDeltaCardsProps {
  data: NormalizedDataPoint[] | null;
}

const TIMEFRAME_OPTIONS: { value: DeltaTimeframe; label: string }[] = [
  { value: 'daily', label: '24h' },
  { value: 'weekly', label: '7d' },
  { value: 'monthly', label: '30d' },
];

/**
 * Format bytes to human-readable string with appropriate unit
 */
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

/**
 * Format percentage with sign
 */
function formatPercentage(percent: number): string {
  const sign = percent >= 0 ? '+' : '';
  return `${sign}${percent.toFixed(2)}%`;
}

/**
 * Format count delta with sign
 */
function formatCountDelta(count: number): string {
  const sign = count >= 0 ? '+' : '';
  return `${sign}${count.toLocaleString()}`;
}

interface DeltaCardProps {
  label: string;
  bytesDelta: number;
  bytesPercentChange: number;
  countDelta?: number;
  countPercentChange?: number;
}

function DeltaCard({
  label,
  bytesDelta,
  bytesPercentChange,
  countDelta,
  countPercentChange,
}: DeltaCardProps): JSX.Element {
  const isPositive = bytesDelta >= 0;
  const Icon = isPositive ? ArrowTrendingUpIcon : ArrowTrendingDownIcon;
  const hasCount = countDelta !== undefined && countPercentChange !== undefined;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">{label}</p>
          <p className="mt-1 text-xl font-bold text-foreground">{formatDeltaBytes(bytesDelta)}</p>
          <p className={clsx('mt-0.5 text-xs font-medium', isPositive ? 'text-warning' : 'text-success')}>
            {formatPercentage(bytesPercentChange)}
          </p>
          {hasCount && (
            <div className="mt-2 border-t border-border/50 pt-2">
              <p className="text-sm font-semibold text-foreground">{formatCountDelta(countDelta)}</p>
              <p className={clsx('text-[10px] font-medium', countDelta >= 0 ? 'text-warning' : 'text-success')}>
                {formatPercentage(countPercentChange)} count
              </p>
            </div>
          )}
        </div>
        <div
          className={clsx(
            'shrink-0 rounded-full p-1.5',
            isPositive ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
          )}
        >
          <Icon className="size-4" />
        </div>
      </div>
    </Card>
  );
}

export function StateDeltaCards({ data }: StateDeltaCardsProps): JSX.Element | null {
  const [timeframe, setTimeframe] = useState<DeltaTimeframe>('daily');
  const delta = useStateDelta(data, timeframe);

  if (!delta) return null;

  const isPositive = delta.total.delta >= 0;

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {/* Vertical timeframe toggle */}
        <div className="flex shrink-0 flex-col gap-1 rounded-md border border-border bg-surface/50 p-1">
          {TIMEFRAME_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => setTimeframe(option.value)}
              className={clsx(
                'rounded-xs px-3 py-1.5 text-xs font-medium transition-all',
                timeframe === option.value
                  ? 'bg-primary text-white'
                  : 'text-muted hover:bg-muted/10 hover:text-foreground'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        {/* Main content */}
        <div className="min-w-0 flex-1 space-y-4">
          {/* Total State Changes header */}
          <div>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-sm font-medium text-foreground">Total State Changes:</span>
              <span className="text-xl font-bold text-foreground">{formatDeltaBytes(delta.total.delta)}</span>
              <span className={clsx('text-sm font-medium', isPositive ? 'text-warning' : 'text-success')}>
                ({formatPercentage(delta.total.percentChange)})
              </span>
            </div>
            <p className="mt-1 text-[10px] text-muted">
              Comparing {delta.currentDate} vs {delta.previousDate}
            </p>
          </div>

          {/* Delta cards row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <DeltaCard
              label="Accounts"
              bytesDelta={delta.accounts.bytes.delta}
              bytesPercentChange={delta.accounts.bytes.percentChange}
              countDelta={delta.accounts.count.delta}
              countPercentChange={delta.accounts.count.percentChange}
            />
            <DeltaCard
              label="Storage Slots"
              bytesDelta={delta.storage.bytes.delta}
              bytesPercentChange={delta.storage.bytes.percentChange}
              countDelta={delta.storage.count.delta}
              countPercentChange={delta.storage.count.percentChange}
            />
            <DeltaCard
              label="Contract Codes"
              bytesDelta={delta.contractCodes.bytes.delta}
              bytesPercentChange={delta.contractCodes.bytes.percentChange}
              countDelta={delta.contractCodes.count.delta}
              countPercentChange={delta.contractCodes.count.percentChange}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}
