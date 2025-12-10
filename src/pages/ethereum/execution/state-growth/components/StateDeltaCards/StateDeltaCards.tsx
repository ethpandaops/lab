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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">State Growth</h3>
        <div className="flex items-center gap-1 rounded-md border border-border bg-surface/50 p-0.5">
          {TIMEFRAME_OPTIONS.map(option => (
            <button
              key={option.value}
              onClick={() => setTimeframe(option.value)}
              className={clsx(
                'rounded px-2.5 py-1 text-xs font-medium transition-all',
                timeframe === option.value
                  ? 'bg-primary text-white'
                  : 'text-muted hover:bg-muted/10 hover:text-foreground'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <DeltaCard label="Total State" bytesDelta={delta.total.delta} bytesPercentChange={delta.total.percentChange} />
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

      <p className="text-[10px] text-muted">
        Comparing {delta.currentDate} vs {delta.previousDate}
      </p>
    </div>
  );
}
