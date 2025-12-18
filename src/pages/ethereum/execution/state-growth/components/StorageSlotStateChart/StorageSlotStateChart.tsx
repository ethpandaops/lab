import { type JSX, useMemo, useCallback, useState } from 'react';
import clsx from 'clsx';
import { Card } from '@/components/Layout/Card';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import { formatSmartDecimal } from '@/utils';
import { useStorageSlotStateData, EXPIRY_POLICIES, type ExpiryPolicy } from '../../hooks';

/** Color palette for expiry policies */
const POLICY_COLORS: Record<ExpiryPolicy, string> = {
  '6m': '#f59e0b', // amber
  '12m': '#22c55e', // green
  '18m': '#3b82f6', // blue
  '24m': '#8b5cf6', // violet
};

/** Display labels for expiry policies */
const POLICY_LABELS: Record<ExpiryPolicy, string> = {
  '6m': '6 Month',
  '12m': '12 Month',
  '18m': '18 Month',
  '24m': '24 Month',
};

/**
 * Format bytes to human-readable format (GB, TB)
 */
function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1000) {
    return `${(gb / 1024).toFixed(2)} TB`;
  }
  return `${gb.toFixed(2)} GB`;
}

/**
 * Format storage slot count to human-readable format (M for millions, B for billions)
 */
function formatStorageSlotCount(count: number): string {
  if (count >= 1_000_000_000) {
    return `${(count / 1_000_000_000).toFixed(2)}B`;
  }
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(2)}M`;
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(2)}K`;
  }
  return count.toFixed(0);
}

/**
 * StorageSlotStateChart - Displays a comparison of storage slot state
 * with and without various expiry policies over time.
 */
export function StorageSlotStateChart(): JSX.Element {
  const { data, isLoading, error } = useStorageSlotStateData();
  const [selectedPolicy, setSelectedPolicy] = useState<ExpiryPolicy>('6m');

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Convert bytes to GB for display, preserving null for chart gaps
    const bytesToGB = (bytes: number | null): number | null => (bytes === null ? null : bytes / (1024 * 1024 * 1024));

    return {
      // Date labels
      labels: data.map(item => item.dateLabel),
      // Series for bytes chart - current + all expiry policies
      bytesSeries: [
        {
          name: 'Current',
          data: data.map(item => bytesToGB(item.effectiveBytes)),
          color: '#71717a', // zinc
        },
        ...EXPIRY_POLICIES.map(policy => ({
          name: POLICY_LABELS[policy],
          data: data.map(item => bytesToGB(item.expiryData[policy].effectiveBytes)),
          color: POLICY_COLORS[policy],
        })),
      ],
      // Series for slots chart - current + all expiry policies
      slotsSeries: [
        {
          name: 'Current',
          data: data.map(item => item.activeSlots),
          color: '#71717a', // zinc
        },
        ...EXPIRY_POLICIES.map(policy => ({
          name: POLICY_LABELS[policy],
          data: data.map(item => item.expiryData[policy].activeSlots),
          color: POLICY_COLORS[policy],
        })),
      ],
      // Raw data for calculations
      rawData: data,
    };
  }, [data]);

  // Calculate savings for the selected policy
  // Find the most recent data point with valid expiry data for the selected policy
  const savings = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Find latest point that has data for the selected policy
    let latestWithPolicy = null;
    for (let i = data.length - 1; i >= 0; i--) {
      const policyData = data[i].expiryData[selectedPolicy];
      if (policyData.effectiveBytes !== null && policyData.activeSlots !== null) {
        latestWithPolicy = data[i];
        break;
      }
    }

    if (!latestWithPolicy) return null;

    const policyData = latestWithPolicy.expiryData[selectedPolicy];
    const expiryBytes = policyData.effectiveBytes!;
    const expirySlots = policyData.activeSlots!;
    const bytesSaved = latestWithPolicy.effectiveBytes - expiryBytes;
    const bytesPercentSaved =
      latestWithPolicy.effectiveBytes > 0 ? (bytesSaved / latestWithPolicy.effectiveBytes) * 100 : 0;
    const slotsSaved = latestWithPolicy.activeSlots - expirySlots;
    const slotsPercentSaved = latestWithPolicy.activeSlots > 0 ? (slotsSaved / latestWithPolicy.activeSlots) * 100 : 0;

    return {
      bytesSaved,
      bytesPercentSaved,
      slotsSaved,
      slotsPercentSaved,
      currentBytes: latestWithPolicy.effectiveBytes,
      expiryBytes,
      currentSlots: latestWithPolicy.activeSlots,
      expirySlots,
    };
  }, [data, selectedPolicy]);

  const bytesTooltipFormatter = useCallback((params: unknown): string => {
    const dataPoints = Array.isArray(params) ? params : [params];
    let html = '';

    if (dataPoints.length > 0 && dataPoints[0]) {
      const firstPoint = dataPoints[0] as { axisValue?: string; dataIndex?: number };
      if (firstPoint.axisValue !== undefined) {
        html += `<div style="margin-bottom: 8px; font-weight: 600; font-size: 13px;">${firstPoint.axisValue}</div>`;
      }
    }

    dataPoints.forEach(point => {
      const p = point as {
        marker?: string;
        seriesName?: string;
        value?: number | [number, number];
      };

      if (p.marker && p.seriesName !== undefined) {
        const yValue = Array.isArray(p.value) ? p.value[1] : p.value;
        if (yValue !== undefined && yValue !== null) {
          html += `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">`;
          html += p.marker;
          html += `<span>${p.seriesName}:</span>`;
          html += `<span style="font-weight: 600; min-width: 80px; text-align: right;">${formatSmartDecimal(yValue, 2)} GB</span>`;
          html += `</div>`;
        }
      }
    });

    return html;
  }, []);

  const slotsTooltipFormatter = useCallback((params: unknown): string => {
    const dataPoints = Array.isArray(params) ? params : [params];
    let html = '';

    if (dataPoints.length > 0 && dataPoints[0]) {
      const firstPoint = dataPoints[0] as { axisValue?: string; dataIndex?: number };
      if (firstPoint.axisValue !== undefined) {
        html += `<div style="margin-bottom: 8px; font-weight: 600; font-size: 13px;">${firstPoint.axisValue}</div>`;
      }
    }

    dataPoints.forEach(point => {
      const p = point as {
        marker?: string;
        seriesName?: string;
        value?: number | [number, number];
      };

      if (p.marker && p.seriesName !== undefined) {
        const yValue = Array.isArray(p.value) ? p.value[1] : p.value;
        if (yValue !== undefined && yValue !== null) {
          html += `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">`;
          html += p.marker;
          html += `<span>${p.seriesName}:</span>`;
          html += `<span style="font-weight: 600; min-width: 80px; text-align: right;">${formatStorageSlotCount(yValue)}</span>`;
          html += `</div>`;
        }
      }
    });

    return html;
  }, []);

  if (isLoading) {
    return (
      <Card rounded className="p-6">
        <div className="flex h-[400px] items-center justify-center">
          <div className="animate-pulse text-muted">Loading storage slot state data...</div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card rounded className="p-6">
        <p className="text-danger">Failed to load storage slot state data: {error.message}</p>
      </Card>
    );
  }

  if (!chartData || !savings) {
    return (
      <Card rounded className="p-6">
        <p className="text-muted">No storage slot state data available.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header with Policy Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Storage Slot Expiry</h2>
          <p className="mt-1 text-sm text-muted">
            Impact of expiring unused storage slots after a period of inactivity
          </p>
        </div>

        {/* Expiry Policy Selector */}
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted">Inactivity Period:</span>
            <div className="flex items-center gap-0.5 rounded-md border border-border bg-surface/50 p-0.5">
              {EXPIRY_POLICIES.map(policy => (
                <button
                  key={policy}
                  onClick={() => setSelectedPolicy(policy)}
                  className={clsx(
                    'rounded-xs px-3 py-1.5 text-xs font-medium transition-all',
                    selectedPolicy === policy
                      ? 'bg-primary text-white'
                      : 'text-muted hover:bg-muted/10 hover:text-foreground'
                  )}
                >
                  {policy}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card rounded className="p-3">
          <p className="text-xs font-medium tracking-wider text-muted uppercase">Current Storage Slot Value</p>
          <p className="mt-0.5 text-2xl font-bold text-foreground tabular-nums">{formatBytes(savings.currentBytes)}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="rounded-sm bg-zinc-500/10 px-1.5 py-0.5 text-xs font-medium text-zinc-400 tabular-nums">
              {formatStorageSlotCount(savings.currentSlots)} slots
            </span>
          </div>
        </Card>
        <Card rounded className="p-3">
          <p className="text-xs font-medium tracking-wider text-muted uppercase">
            After {POLICY_LABELS[selectedPolicy]} Expiry
          </p>
          <p className="mt-0.5 text-2xl font-bold tabular-nums" style={{ color: POLICY_COLORS[selectedPolicy] }}>
            {formatBytes(savings.expiryBytes)}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <span
              className="rounded-sm px-1.5 py-0.5 text-xs font-medium tabular-nums"
              style={{ backgroundColor: `${POLICY_COLORS[selectedPolicy]}15`, color: POLICY_COLORS[selectedPolicy] }}
            >
              {formatStorageSlotCount(savings.expirySlots)} slots
            </span>
          </div>
        </Card>
        <Card rounded className="p-3">
          <p className="text-xs font-medium tracking-wider text-muted uppercase">Size Savings</p>
          <p className="mt-0.5 text-2xl font-bold text-emerald-400 tabular-nums">{formatBytes(savings.bytesSaved)}</p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="rounded-sm bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-400 tabular-nums">
              -{savings.bytesPercentSaved.toFixed(1)}%
            </span>
            <span className="text-xs font-medium text-muted tabular-nums">
              {(100 - savings.bytesPercentSaved).toFixed(1)}% retained
            </span>
          </div>
        </Card>
        <Card rounded className="p-3">
          <p className="text-xs font-medium tracking-wider text-muted uppercase">Slots Expired</p>
          <p className="mt-0.5 text-2xl font-bold text-emerald-400 tabular-nums">
            {formatStorageSlotCount(savings.slotsSaved)}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <span className="rounded-sm bg-emerald-500/10 px-1.5 py-0.5 text-xs font-medium text-emerald-400 tabular-nums">
              -{savings.slotsPercentSaved.toFixed(1)}%
            </span>
            <span className="text-xs font-medium text-muted tabular-nums">
              {(100 - savings.slotsPercentSaved).toFixed(1)}% retained
            </span>
          </div>
        </Card>
      </div>

      {/* Bytes Chart */}
      <Card rounded className="p-6">
        <MultiLineChart
          title="Storage Size Comparison"
          subtitle="Effective bytes of storage slot values (excludes slot keys and account addresses)"
          series={chartData.bytesSeries}
          xAxis={{
            type: 'category',
            labels: chartData.labels,
            name: 'Date',
          }}
          yAxis={{
            name: 'Size (GB)',
          }}
          height={360}
          showLegend={true}
          enableDataZoom={true}
          tooltipFormatter={bytesTooltipFormatter}
        />
      </Card>

      {/* Slots Chart */}
      <Card rounded className="p-6">
        <MultiLineChart
          title="Active Storage Slots Comparison"
          subtitle="Daily snapshot of active storage slot counts"
          series={chartData.slotsSeries}
          xAxis={{
            type: 'category',
            labels: chartData.labels,
            name: 'Date',
          }}
          yAxis={{
            name: 'Active Storage Slots',
            formatter: (value: number) => formatStorageSlotCount(value),
          }}
          height={360}
          showLegend={true}
          enableDataZoom={true}
          tooltipFormatter={slotsTooltipFormatter}
        />
      </Card>
    </div>
  );
}
