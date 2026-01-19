import { type JSX, useMemo, useCallback, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { CubeIcon, CursorArrowRaysIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
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

  // Fetch contract owner details (address must be lowercase for API)
  const contractOwnerQuery = useQuery({
    ...dimContractOwnerServiceListOptions({
      query: { contract_address_eq: address.toLowerCase() },
    }),
  });
  const contractOwner = contractOwnerQuery.data?.dim_contract_owner?.[0];

  // Calculate savings data for the policy selector matrix
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
        result.slot[policy].afterBytes = policyData.effectiveBytes;
      }
      if (policyData.activeSlots !== null && currentSlots > 0) {
        const slotsSaved = currentSlots - policyData.activeSlots;
        result.slot[policy].slotsPercent = (slotsSaved / currentSlots) * 100;
        result.slot[policy].afterSlots = policyData.activeSlots;
      }
    }

    // Contract-based expiry - binary: either whole contract expires (100%) or stays active (0%)
    // For a single contract, contract-based expiry is all-or-nothing
    for (const policy of EXPIRY_POLICIES) {
      const policyData = latestData.expiryData[policy];
      if (policyData.effectiveBytes !== null) {
        // If any data remains, contract is active (0% savings); if all expired, 100% savings
        result.contract[policy].bytesPercent = policyData.effectiveBytes === 0 ? 100 : 0;
        result.contract[policy].afterBytes = policyData.effectiveBytes;
      }
      if (policyData.activeSlots !== null) {
        result.contract[policy].slotsPercent = policyData.activeSlots === 0 ? 100 : 0;
        result.contract[policy].afterSlots = policyData.activeSlots;
      }
    }

    return result;
  }, [latestData]);

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

      // Build selected series name for comparison
      const selectedSeriesName = `${TYPE_LABELS[selectedType]} (${POLICY_LABELS_SHORT[selectedPolicy]})`;

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
            const isCurrentState = p.seriesName === 'Current State';
            const isSelected = p.seriesName === selectedSeriesName;
            const opacity = isCurrentState || isSelected ? '1' : '0.4';
            const fontWeight = isCurrentState || isSelected ? '600' : '400';
            html += `<div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 4px; opacity: ${opacity};">`;
            html += `<span style="display: flex; align-items: center; gap: 8px;">${p.marker}<span>${p.seriesName}</span></span>`;
            html += `<span style="font-weight: ${fontWeight}; text-align: right; font-variant-numeric: tabular-nums;">${formatSmartDecimal(yValue, 2)} ${unit}</span>`;
            html += `</div>`;
          }
        }
      });

      return html;
    },
    [chartData?.bytesUnit, selectedType, selectedPolicy]
  );

  const slotsTooltipFormatter = useCallback(
    (params: unknown): string => {
      const dataPoints = Array.isArray(params) ? params : [params];
      let html = '';

      // Build selected series name for comparison
      const selectedSeriesName = `${TYPE_LABELS[selectedType]} (${POLICY_LABELS_SHORT[selectedPolicy]})`;

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
            const isCurrentState = p.seriesName === 'Current State';
            const isSelected = p.seriesName === selectedSeriesName;
            const opacity = isCurrentState || isSelected ? '1' : '0.4';
            const fontWeight = isCurrentState || isSelected ? '600' : '400';
            html += `<div style="display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 4px; opacity: ${opacity};">`;
            html += `<span style="display: flex; align-items: center; gap: 8px;">${p.marker}<span>${p.seriesName}</span></span>`;
            html += `<span style="font-weight: ${fontWeight}; text-align: right; font-variant-numeric: tabular-nums;">${formatStorageSlotCount(yValue)}</span>`;
            html += `</div>`;
          }
        }
      });

      return html;
    },
    [selectedType, selectedPolicy]
  );

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
            currentBytes={latestData?.effectiveBytes ?? null}
            currentSlots={latestData?.activeSlots ?? null}
            formatBytes={formatBytes}
            formatSlots={formatStorageSlotCount}
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
          {!isLoading && chartData && (
            <div className="grid gap-4 md:grid-cols-2">
              <PopoutCard
                title="Storage Size"
                subtitle="Current vs expiry policy"
                downloadFilename={`contract-storage-size-${address.slice(0, 10)}`}
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
                      name: `Size (${chartData.bytesUnit})`,
                      max: chartData.bytesYMax,
                      formatter: (value: number) => value.toFixed(0),
                    }}
                    height={inModal ? 600 : 280}
                    showLegend={false}
                    enableDataZoom={true}
                    tooltipFormatter={bytesTooltipFormatter}
                    syncGroup={inModal ? undefined : 'contract-storage'}
                    onSeriesClick={handleSeriesClick}
                    markLines={resurrectionMarkLines}
                  />
                )}
              </PopoutCard>

              <PopoutCard
                title="Storage Slots"
                subtitle="Current vs expiry policy"
                downloadFilename={`contract-storage-slots-${address.slice(0, 10)}`}
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
                      max: chartData.slotsYMax,
                      formatter: (value: number) => {
                        return value.toFixed(0);
                      },
                    }}
                    height={inModal ? 600 : 280}
                    showLegend={false}
                    enableDataZoom={true}
                    tooltipFormatter={slotsTooltipFormatter}
                    syncGroup={inModal ? undefined : 'contract-storage'}
                    onSeriesClick={handleSeriesClick}
                    markLines={resurrectionMarkLines}
                  />
                )}
              </PopoutCard>
            </div>
          )}
        </div>
      )}
    </Container>
  );
}
