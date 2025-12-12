import type { JSX } from 'react';
import clsx from 'clsx';
import { Card } from '@/components/Layout/Card';
import type { StorageSlotDataPoint } from '../../hooks';

interface StorageSummaryCardsProps {
  data: StorageSlotDataPoint;
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
  if (mb >= 1) {
    return `${mb.toFixed(2)} MB`;
  }
  const kb = bytes / 1024;
  return `${kb.toFixed(2)} KB`;
}

function formatCount(count: number): string {
  if (count >= 1_000_000_000) {
    return `${(count / 1_000_000_000).toFixed(2)}B`;
  }
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(2)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(2)}K`;
  }
  return count.toLocaleString();
}

function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(2)}%`;
}

export function StorageSummaryCards({ data }: StorageSummaryCardsProps): JSX.Element {
  const expiredBytesPercent = data.effectiveBytes > 0 ? (data.expiredBytes / data.effectiveBytes) * 100 : 0;
  const expiredSlotsPercent = data.activeSlots > 0 ? (data.expiredSlots / data.activeSlots) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Total Storage Section */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Total Storage Bytes */}
        <Card rounded className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium tracking-wider text-muted uppercase">Total Storage Bytes</p>
              <p className="mt-1 text-4xl font-bold text-foreground tabular-nums">{formatBytes(data.effectiveBytes)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium tracking-wider text-muted uppercase">Slot Count</p>
              <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">{formatCount(data.activeSlots)}</p>
            </div>
          </div>
        </Card>

        {/* Expired Storage Bytes */}
        <Card rounded className="border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium tracking-wider text-amber-400 uppercase">Expired Storage Bytes (6mo)</p>
              <p className="mt-1 text-4xl font-bold text-amber-400 tabular-nums">{formatBytes(data.expiredBytes)}</p>
              <p className="mt-1 text-sm text-amber-400/70">
                {formatPercent(data.expiredBytes, data.effectiveBytes)} of total
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium tracking-wider text-amber-400 uppercase">Expired Slots</p>
              <p className="mt-1 text-2xl font-bold text-amber-400 tabular-nums">{formatCount(data.expiredSlots)}</p>
              <p className="mt-1 text-sm text-amber-400/70">
                {formatPercent(data.expiredSlots, data.activeSlots)} of total
              </p>
            </div>
          </div>

          {/* Progress bar showing expiry percentage */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Active</span>
              <span>Expired</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-amber-500 transition-all duration-500"
                style={{ width: `${expiredBytesPercent}%` }}
              />
            </div>
            <div className="mt-1 flex items-center justify-between text-xs">
              <span className="text-foreground tabular-nums">
                {formatBytes(data.effectiveBytesWithExpiry)} ({(100 - expiredBytesPercent).toFixed(1)}%)
              </span>
              <span className="text-amber-400 tabular-nums">
                {formatBytes(data.expiredBytes)} ({expiredBytesPercent.toFixed(1)}%)
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Detailed Stats Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card rounded className="p-4">
          <p className="text-xs font-medium tracking-wider text-muted uppercase">Active Storage</p>
          <p className="mt-1 text-xl font-bold text-foreground tabular-nums">
            {formatBytes(data.effectiveBytesWithExpiry)}
          </p>
          <p className="mt-0.5 text-xs text-muted">After 6mo expiry</p>
        </Card>

        <Card rounded className="p-4">
          <p className="text-xs font-medium tracking-wider text-muted uppercase">Active Slots</p>
          <p className="mt-1 text-xl font-bold text-foreground tabular-nums">
            {formatCount(data.activeSlotsWithExpiry)}
          </p>
          <p className="mt-0.5 text-xs text-muted">After 6mo expiry</p>
        </Card>

        <Card rounded className="border-amber-500/20 p-4">
          <p className="text-xs font-medium tracking-wider text-amber-400 uppercase">Expired Bytes</p>
          <p className="mt-1 text-xl font-bold text-amber-400 tabular-nums">{formatBytes(data.expiredBytes)}</p>
          <p className="mt-0.5 text-xs text-amber-400/70">{expiredBytesPercent.toFixed(2)}% of total</p>
        </Card>

        <Card rounded className="border-amber-500/20 p-4">
          <p className="text-xs font-medium tracking-wider text-amber-400 uppercase">Expired Slots</p>
          <p className="mt-1 text-xl font-bold text-amber-400 tabular-nums">{formatCount(data.expiredSlots)}</p>
          <p className="mt-0.5 text-xs text-amber-400/70">{expiredSlotsPercent.toFixed(2)}% of total</p>
        </Card>
      </div>
    </div>
  );
}
