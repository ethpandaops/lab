import { type JSX, useMemo, useCallback, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import {
  CubeIcon,
  CursorArrowRaysIcon,
  DocumentTextIcon,
  ClockIcon,
  ArrowDownIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { dimContractOwnerServiceListOptions } from '@/api/@tanstack/react-query.gen';
import { Container } from '@/components/Layout/Container';
import { Card } from '@/components/Layout/Card';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { MultiLineChart, type MarkLineConfig } from '@/components/Charts/MultiLine';
import { PolicySelector, type PolicySelectorConfig } from '@/pages/ethereum/execution/state-expiry/components';
import { formatSmartDecimal, hexToRgba } from '@/utils';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useContractStorageData, EXPIRY_POLICIES, EXPIRY_TYPES, type ExpiryPolicy, type ExpiryType } from './hooks';
import { ContractInfoCard, ContractInfoCardSkeleton, ContractStateExpirySkeleton } from './components';

/** Display labels for expiry policies */
const POLICY_LABELS: Record<ExpiryPolicy, string> = {
  '12m': '1 Year',
  '24m': '2 Year',
};

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
        "Tracks each storage slot independently. A slot expires if it hasn't been accessed within the inactivity period.",
    },
    contract: {
      title: 'Contract-based expiry',
      description: 'Groups all slots by contract. If ANY slot is accessed, the entire contract stays active.',
    },
  },
};

/**
 * Format bytes to human-readable format (KB, MB, GB)
 */
function formatBytes(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
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
 * Contract Storage page - Displays storage analysis for a specific contract.
 */
export function ContractPage(): JSX.Element {
  const { address } = useParams({ from: '/ethereum/contracts/$address' });
  const { data, latestData, isLoading, error } = useContractStorageData(address);
  const [selectedPolicy, setSelectedPolicy] = useState<ExpiryPolicy>('12m');
  const [selectedType, setSelectedType] = useState<ExpiryType>('slot');
  const themeColors = useThemeColors();

  // Fetch contract owner details
  const contractOwnerQuery = useQuery({
    ...dimContractOwnerServiceListOptions({
      query: { contract_address_eq: address },
    }),
  });
  const contractOwner = contractOwnerQuery.data?.dim_contract_owner?.[0];

  // Calculate savings data for the policy selector matrix
  const savingsData = useMemo(() => {
    const result: Record<
      ExpiryType,
      Record<ExpiryPolicy, { bytesPercent: number | null; slotsPercent: number | null }>
    > = {
      slot: {
        '12m': { bytesPercent: null, slotsPercent: null },
        '24m': { bytesPercent: null, slotsPercent: null },
      },
      contract: {
        '12m': { bytesPercent: null, slotsPercent: null },
        '24m': { bytesPercent: null, slotsPercent: null },
      },
    };

    if (!latestData) return result;

    // Use current state for baseline (contract-level)
    const currentBytes = latestData.effectiveBytes;
    const currentSlots = latestData.activeSlots;

    if (currentBytes === null || currentSlots === null) return result;

    // Slot-based expiry
    for (const policy of EXPIRY_POLICIES) {
      const policyData = latestData.slotExpiryData[policy];
      if (policyData.effectiveBytes !== null && currentBytes > 0) {
        const bytesSaved = currentBytes - policyData.effectiveBytes;
        result.slot[policy].bytesPercent = (bytesSaved / currentBytes) * 100;
      }
      if (policyData.activeSlots !== null && currentSlots > 0) {
        const slotsSaved = currentSlots - policyData.activeSlots;
        result.slot[policy].slotsPercent = (slotsSaved / currentSlots) * 100;
      }
    }

    // Contract-based expiry - binary: either whole contract expires (100%) or stays active (0%)
    // For a single contract, contract-based expiry is all-or-nothing
    for (const policy of EXPIRY_POLICIES) {
      const policyData = latestData.expiryData[policy];
      if (policyData.effectiveBytes !== null) {
        // If any data remains, contract is active (0% savings); if all expired, 100% savings
        result.contract[policy].bytesPercent = policyData.effectiveBytes === 0 ? 100 : 0;
      }
      if (policyData.activeSlots !== null) {
        result.contract[policy].slotsPercent = policyData.activeSlots === 0 ? 100 : 0;
      }
    }

    return result;
  }, [latestData]);

  // Current selection savings for stats panels
  const selectedSavings = useMemo(() => {
    if (!latestData) return null;

    const currentBytes = latestData.effectiveBytes;
    const currentSlots = latestData.activeSlots;

    if (currentBytes === null || currentSlots === null) return null;

    const policyData =
      selectedType === 'slot' ? latestData.slotExpiryData[selectedPolicy] : latestData.expiryData[selectedPolicy];

    if (policyData.effectiveBytes === null || policyData.activeSlots === null) return null;

    // For contract-based expiry, use binary 0%/100% (whole contract expires or stays active)
    // For slot-based expiry, use actual percentage
    let afterBytes: number;
    let afterSlots: number;
    let bytesSaved: number;
    let slotsSaved: number;
    let bytesPercent: number;
    let slotsPercent: number;

    if (selectedType === 'contract') {
      // Binary: either 0 (expired) or same as current (active)
      const isExpired = policyData.effectiveBytes === 0;
      afterBytes = isExpired ? 0 : currentBytes;
      afterSlots = isExpired ? 0 : currentSlots;
      bytesSaved = isExpired ? currentBytes : 0;
      slotsSaved = isExpired ? currentSlots : 0;
      bytesPercent = isExpired ? 100 : 0;
      slotsPercent = isExpired ? 100 : 0;
    } else {
      // Slot-based: actual values and percentages
      afterBytes = policyData.effectiveBytes;
      afterSlots = policyData.activeSlots;
      bytesSaved = currentBytes - afterBytes;
      slotsSaved = currentSlots - afterSlots;
      bytesPercent = currentBytes > 0 ? (bytesSaved / currentBytes) * 100 : 0;
      slotsPercent = currentSlots > 0 ? (slotsSaved / currentSlots) * 100 : 0;
    }

    return {
      currentBytes,
      currentSlots,
      afterBytes,
      afterSlots,
      bytesSaved,
      bytesPercent,
      slotsSaved,
      slotsPercent,
    };
  }, [latestData, selectedType, selectedPolicy]);

  // Chart data - show all policies with selected one highlighted
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Determine the unit for display based on the max value
    const validBytes = data.map(d => d.effectiveBytes).filter((b): b is number => b !== null);
    const maxBytes = validBytes.length > 0 ? Math.max(...validBytes) : 0;
    const bytesUnit = maxBytes < 1024 * 1024 ? 'KB' : maxBytes < 1024 * 1024 * 1024 ? 'MB' : 'GB';
    const bytesDivisor = bytesUnit === 'KB' ? 1024 : bytesUnit === 'MB' ? 1024 * 1024 : 1024 * 1024 * 1024;

    // Convert bytes using the consistent unit determined by max value
    const bytesToDisplay = (bytes: number | null): number | null => {
      if (bytes === null) return null;
      return bytes / bytesDivisor;
    };

    const selectedColor = TYPE_COLORS[selectedType];
    const currentStateColor = themeColors.muted;
    const inactiveColor = hexToRgba(themeColors.border, 0.2);

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

    // Current State first
    bytesSeries.push({
      name: 'Current State',
      data: data.map(item => bytesToDisplay(item.effectiveBytes)),
      color: currentStateColor,
      lineWidth: 3,
    });
    slotsSeries.push({
      name: 'Current State',
      data: data.map(item => item.activeSlots),
      color: currentStateColor,
      lineWidth: 3,
    });

    // Then all policies in order: Slot 1y,2y -> Contract 1y,2y
    for (const type of EXPIRY_TYPES) {
      for (const policy of EXPIRY_POLICIES) {
        const isSelected = type === selectedType && policy === selectedPolicy;
        const seriesName = `${TYPE_LABELS[type]} (${POLICY_LABELS_SHORT[policy]})`;

        bytesSeries.push({
          name: seriesName,
          data: data.map(item => {
            const policyData = type === 'slot' ? item.slotExpiryData[policy] : item.expiryData[policy];
            // For contract-based expiry: binary - either 0 (expired) or same as current state (active)
            if (type === 'contract') {
              return policyData.effectiveBytes === 0 ? 0 : bytesToDisplay(item.effectiveBytes);
            }
            return bytesToDisplay(policyData.effectiveBytes);
          }),
          color: isSelected ? selectedColor : inactiveColor,
          lineWidth: isSelected ? 3 : 2,
        });

        slotsSeries.push({
          name: seriesName,
          data: data.map(item => {
            const policyData = type === 'slot' ? item.slotExpiryData[policy] : item.expiryData[policy];
            // For contract-based expiry: binary - either 0 (expired) or same as current state (active)
            if (type === 'contract') {
              return policyData.activeSlots === 0 ? 0 : item.activeSlots;
            }
            return policyData.activeSlots;
          }),
          color: isSelected ? selectedColor : inactiveColor,
          lineWidth: isSelected ? 3 : 2,
        });
      }
    }

    // Calculate max values for consistent y-axis headroom (~20% padding)
    const maxBytesValue = Math.max(...bytesSeries.flatMap(s => s.data.filter((v): v is number => v !== null)));
    const maxSlotsValue = Math.max(...slotsSeries.flatMap(s => s.data.filter((v): v is number => v !== null)));

    // Add 20% headroom and round to nice numbers
    const bytesYMax = Math.ceil((maxBytesValue * 1.2) / 10) * 10; // Round to nearest 10
    const slotsYMax = Math.ceil((maxSlotsValue * 1.2) / 1_000_000) * 1_000_000; // Round to nearest 1M

    return {
      labels: data.map(item => item.dateLabel),
      bytesSeries,
      slotsSeries,
      bytesUnit,
      bytesYMax,
      slotsYMax,
    };
  }, [data, selectedType, selectedPolicy, themeColors]);

  // Detect resurrection events for contract-based expiry
  // A resurrection is when the contract goes from 0 (expired) back to active
  const resurrectionMarkLines = useMemo((): MarkLineConfig[] => {
    // Only show for contract-based expiry type
    if (selectedType !== 'contract' || !data || data.length < 2) return [];

    const markLines: MarkLineConfig[] = [];

    for (let i = 1; i < data.length; i++) {
      const prevData = data[i - 1].expiryData[selectedPolicy];
      const currData = data[i].expiryData[selectedPolicy];

      // Check if bytes went from 0 to non-zero (resurrection)
      if (prevData.effectiveBytes === 0 && currData.effectiveBytes !== null && currData.effectiveBytes > 0) {
        markLines.push({
          xValue: data[i].dateLabel,
          label: 'Resurrected',
          labelPosition: 'end',
          color: '#10b981', // emerald-500
          lineStyle: 'dashed',
          lineWidth: 1,
        });
      }
    }

    return markLines;
  }, [data, selectedType, selectedPolicy]);

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

  const selectedColor = TYPE_COLORS[selectedType];

  return (
    <Container>
      {/* Contract Info Card */}
      {contractOwnerQuery.isLoading ? (
        <ContractInfoCardSkeleton />
      ) : (
        <ContractInfoCard address={address} contractOwner={contractOwner} />
      )}

      {error ? (
        <Card className="mt-8 p-6">
          <p className="text-danger">Failed to load contract data: {error.message}</p>
        </Card>
      ) : (
        <div className="mt-8 space-y-4">
          {/* State Expiry Section Title */}
          <h2 className="text-xl font-semibold text-foreground">State Expiry</h2>

          {/* Call to action */}
          <div className="inline-flex items-center gap-2 rounded-sm border border-primary/20 bg-primary/5 px-3 py-2 text-sm text-primary">
            <CursorArrowRaysIcon className="size-4 shrink-0" />
            <span>Select an expiry policy below to see how much storage could be reclaimed</span>
          </div>

          {/* Policy Selector - always visible */}
          <PolicySelector
            selectedType={selectedType}
            selectedPolicy={selectedPolicy}
            onSelect={handlePolicySelect}
            savingsData={savingsData}
            config={POLICY_SELECTOR_CONFIG}
          />

          {/* Skeleton for data-dependent content */}
          {isLoading && <ContractStateExpirySkeleton />}

          {/* No data state */}
          {!isLoading && !chartData && (
            <Card className="p-6">
              <p className="text-muted">No storage data found for this contract.</p>
            </Card>
          )}

          {/* Data-dependent content */}
          {!isLoading && chartData && selectedSavings && (
            <>
              {/* Summary Cards */}
              <div className="grid gap-2 md:grid-cols-3 md:gap-3">
                {/* Current State */}
                <Card className="border-l-2 border-l-muted/50 p-2 md:p-3">
                  <p className="flex items-center gap-1 text-xs font-medium tracking-wide text-muted uppercase">
                    <CubeIcon className="size-3" />
                    <span>Current State</span>
                  </p>
                  <p className="mt-1 text-base font-bold text-foreground tabular-nums md:text-lg">
                    {formatBytes(selectedSavings.currentBytes)}
                  </p>
                  <p className="mt-0.5 text-xs text-muted tabular-nums">
                    {formatStorageSlotCount(selectedSavings.currentSlots)} slots
                  </p>
                </Card>

                {/* After Expiry */}
                <div className="border-l-2" style={{ borderLeftColor: selectedColor }}>
                  <Card className="border-l-0 p-2 md:p-3">
                    <p
                      className="flex items-center gap-1 text-xs font-medium tracking-wide uppercase"
                      style={{ color: selectedColor }}
                    >
                      <ClockIcon className="size-3" />
                      <span>
                        {POLICY_LABELS[selectedPolicy]} {TYPE_LABELS[selectedType]}
                      </span>
                    </p>
                    <p className="mt-1 text-base font-bold tabular-nums md:text-lg" style={{ color: selectedColor }}>
                      {formatBytes(selectedSavings.afterBytes)}
                    </p>
                    <p className="mt-0.5 text-xs tabular-nums" style={{ color: `${selectedColor}99` }}>
                      {formatStorageSlotCount(selectedSavings.afterSlots)} slots
                    </p>
                  </Card>
                </div>

                {/* Difference */}
                <Card className="border-l-2 border-l-emerald-500 p-2 md:p-3">
                  <p className="flex items-center gap-1 text-xs font-medium tracking-wide text-emerald-600 uppercase dark:text-emerald-400">
                    <SparklesIcon className="size-3" />
                    <span>Difference</span>
                  </p>
                  <div className="mt-1 flex items-baseline gap-1">
                    <p className="text-base font-bold text-emerald-600 tabular-nums md:text-lg dark:text-emerald-400">
                      -{formatBytes(selectedSavings.bytesSaved)} ({selectedSavings.bytesPercent.toFixed(1)}%)
                    </p>
                    <ArrowDownIcon className="size-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <p className="mt-0.5 text-xs text-emerald-600/70 tabular-nums dark:text-emerald-400/70">
                    {formatStorageSlotCount(selectedSavings.slotsSaved)} slots (
                    {selectedSavings.slotsPercent.toFixed(1)}% reduction)
                  </p>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid gap-4 md:grid-cols-2">
                <PopoutCard
                  title="Storage Size"
                  subtitle="Current vs expiry policy"
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
                      max: chartData.bytesYMax,
                      formatter: (value: number) => value.toFixed(2),
                    }}
                    height={280}
                    showLegend={false}
                    enableDataZoom={true}
                    tooltipFormatter={bytesTooltipFormatter}
                    syncGroup="contract-storage"
                    onSeriesClick={handleSeriesClick}
                    markLines={resurrectionMarkLines}
                  />
                </PopoutCard>

                <PopoutCard
                  title="Active Storage Slots"
                  subtitle="Current vs expiry policy"
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
                      max: chartData.slotsYMax,
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
                    showLegend={false}
                    enableDataZoom={true}
                    tooltipFormatter={slotsTooltipFormatter}
                    syncGroup="contract-storage"
                    onSeriesClick={handleSeriesClick}
                    markLines={resurrectionMarkLines}
                  />
                </PopoutCard>
              </div>
            </>
          )}
        </div>
      )}
    </Container>
  );
}
