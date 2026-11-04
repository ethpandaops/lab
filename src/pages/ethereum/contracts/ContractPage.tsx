import { type JSX, useMemo, useCallback, useState } from 'react';
import { useParams } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { CubeIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { dimContractOwnerServiceListOptions } from '@/api/@tanstack/react-query.gen';
import { Container } from '@/components/Layout/Container';
import { Alert } from '@/components/Feedback/Alert';
import { Card } from '@/components/Layout/Card';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { MultiLineChart, type MarkLineConfig } from '@/components/Charts/MultiLine';
import { PolicySelector, type PolicySelectorConfig } from '@/pages/ethereum/execution/state-expiry/components';
import type { PolicyData } from '@/pages/ethereum/execution/state-expiry/components/PolicySelector';
import { formatSmartDecimal, hexToRgba } from '@/utils';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getDataVizColors } from '@/utils/dataVizColors';
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

const { DATA_COLORS } = getDataVizColors();

/** Colors for expiry types */
const TYPE_COLORS: Record<ExpiryType, string> = {
  slot: DATA_COLORS.blue,
  contract: DATA_COLORS.violet,
};

/** Configuration for the PolicySelector component */
const POLICY_SELECTOR_CONFIG: PolicySelectorConfig<ExpiryType, ExpiryPolicy> = {
  types: EXPIRY_TYPES,
  policies: EXPIRY_POLICIES,
  typeConfig: {
    slot: {
      label: 'Slot',
      icon: CubeIcon,
      textColor: 'text-data-blue',
      selectedBg: 'bg-data-blue/25',
      selectedRing: 'ring-data-blue',
      hoverBg: 'hover:bg-data-blue/20 dark:hover:bg-data-blue/25',
      rowHoverBg: 'bg-data-blue/10 dark:bg-data-blue/15',
      cellBg: 'bg-data-blue/10',
      fillColor: 'bg-data-blue/30 dark:bg-data-blue/25',
    },
    contract: {
      label: 'Contract',
      icon: DocumentTextIcon,
      textColor: 'text-data-violet',
      selectedBg: 'bg-data-violet/25',
      selectedRing: 'ring-data-violet',
      hoverBg: 'hover:bg-data-violet/20 dark:hover:bg-data-violet/25',
      rowHoverBg: 'bg-data-violet/10 dark:bg-data-violet/15',
      cellBg: 'bg-data-violet/10',
      fillColor: 'bg-data-violet/30 dark:bg-data-violet/25',
    },
  },
  policyConfig: {
    '12m': {
      shortLabel: '1y',
      fullLabel: '1 year',
      tooltip: 'Storage expires after 1 year of inactivity.',
    },
    '24m': {
      shortLabel: '2y',
      fullLabel: '2 years',
      tooltip: 'Storage expires after 2 years of inactivity.',
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
 * Format bytes to human-readable binary units (KiB, MiB, GiB)
 */
function formatBytes(bytes: number): string {
  const gib = bytes / (1024 * 1024 * 1024);
  if (gib >= 1) {
    return `${gib.toFixed(2)} GiB`;
  }
  const mib = bytes / (1024 * 1024);
  if (mib >= 1) {
    return `${mib.toFixed(2)} MiB`;
  }
  const kib = bytes / 1024;
  return `${kib.toFixed(2)} KiB`;
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

  // Savings for each policy cell, comparing the base and policy values of the same day: the latest
  // day that has that policy's data. A cell older than the current state shows its own date.
  const savingsData = useMemo(() => {
    const empty = { bytesPercent: null, slotsPercent: null, afterBytes: null, afterSlots: null, asOf: null };
    const result: Record<ExpiryType, Record<ExpiryPolicy, PolicyData>> = {
      slot: { '12m': { ...empty }, '24m': { ...empty } },
      contract: { '12m': { ...empty }, '24m': { ...empty } },
    };

    if (!data || data.length === 0 || !latestData) return result;

    for (const type of EXPIRY_TYPES) {
      for (const policy of EXPIRY_POLICIES) {
        const policyOf = (p: (typeof data)[number]): { effectiveBytes: number | null; activeSlots: number | null } =>
          type === 'slot' ? p.slotExpiryData[policy] : p.expiryData[policy];
        const point = [...data]
          .reverse()
          .find(p => policyOf(p).effectiveBytes !== null && policyOf(p).activeSlots !== null);
        if (!point || point.effectiveBytes === null || point.activeSlots === null) continue;
        const baseBytes = point.effectiveBytes;
        const baseSlots = point.activeSlots;
        const policyData = policyOf(point);
        const afterBytes = policyData.effectiveBytes!;
        const afterSlots = policyData.activeSlots!;

        result[type][policy] = {
          // Contract-based expiry is all-or-nothing for a single contract: it either expires whole or stays
          bytesPercent:
            type === 'contract'
              ? afterBytes === 0
                ? 100
                : 0
              : baseBytes > 0
                ? ((baseBytes - afterBytes) / baseBytes) * 100
                : null,
          slotsPercent:
            type === 'contract'
              ? afterSlots === 0
                ? 100
                : 0
              : baseSlots > 0
                ? ((baseSlots - afterSlots) / baseSlots) * 100
                : null,
          afterBytes,
          afterSlots,
          asOf: point === latestData ? null : point.dateLabel,
        };
      }
    }

    return result;
  }, [data, latestData]);

  // Chart data - show all policies with selected one highlighted
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    // Determine the unit for display based on the max value
    const validBytes = data.map(d => d.effectiveBytes).filter((b): b is number => b !== null);
    const maxBytes = validBytes.length > 0 ? Math.max(...validBytes) : 0;
    const bytesUnit = maxBytes < 1024 * 1024 ? 'KiB' : maxBytes < 1024 * 1024 * 1024 ? 'MiB' : 'GiB';
    const bytesDivisor = bytesUnit === 'KiB' ? 1024 : bytesUnit === 'MiB' ? 1024 * 1024 : 1024 * 1024 * 1024;

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
              if (policyData.effectiveBytes === null) return null;
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
              if (policyData.activeSlots === null) return null;
              return policyData.activeSlots === 0 ? 0 : item.activeSlots;
            }
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
      bytesUnit,
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
          color: DATA_COLORS.emerald,
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
            const unit = chartData?.bytesUnit ?? 'MiB';
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
        <Alert variant="error" className="mt-8" description={`Failed to load contract data: ${error.message}`} />
      ) : (
        <div className="mt-8 space-y-4">
          {/* State Expiry Section Title */}
          <h2 className="text-xl font-semibold text-foreground">State Expiry</h2>

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
                      min: 0,
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
                      min: 0,
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
