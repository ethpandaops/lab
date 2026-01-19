import { type JSX, useMemo, useCallback, useState } from 'react';
import {
  CubeIcon,
  CursorArrowRaysIcon,
  DocumentTextIcon,
  ClockIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { Container } from '@/components/Layout/Container';
import { Card } from '@/components/Layout/Card';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import { Popover, PopoverButton, PopoverPanel } from '@/components/Overlays/Popover';
import { formatSmartDecimal, hexToRgba } from '@/utils';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useStateExpiryData, EXPIRY_POLICIES, EXPIRY_TYPES, type ExpiryPolicy, type ExpiryType } from './hooks';
import { PolicySelector, type PolicySelectorConfig, StateExpirySkeleton, ContractTop100List } from './components';

/** Short labels for chart series */
const POLICY_LABELS_SHORT: Record<ExpiryPolicy, string> = {
  '12m': '1y',
  '24m': '2y',
};

/** Display labels for expiry types */
const TYPE_LABELS: Record<ExpiryType, string> = {
  slot: 'Slot',
  contract: 'Contract',
};

/** Colors for expiry types */
const TYPE_COLORS: Record<ExpiryType, string> = {
  slot: '#3b82f6', // blue
  contract: '#8b5cf6', // violet
};

/** Configuration for the PolicySelector component */
const POLICY_SELECTOR_CONFIG: PolicySelectorConfig<ExpiryType, ExpiryPolicy> = {
  types: EXPIRY_TYPES,
  policies: EXPIRY_POLICIES,
  typeConfig: {
    slot: {
      label: 'Slot',
      icon: CubeIcon,
      textColor: 'text-blue-600 dark:text-blue-400',
      selectedBg: 'bg-blue-500/25',
      selectedRing: 'ring-blue-500 dark:ring-blue-400',
      hoverBg: 'hover:bg-blue-500/20 dark:hover:bg-blue-500/25',
      rowHoverBg: 'bg-blue-500/10 dark:bg-blue-500/15',
      cellBg: 'bg-blue-500/10 dark:bg-blue-500/10',
      fillColor: 'bg-blue-500/30 dark:bg-blue-500/25',
    },
    contract: {
      label: 'Contract',
      icon: DocumentTextIcon,
      textColor: 'text-violet-600 dark:text-violet-400',
      selectedBg: 'bg-violet-500/25',
      selectedRing: 'ring-violet-500 dark:ring-violet-400',
      hoverBg: 'hover:bg-violet-500/20 dark:hover:bg-violet-500/25',
      rowHoverBg: 'bg-violet-500/10 dark:bg-violet-500/15',
      cellBg: 'bg-violet-500/10 dark:bg-violet-500/10',
      fillColor: 'bg-violet-500/30 dark:bg-violet-500/25',
    },
  },
  policyConfig: {
    '12m': {
      shortLabel: '1y',
      fullLabel: '1 year',
      tooltip: 'Storage expires after 1 year of inactivity. More aggressive pruning.',
    },
    '24m': {
      shortLabel: '2y',
      fullLabel: '2 years',
      tooltip: 'Storage expires after 2 years of inactivity. More conservative.',
    },
  },
  typeTooltips: {
    slot: {
      title: 'Slot-based expiry',
      description:
        "Tracks each storage slot independently. A slot expires if it hasn't been accessed within the inactivity period. More aggressive pruning, finer control.",
    },
    contract: {
      title: 'Contract-based expiry',
      description:
        'Groups all slots by contract. If ANY slot is accessed, the entire contract stays active. Simpler but less aggressive.',
    },
  },
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

/**
 * State Expiry page - Visualizes the impact of different state expiry policies
 * on Ethereum's storage size over time.
 */
export function IndexPage(): JSX.Element {
  const { data, isLoading, error } = useStateExpiryData();
  const [selectedPolicy, setSelectedPolicy] = useState<ExpiryPolicy>('12m');
  const [selectedType, setSelectedType] = useState<ExpiryType>('slot');
  const themeColors = useThemeColors();

  // Calculate savings data for the policy selector matrix (includes actual values for enhanced cells)
  const savingsData = useMemo(() => {
    const result: Record<
      ExpiryType,
      Record<
        ExpiryPolicy,
        {
          bytesPercent: number | null;
          slotsPercent: number | null;
          afterBytes: number | null;
          afterSlots: number | null;
        }
      >
    > = {
      slot: {
        '12m': { bytesPercent: null, slotsPercent: null, afterBytes: null, afterSlots: null },
        '24m': { bytesPercent: null, slotsPercent: null, afterBytes: null, afterSlots: null },
      },
      contract: {
        '12m': { bytesPercent: null, slotsPercent: null, afterBytes: null, afterSlots: null },
        '24m': { bytesPercent: null, slotsPercent: null, afterBytes: null, afterSlots: null },
      },
    };

    if (!data || data.length === 0) return result;

    // Find latest data point with expiry info
    for (let i = data.length - 1; i >= 0; i--) {
      const point = data[i];

      for (const type of EXPIRY_TYPES) {
        for (const policy of EXPIRY_POLICIES) {
          if (result[type][policy].bytesPercent !== null) continue;

          const policyData = type === 'slot' ? point.slotExpiryData[policy] : point.contractExpiryData[policy];
          if (policyData.effectiveBytes !== null && point.effectiveBytes > 0) {
            const bytesSaved = point.effectiveBytes - policyData.effectiveBytes;
            result[type][policy].bytesPercent = (bytesSaved / point.effectiveBytes) * 100;
            result[type][policy].afterBytes = policyData.effectiveBytes;
          }
          if (policyData.activeSlots !== null && point.activeSlots > 0) {
            const slotsSaved = point.activeSlots - policyData.activeSlots;
            result[type][policy].slotsPercent = (slotsSaved / point.activeSlots) * 100;
            result[type][policy].afterSlots = policyData.activeSlots;
          }
        }
      }
    }

    return result;
  }, [data]);

  // Get current state (baseline) from latest data point
  const currentState = useMemo(() => {
    if (!data || data.length === 0) return { bytes: null, slots: null };
    const latest = data[data.length - 1];
    return { bytes: latest.effectiveBytes, slots: latest.activeSlots };
  }, [data]);

  // Chart data - show all policies with selected one highlighted
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const bytesToGB = (bytes: number | null): number | null => (bytes === null ? null : bytes / (1024 * 1024 * 1024));

    const selectedColor = TYPE_COLORS[selectedType];
    // Use muted color for current state line (adapts to theme)
    const currentStateColor = themeColors.muted;
    // Use border color with 20% opacity for non-selected lines
    const inactiveColor = hexToRgba(themeColors.border, 0.2);

    // Build series in fixed order: Current -> Slot 6,12,18,24 -> Contract 6,12,18,24
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

    // 1. Current State first
    bytesSeries.push({
      name: 'Current State',
      data: data.map(item => bytesToGB(item.effectiveBytes)),
      color: currentStateColor,
      lineWidth: 3,
    });
    slotsSeries.push({
      name: 'Current State',
      data: data.map(item => item.activeSlots),
      color: currentStateColor,
      lineWidth: 3,
    });

    // 2. Then all policies in order: Slot 6,12,18,24 -> Contract 6,12,18,24
    for (const type of EXPIRY_TYPES) {
      for (const policy of EXPIRY_POLICIES) {
        const isSelected = type === selectedType && policy === selectedPolicy;
        const seriesName = `${TYPE_LABELS[type]} (${POLICY_LABELS_SHORT[policy]})`;

        bytesSeries.push({
          name: seriesName,
          data: data.map(item => {
            const policyData = type === 'slot' ? item.slotExpiryData[policy] : item.contractExpiryData[policy];
            return bytesToGB(policyData.effectiveBytes);
          }),
          color: isSelected ? selectedColor : inactiveColor,
          lineWidth: isSelected ? 3 : 2,
        });

        slotsSeries.push({
          name: seriesName,
          data: data.map(item => {
            const policyData = type === 'slot' ? item.slotExpiryData[policy] : item.contractExpiryData[policy];
            return policyData.activeSlots;
          }),
          color: isSelected ? selectedColor : inactiveColor,
          lineWidth: isSelected ? 3 : 2,
        });
      }
    }

    return {
      labels: data.map(item => item.dateLabel),
      bytesSeries,
      slotsSeries,
    };
  }, [data, selectedType, selectedPolicy, themeColors]);

  const bytesTooltipFormatter = useCallback((params: unknown): string => {
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

  const handlePolicySelect = useCallback((type: ExpiryType, policy: ExpiryPolicy) => {
    setSelectedType(type);
    setSelectedPolicy(policy);
  }, []);

  /** Handle click on chart series to switch to that policy */
  const handleSeriesClick = useCallback((seriesName: string) => {
    // Skip "Current State" series
    if (seriesName === 'Current State') return;

    // Parse series name like "Slot (1y)" or "Contract (2y)"
    const match = seriesName.match(/^(Slot|Contract)\s+\((\d+y)\)$/i);
    if (match) {
      const type = match[1].toLowerCase() as ExpiryType;
      // Convert label back to policy key
      const labelToPolicy: Record<string, ExpiryPolicy> = { '1y': '12m', '2y': '24m' };
      const policy = labelToPolicy[match[2]];

      // Validate policy exists
      if (EXPIRY_POLICIES.includes(policy) && EXPIRY_TYPES.includes(type)) {
        setSelectedType(type);
        setSelectedPolicy(policy);
      }
    }
  }, []);

  return (
    <Container>
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-foreground">State Expiry</h1>
            <Popover className="relative">
              <PopoverButton
                variant="blank"
                iconOnly
                leadingIcon={
                  <InformationCircleIcon className="size-5 text-muted transition-colors hover:text-foreground" />
                }
                className="!p-0"
              />
              <PopoverPanel anchor="bottom start" className="w-80 p-3">
                <p className="text-xs/5 text-muted">
                  <span className="font-semibold text-foreground">State expiry</span> reduces Ethereum&apos;s state size
                  by marking storage slots as &quot;expired&quot; after a period of inactivity. Expired state is pruned
                  from active storage but can be restored via witnesses when needed.
                </p>
              </PopoverPanel>
            </Popover>
          </div>
          <p className="mt-0.5 text-sm text-muted">
            Impact of expiring unused contract storage after inactivity periods
          </p>
        </div>

        {/* Compact legend chips with popovers - visible below lg */}
        <div className="flex flex-wrap items-center gap-2 text-xs lg:hidden">
          <Popover className="relative">
            <PopoverButton
              variant="blank"
              className="inline-flex items-center gap-1.5 border border-blue-500/30 bg-blue-500/10 px-2.5 py-1 text-blue-600 hover:bg-blue-500/20 dark:border-blue-400/30 dark:bg-blue-400/10 dark:text-blue-400 dark:hover:bg-blue-400/20"
            >
              <CubeIcon className="size-3.5" />
              <span className="font-medium">Slot</span>
            </PopoverButton>
            <PopoverPanel anchor="bottom start" className="w-56 p-2.5">
              <p className="text-xs/5 text-muted">
                <span className="font-semibold text-foreground">Slot-based expiry</span> marks individual storage slots
                as expired based on when each slot was last accessed.
              </p>
            </PopoverPanel>
          </Popover>
          <Popover className="relative">
            <PopoverButton
              variant="blank"
              className="inline-flex items-center gap-1.5 border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-violet-600 hover:bg-violet-500/20 dark:border-violet-400/30 dark:bg-violet-400/10 dark:text-violet-400 dark:hover:bg-violet-400/20"
            >
              <DocumentTextIcon className="size-3.5" />
              <span className="font-medium">Contract</span>
            </PopoverButton>
            <PopoverPanel anchor="bottom start" className="w-56 p-2.5">
              <p className="text-xs/5 text-muted">
                <span className="font-semibold text-foreground">Contract-based expiry</span> marks all storage slots of
                a contract as expired based on when the contract was last accessed.
              </p>
            </PopoverPanel>
          </Popover>
          <Popover className="relative">
            <PopoverButton
              variant="blank"
              className="inline-flex items-center gap-1.5 border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-600 hover:bg-emerald-500/20 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-400 dark:hover:bg-emerald-400/20"
            >
              <ClockIcon className="size-3.5" />
              <span className="font-medium">1-2y</span>
            </PopoverButton>
            <PopoverPanel anchor="bottom start" className="w-56 p-2.5">
              <p className="text-xs/5 text-muted">
                <span className="font-semibold text-foreground">Inactivity period</span> determines how long a storage
                slot must be inactive before being marked as expired (1 or 2 years).
              </p>
            </PopoverPanel>
          </Popover>
        </div>
      </div>

      {error && (
        <Card className="p-6">
          <p className="text-danger">Failed to load state expiry data: {error.message}</p>
        </Card>
      )}

      {!error && (
        <div className="space-y-4">
          {/* Call to action - always visible */}
          <div className="inline-flex items-center gap-2 rounded-sm border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
            <CursorArrowRaysIcon className="size-4 shrink-0" />
            <span>Select an expiry policy below to see how much storage could be reclaimed</span>
          </div>

          {/* Policy Selector - integrated with current state and resulting values */}
          <PolicySelector
            selectedType={selectedType}
            selectedPolicy={selectedPolicy}
            onSelect={handlePolicySelect}
            savingsData={savingsData}
            config={POLICY_SELECTOR_CONFIG}
            currentBytes={currentState.bytes}
            currentSlots={currentState.slots}
            formatBytes={formatBytes}
            formatSlots={formatStorageSlotCount}
          />

          {/* Skeleton for data-dependent content */}
          {isLoading && <StateExpirySkeleton />}

          {/* Charts - data dependent */}
          {chartData && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <PopoutCard
                  title="Storage Size"
                  subtitle="Current vs expiry policy"
                  downloadFilename="state-expiry-storage-size"
                >
                  {({ inModal }) => (
                    <MultiLineChart
                      series={chartData.bytesSeries}
                      xAxis={{
                        type: 'category',
                        labels: chartData.labels,
                        name: 'Date',
                      }}
                      yAxis={{
                        name: 'Size (GB)',
                        formatter: (value: number) => value.toFixed(4),
                      }}
                      height={inModal ? 600 : 280}
                      showLegend={false}
                      enableDataZoom={true}
                      tooltipFormatter={bytesTooltipFormatter}
                      syncGroup={inModal ? undefined : 'state-expiry'}
                      onSeriesClick={handleSeriesClick}
                    />
                  )}
                </PopoutCard>

                <PopoutCard
                  title="Active Storage Slots"
                  subtitle="Current vs expiry policy"
                  downloadFilename="state-expiry-active-slots"
                >
                  {({ inModal }) => (
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
                            return `${(value / 1_000_000).toFixed(4)}M`;
                          }
                          if (value >= 1_000) {
                            return `${(value / 1_000).toFixed(4)}K`;
                          }
                          return value.toFixed(0);
                        },
                      }}
                      height={inModal ? 600 : 280}
                      showLegend={false}
                      enableDataZoom={true}
                      tooltipFormatter={slotsTooltipFormatter}
                      syncGroup={inModal ? undefined : 'state-expiry'}
                      onSeriesClick={handleSeriesClick}
                    />
                  )}
                </PopoutCard>
              </div>

              {/* Top 100 Contracts */}
              <ContractTop100List />
            </>
          )}
        </div>
      )}
    </Container>
  );
}
