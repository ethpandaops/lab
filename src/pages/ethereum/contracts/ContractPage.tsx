import { type JSX, useMemo, useCallback, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { dimContractOwnerServiceListOptions } from '@/api/@tanstack/react-query.gen';
import { Container } from '@/components/Layout/Container';
import { Card } from '@/components/Layout/Card';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import { Badge } from '@/components/Elements/Badge';
import { formatSmartDecimal } from '@/utils';
import { useContractStorageData, EXPIRY_POLICIES } from './hooks';
import { ContractPageSkeleton } from './components';
import { ArrowTrendingUpIcon, CircleStackIcon, CubeIcon, ClockIcon } from '@heroicons/react/24/outline';

/** Colors for contract-level expiry policy lines */
const CONTRACT_POLICY_COLORS = {
  '6m': '#f97316', // orange-500
  '12m': '#eab308', // yellow-500
  '18m': '#22c55e', // green-500
  '24m': '#3b82f6', // blue-500
} as const;

/** Colors for slot-level expiry policy lines (distinct from contract colors) */
const SLOT_POLICY_COLORS = {
  '6m': '#ec4899', // pink-500
  '12m': '#a855f7', // purple-500
  '18m': '#14b8a6', // teal-500
  '24m': '#06b6d4', // cyan-500
} as const;

/** Color for contract current state */
const CONTRACT_CURRENT_COLOR = '#64748b'; // slate-500

/** Color for slot current state */
const SLOT_CURRENT_COLOR = '#8b5cf6'; // violet-500

/**
 * Format storage slot count to human-readable format
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

/** Expiry policy toggle keys */
type ExpiryPolicy = '6m' | '12m' | '18m' | '24m';

/** Visibility state for chart series */
interface VisibilityState {
  slot: boolean;
  contract: boolean;
  policies: Record<ExpiryPolicy, boolean>;
}

/**
 * Contract Storage page - Displays storage analysis for a specific contract.
 */
export function ContractPage(): JSX.Element {
  const { address } = useParams({ from: '/ethereum/contracts/$address' });
  const [extrapolate, setExtrapolate] = useState(false);
  const [visibility, setVisibility] = useState<VisibilityState>({
    slot: true,
    contract: true,
    policies: { '6m': true, '12m': true, '18m': true, '24m': true },
  });
  const { data, isLoading, error } = useContractStorageData(address, { extrapolate });

  /** Toggle visibility for a category or policy */
  const toggleVisibility = useCallback((key: 'slot' | 'contract' | ExpiryPolicy) => {
    setVisibility(prev => {
      if (key === 'slot' || key === 'contract') {
        return { ...prev, [key]: !prev[key] };
      }
      return {
        ...prev,
        policies: { ...prev.policies, [key]: !prev.policies[key] },
      };
    });
  }, []);

  // Fetch contract owner details
  const contractOwnerQuery = useQuery({
    ...dimContractOwnerServiceListOptions({
      query: { contract_address_eq: address },
    }),
  });
  const contractOwner = contractOwnerQuery.data?.dim_contract_owner?.[0];

  // Chart data - show current state and all expiry policies
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Determine the unit for display based on the max value
    const validBytes = data.map(d => d.effectiveBytes).filter((b): b is number => b !== null);
    const maxBytes = validBytes.length > 0 ? Math.max(...validBytes) : 0;
    const bytesUnit = maxBytes < 1024 * 1024 ? 'KB' : 'MB';
    const bytesDivisor = bytesUnit === 'KB' ? 1024 : 1024 * 1024;

    // Convert bytes using the consistent unit determined by max value
    const bytesToDisplay = (bytes: number | null): number | null => {
      if (bytes === null) return null;
      return bytes / bytesDivisor;
    };

    // Build series
    const bytesSeries: Array<{
      name: string;
      data: (number | null)[];
      color: string;
      lineWidth: number;
    }> = [];

    const slotsSeries: Array<{
      name: string;
      data: (number | null)[];
      color: string;
      lineWidth: number;
    }> = [];

    // === CONTRACT-LEVEL SERIES ===
    if (visibility.contract) {
      // Contract Current State
      bytesSeries.push({
        name: 'Contract Current',
        data: data.map(item => bytesToDisplay(item.effectiveBytes)),
        color: CONTRACT_CURRENT_COLOR,
        lineWidth: 3,
      });
      slotsSeries.push({
        name: 'Contract Current',
        data: data.map(item => item.activeSlots),
        color: CONTRACT_CURRENT_COLOR,
        lineWidth: 3,
      });

      // Contract expiry policies
      for (const policy of EXPIRY_POLICIES) {
        if (!visibility.policies[policy]) continue;
        const color = CONTRACT_POLICY_COLORS[policy];

        bytesSeries.push({
          name: `Contract ${policy} Expiry`,
          data: data.map(item => {
            const policyData = item.expiryData[policy];
            return bytesToDisplay(policyData.effectiveBytes);
          }),
          color,
          lineWidth: 2,
        });

        slotsSeries.push({
          name: `Contract ${policy} Expiry`,
          data: data.map(item => {
            const policyData = item.expiryData[policy];
            return policyData.activeSlots;
          }),
          color,
          lineWidth: 2,
        });
      }
    }

    // === SLOT-LEVEL SERIES (extrapolated to now, same as contract lines) ===
    if (visibility.slot) {
      // Slot Current State
      bytesSeries.push({
        name: 'Slot Current',
        data: data.map(item => bytesToDisplay(item.slotEffectiveBytes)),
        color: SLOT_CURRENT_COLOR,
        lineWidth: 3,
      });
      slotsSeries.push({
        name: 'Slot Current',
        data: data.map(item => item.slotActiveSlots),
        color: SLOT_CURRENT_COLOR,
        lineWidth: 3,
      });

      // Slot expiry policies
      for (const policy of EXPIRY_POLICIES) {
        if (!visibility.policies[policy]) continue;
        const color = SLOT_POLICY_COLORS[policy];

        bytesSeries.push({
          name: `Slot ${policy} Expiry`,
          data: data.map(item => {
            const policyData = item.slotExpiryData[policy];
            return bytesToDisplay(policyData.effectiveBytes);
          }),
          color,
          lineWidth: 2,
        });

        slotsSeries.push({
          name: `Slot ${policy} Expiry`,
          data: data.map(item => {
            const policyData = item.slotExpiryData[policy];
            return policyData.activeSlots;
          }),
          color,
          lineWidth: 2,
        });
      }
    }

    return {
      labels: data.map(item => item.dateLabel),
      bytesSeries,
      slotsSeries,
      bytesUnit,
    };
  }, [data, visibility]);

  const bytesTooltipFormatter = useCallback(
    (params: unknown): string => {
      const dataPoints = Array.isArray(params) ? params : [params];
      let html = '';

      if (dataPoints.length > 0 && dataPoints[0]) {
        const firstPoint = dataPoints[0] as { axisValue?: string };
        if (firstPoint.axisValue) {
          html += `<div style="margin-bottom: 8px; font-weight: 600; font-size: 13px;">${firstPoint.axisValue}</div>`;
        }
      }

      dataPoints.forEach(point => {
        const p = point as { marker?: string; seriesName?: string; value?: number | [number, number] };
        if (p.marker && p.seriesName !== undefined) {
          const yValue = Array.isArray(p.value) ? p.value[1] : p.value;
          if (yValue !== undefined && yValue !== null) {
            const unit = chartData?.bytesUnit ?? 'MB';
            html += `<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">`;
            html += p.marker;
            html += `<span>${p.seriesName}:</span>`;
            html += `<span style="font-weight: 600; min-width: 80px; text-align: right;">${formatSmartDecimal(yValue, 2)} ${unit}</span>`;
            html += `</div>`;
          }
        }
      });

      return html;
    },
    [chartData?.bytesUnit]
  );

  const slotsTooltipFormatter = useCallback((params: unknown): string => {
    const dataPoints = Array.isArray(params) ? params : [params];
    let html = '';

    if (dataPoints.length > 0 && dataPoints[0]) {
      const firstPoint = dataPoints[0] as { axisValue?: string };
      if (firstPoint.axisValue) {
        html += `<div style="margin-bottom: 8px; font-weight: 600; font-size: 13px;">${firstPoint.axisValue}</div>`;
      }
    }

    dataPoints.forEach(point => {
      const p = point as { marker?: string; seriesName?: string; value?: number | [number, number] };
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

  return (
    <Container>
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-foreground">{contractOwner?.contract_name ?? 'Contract Storage'}</h1>
        <p className="mt-0.5 font-mono text-sm text-muted">{address}</p>

        {/* Contract details */}
        {contractOwner && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {contractOwner.usage_category && (
              <Badge variant="border" size="small">
                {contractOwner.usage_category}
              </Badge>
            )}
            {contractOwner.account_owner && (
              <Badge variant="border" size="small">
                Owner: {contractOwner.account_owner}
              </Badge>
            )}
            {contractOwner.factory_contract && (
              <Badge variant="border" size="small" className="font-mono">
                Factory: {contractOwner.factory_contract.slice(0, 10)}...
              </Badge>
            )}
            {contractOwner.source && (
              <Badge variant="flat" size="small">
                via {contractOwner.source}
              </Badge>
            )}
          </div>
        )}
      </div>

      {isLoading ? (
        <ContractPageSkeleton />
      ) : error ? (
        <Card className="p-6">
          <p className="text-danger">Failed to load contract data: {error.message}</p>
        </Card>
      ) : !chartData ? (
        <Card className="p-6">
          <p className="text-muted">No storage data found for this contract.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Extrapolate */}
            <button
              type="button"
              onClick={() => setExtrapolate(!extrapolate)}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                extrapolate
                  ? 'text-primary-foreground bg-primary ring-2 ring-primary/30'
                  : 'bg-surface/50 text-muted ring-1 ring-border hover:bg-surface hover:text-foreground hover:ring-primary/30'
              )}
            >
              <ArrowTrendingUpIcon className="size-3.5" />
              Extrapolate
            </button>

            {/* Divider */}
            <div className="h-5 w-px bg-border" />

            {/* Category toggles */}
            <button
              type="button"
              onClick={() => toggleVisibility('slot')}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                visibility.slot
                  ? 'text-primary-foreground bg-primary ring-2 ring-primary/30'
                  : 'bg-surface/50 text-muted ring-1 ring-border hover:bg-surface hover:text-foreground hover:ring-primary/30'
              )}
            >
              <CubeIcon className="size-3.5" />
              Slot
            </button>
            <button
              type="button"
              onClick={() => toggleVisibility('contract')}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                visibility.contract
                  ? 'text-primary-foreground bg-primary ring-2 ring-primary/30'
                  : 'bg-surface/50 text-muted ring-1 ring-border hover:bg-surface hover:text-foreground hover:ring-primary/30'
              )}
            >
              <CircleStackIcon className="size-3.5" />
              Contract
            </button>

            {/* Divider */}
            <div className="h-5 w-px bg-border" />

            {/* Policy toggles */}
            {(['6m', '12m', '18m', '24m'] as const).map(policy => (
              <button
                key={policy}
                type="button"
                onClick={() => toggleVisibility(policy)}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                  visibility.policies[policy]
                    ? 'text-primary-foreground bg-primary ring-2 ring-primary/30'
                    : 'bg-surface/50 text-muted ring-1 ring-border hover:bg-surface hover:text-foreground hover:ring-primary/30'
                )}
              >
                <ClockIcon className="size-3.5" />
                {policy}
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <PopoutCard
              title="Storage Size"
              subtitle="Current state vs expiry policies"
              downloadFilename={`contract-storage-size-${address.slice(0, 10)}`}
            >
              <MultiLineChart
                series={chartData.bytesSeries}
                xAxis={{
                  type: 'category',
                  labels: chartData.labels,
                  name: 'Date',
                }}
                yAxis={{
                  name: `Size (${chartData.bytesUnit})`,
                  formatter: (value: number) => value.toFixed(2),
                }}
                height={280}
                showLegend={true}
                enableDataZoom={true}
                tooltipFormatter={bytesTooltipFormatter}
                syncGroup="contract-storage"
              />
            </PopoutCard>

            <PopoutCard
              title="Active Storage Slots"
              subtitle="Current state vs expiry policies"
              downloadFilename={`contract-storage-slots-${address.slice(0, 10)}`}
            >
              <MultiLineChart
                series={chartData.slotsSeries}
                xAxis={{
                  type: 'category',
                  labels: chartData.labels,
                  name: 'Date',
                }}
                yAxis={{
                  name: 'Slots',
                  formatter: (value: number) => {
                    if (value >= 1_000_000) {
                      return `${(value / 1_000_000).toFixed(2)}M`;
                    }
                    if (value >= 1_000) {
                      return `${(value / 1_000).toFixed(2)}K`;
                    }
                    return value.toFixed(0);
                  },
                }}
                height={280}
                showLegend={true}
                enableDataZoom={true}
                tooltipFormatter={slotsTooltipFormatter}
                syncGroup="contract-storage"
              />
            </PopoutCard>
          </div>
        </div>
      )}
    </Container>
  );
}
