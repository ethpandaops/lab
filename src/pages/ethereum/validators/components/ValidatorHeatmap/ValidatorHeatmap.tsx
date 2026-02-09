import type { JSX } from 'react';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import clsx from 'clsx';
import colors from 'tailwindcss/colors';
import { ArrowLeftIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { Card } from '@/components/Layout/Card';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { HeatmapChart } from '@/components/Charts/Heatmap';
import { ButtonGroup } from '@/components/Elements/ButtonGroup';
import { Button } from '@/components/Elements/Button';
import { formatSlot } from '@/utils';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { AttestationDailyDataPoint, BlockProposalDataPoint } from '../../hooks/useValidatorsData.types';
import { useHourlyData, useSlotData } from '../../hooks';
import type { AttestationSlotDataPoint } from '../../hooks';
import { formatStatusLabel } from '../../hooks/useValidatorStatus';

/** Available metrics for the heatmap */
export type HeatmapMetric = 'inclusion' | 'head' | 'target' | 'source' | 'delay' | 'proposals';

/** Shared selection state for heatmap ↔ table sync */
export interface ValidatorSelection {
  /** Which validator row is focused (null = none) */
  validatorIndex: number | null;
  /** Which day is drilled into (Unix seconds, null = daily view) */
  dayTimestamp: number | null;
  /** Which hour is drilled into (Unix seconds, null = hourly or daily view) */
  hourTimestamp: number | null;
}

interface ValidatorHeatmapProps {
  /** Daily attestation data */
  data: AttestationDailyDataPoint[];
  /** Block proposal data points */
  blockProposals?: BlockProposalDataPoint[];
  /** Currently selected metric */
  metric: HeatmapMetric;
  /** Callback when metric changes */
  onMetricChange: (metric: HeatmapMetric) => void;
  /** Start of the selected date range (Unix seconds) */
  from: number;
  /** End of the selected date range (Unix seconds) */
  to: number;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Validator indices for hourly data fetching */
  validatorIndices: number[];
  /** Controlled selection state for heatmap ↔ table sync */
  selection?: ValidatorSelection;
  /** Callback when a cell is clicked (emits full selection including validator + time) */
  onCellSelect?: (selection: ValidatorSelection) => void;
  /** Look up validator status at a given timestamp for NO_DATA tooltip */
  getStatusAtTimestamp?: (validatorIndex: number, timestamp: number) => string | null;
  /** Additional class names */
  className?: string;
}

/** Shape shared by both daily and hourly attestation data points */
interface AttestationDataShape {
  inclusionRate: number;
  headCorrectRate: number;
  targetCorrectRate: number;
  sourceCorrectRate: number;
  avgInclusionDistance: number | null;
}

/** Metric configuration */
interface MetricConfig {
  label: string;
  getValue: (point: AttestationDataShape) => number;
  formatValue: (value: number) => string;
  colorGradient: string[];
  min: number;
  max: number;
  visualMapText: [string, string];
}

/** Metric configurations for daily/hourly (rate-based) views */
const METRIC_CONFIGS: Record<HeatmapMetric, MetricConfig> = {
  inclusion: {
    label: 'Inclusion',
    getValue: point => point.inclusionRate,
    formatValue: value => `${value.toFixed(1)}%`,
    colorGradient: [colors.red[600], colors.orange[500], colors.yellow[400], colors.lime[400], colors.green[500]],
    min: 0,
    max: 100,
    visualMapText: ['100%', '0%'],
  },
  head: {
    label: 'Head',
    getValue: point => point.headCorrectRate,
    formatValue: value => `${value.toFixed(1)}%`,
    colorGradient: [colors.red[600], colors.orange[500], colors.yellow[400], colors.lime[400], colors.green[500]],
    min: 0,
    max: 100,
    visualMapText: ['100%', '0%'],
  },
  target: {
    label: 'Target',
    getValue: point => point.targetCorrectRate,
    formatValue: value => `${value.toFixed(1)}%`,
    colorGradient: [colors.red[600], colors.orange[500], colors.yellow[400], colors.lime[400], colors.green[500]],
    min: 0,
    max: 100,
    visualMapText: ['100%', '0%'],
  },
  source: {
    label: 'Source',
    getValue: point => point.sourceCorrectRate,
    formatValue: value => `${value.toFixed(1)}%`,
    colorGradient: [colors.red[600], colors.orange[500], colors.yellow[400], colors.lime[400], colors.green[500]],
    min: 0,
    max: 100,
    visualMapText: ['100%', '0%'],
  },
  delay: {
    label: 'Delay',
    getValue: point => point.avgInclusionDistance ?? 1,
    formatValue: value => `${value.toFixed(1)} slots`,
    colorGradient: [colors.green[500], colors.lime[400], colors.yellow[400], colors.orange[500], colors.red[600]],
    min: 1,
    max: 4,
    visualMapText: ['4 slots', '1 slot'],
  },
  proposals: {
    label: 'Proposals',
    getValue: () => 0,
    formatValue: (v: number) => (v >= 100 ? 'Canonical' : v >= 50 ? 'Orphaned' : v >= 0 ? 'Missed' : 'No duty'),
    colorGradient: [colors.red[600], colors.amber[500], colors.green[500]],
    min: 0,
    max: 100,
    visualMapText: ['Canonical', 'Missed'],
  },
};

/** Slot-level metric config — maps boolean slot data to 0/100 heatmap values */
const SLOT_METRIC_GETTERS: Record<
  HeatmapMetric,
  {
    getValue: (p: AttestationSlotDataPoint) => number;
    formatValue: (v: number) => string;
  }
> = {
  inclusion: {
    getValue: p => (p.attested ? 100 : 0),
    formatValue: v => (v >= 100 ? 'Attested' : 'Missed'),
  },
  head: {
    getValue: p => (p.headCorrect === true ? 100 : 0),
    formatValue: v => (v >= 100 ? 'Correct' : 'Incorrect'),
  },
  target: {
    getValue: p => (p.targetCorrect === true ? 100 : 0),
    formatValue: v => (v >= 100 ? 'Correct' : 'Incorrect'),
  },
  source: {
    getValue: p => (p.sourceCorrect === true ? 100 : 0),
    formatValue: v => (v >= 100 ? 'Correct' : 'Incorrect'),
  },
  delay: {
    getValue: p => p.inclusionDistance ?? 4,
    formatValue: v => `${v} slot${v !== 1 ? 's' : ''}`,
  },
  proposals: {
    getValue: () => 0,
    formatValue: (v: number) => (v >= 100 ? 'Canonical' : v >= 50 ? 'Orphaned' : v >= 0 ? 'Missed' : 'No duty'),
  },
};

/** Generate hour labels 00:00 through 23:00 */
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

/** Sentinel value for cells with no data (below any valid metric range) */
const NO_DATA = -1;

/** Responsive x-axis label constants */
const GRID_HORIZONTAL_PADDING = 150;
const LABEL_WIDTH_DAILY = 48;
const LABEL_WIDTH_HOURLY = 44;
const LABEL_WIDTH_SLOT = 70;
const NICE_HOURLY_STEPS = [1, 2, 3, 4, 6, 8, 12, 24];

/** Snap to "nice" hourly intervals (every 2h, 3h, 4h, 6h, etc.) */
function computeHourlyInterval(gridWidth: number): number {
  const maxLabels = Math.max(1, Math.floor(gridWidth / LABEL_WIDTH_HOURLY));
  for (const step of NICE_HOURLY_STEPS) {
    if (Math.ceil(24 / step) <= maxLabels) return step - 1;
  }
  return 23;
}

/**
 * Fill missing grid cells with a sentinel value so they render as empty-colored cells
 */
function fillGridGaps(data: [number, number, number][], xCount: number, yCount: number): [number, number, number][] {
  const existing = new Set(data.map(([x, y]) => `${x},${y}`));
  const filled = [...data];
  for (let x = 0; x < xCount; x++) {
    for (let y = 0; y < yCount; y++) {
      if (!existing.has(`${x},${y}`)) {
        filled.push([x, y, NO_DATA]);
      }
    }
  }
  return filled;
}

/**
 * Format timestamp as day label
 */
function formatDayLabel(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format timestamp as full date label for the drill-down header
 */
function formatFullDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format hour timestamp as HH:00 UTC
 */
function formatHourLabel(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  return `${String(date.getUTCHours()).padStart(2, '0')}:00 UTC`;
}

/**
 * Heatmap visualization showing daily performance across multiple validators.
 * Supports drill-down from daily to hourly to slot-level granularity.
 */
export function ValidatorHeatmap({
  data,
  blockProposals = [],
  metric,
  onMetricChange,
  from,
  to,
  isLoading = false,
  validatorIndices: validatorIndicesProp,
  selection,
  onCellSelect,
  getStatusAtTimestamp,
  className,
}: ValidatorHeatmapProps): JSX.Element {
  const config = METRIC_CONFIGS[metric];
  const slotConfig = SLOT_METRIC_GETTERS[metric];
  const themeColors = useThemeColors();
  const emptyColor = themeColors.border;
  const [internalDay, setInternalDay] = useState<number | null>(null);
  const [internalHour, setInternalHour] = useState<number | null>(null);

  // Controlled/uncontrolled: use selection prop when provided, otherwise internal state
  const drillDownDay = selection ? selection.dayTimestamp : internalDay;
  const drillDownHour = selection ? selection.hourTimestamp : internalHour;

  const setDrillDownDay = useCallback(
    (day: number | null) => {
      if (selection) return; // controlled by parent
      setInternalDay(day);
    },
    [selection]
  );

  const setDrillDownHour = useCallback(
    (hour: number | null) => {
      if (selection) return; // controlled by parent
      setInternalHour(hour);
    },
    [selection]
  );

  // Measure container width for responsive x-axis intervals
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(entries => {
      const entry = entries[0];
      if (entry) setContainerWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [drillDownDay, drillDownHour]);

  // Fetch hourly data when drilled down to a day
  const { attestationHourly, isLoading: isHourlyLoading } = useHourlyData(validatorIndicesProp, drillDownDay);

  // Fetch slot data when drilled down to an hour
  const { attestationSlot, isLoading: isSlotLoading } = useSlotData(validatorIndicesProp, drillDownHour);

  // Transform daily data into heatmap format
  const { heatmapData, xLabels, yLabels, timestamps, validatorIndices } = useMemo(() => {
    const allTimestamps: number[] = [];
    const startDate = new Date(from * 1000);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(to * 1000);
    endDate.setUTCHours(0, 0, 0, 0);
    const current = new Date(startDate);
    while (current <= endDate) {
      allTimestamps.push(Math.floor(current.getTime() / 1000));
      current.setUTCDate(current.getUTCDate() + 1);
    }

    // Include all validators from both data and the input prop
    const uniqueValidators = [...new Set([...data.map(d => d.validatorIndex), ...validatorIndicesProp])].sort(
      (a, b) => a - b
    );
    const dayLabels = allTimestamps.map(t => formatDayLabel(t));
    const validatorLabels = uniqueValidators.map(v => formatSlot(v));

    const timestampToIndex = new Map(allTimestamps.map((t, i) => [t, i]));
    const validatorToIndex = new Map(uniqueValidators.map((v, i) => [v, i]));

    const chartData: [number, number, number][] = data
      .filter(point => timestampToIndex.has(point.timestamp))
      .map(point => {
        const dayIndex = timestampToIndex.get(point.timestamp) ?? 0;
        const validatorIndex = validatorToIndex.get(point.validatorIndex) ?? 0;
        const value = config.getValue(point);
        return [dayIndex, validatorIndex, value];
      });

    return {
      heatmapData: fillGridGaps(chartData, allTimestamps.length, uniqueValidators.length),
      xLabels: dayLabels,
      yLabels: validatorLabels,
      timestamps: allTimestamps,
      validatorIndices: uniqueValidators,
    };
  }, [data, config, from, to, validatorIndicesProp]);

  // Transform hourly data into heatmap format
  const hourlyHeatmap = useMemo(() => {
    if (drillDownDay === null) {
      return {
        data: [] as [number, number, number][],
        yLabels: [] as string[],
        validatorIndices: [] as number[],
      };
    }

    // Include all validators from both hourly data and the input prop
    const uniqueValidators = [
      ...new Set([...attestationHourly.map(d => d.validatorIndex), ...validatorIndicesProp]),
    ].sort((a, b) => a - b);
    const validatorLabels = uniqueValidators.map(v => formatSlot(v));
    const validatorToIndex = new Map(uniqueValidators.map((v, i) => [v, i]));

    const chartData: [number, number, number][] = attestationHourly.map(point => {
      const hourIndex = new Date(point.timestamp * 1000).getUTCHours();
      const valIdx = validatorToIndex.get(point.validatorIndex) ?? 0;
      const value = config.getValue(point);
      return [hourIndex, valIdx, value];
    });

    return {
      data: fillGridGaps(chartData, 24, uniqueValidators.length),
      yLabels: validatorLabels,
      validatorIndices: uniqueValidators,
    };
  }, [attestationHourly, drillDownDay, config, validatorIndicesProp]);

  // Transform slot data into heatmap format
  const slotHeatmap = useMemo(() => {
    if (attestationSlot.length === 0 || drillDownHour === null) {
      return {
        data: [] as [number, number, number][],
        xLabels: [] as string[],
        yLabels: [] as string[],
        validatorIndices: [] as number[],
        slots: [] as number[],
      };
    }

    const dataSlots = [...new Set(attestationSlot.map(d => d.slot))].sort((a, b) => a - b);
    const minSlot = dataSlots[0];
    const maxSlot = dataSlots[dataSlots.length - 1];
    const allSlots: number[] = [];
    for (let s = minSlot; s <= maxSlot; s++) {
      allSlots.push(s);
    }

    const uniqueValidators = [...new Set(attestationSlot.map(d => d.validatorIndex))].sort((a, b) => a - b);

    const slotLabels = allSlots.map(s => formatSlot(s));
    const validatorLabels = uniqueValidators.map(v => formatSlot(v));

    const slotToIndex = new Map(allSlots.map((s, i) => [s, i]));
    const validatorToIndex = new Map(uniqueValidators.map((v, i) => [v, i]));

    const chartData: [number, number, number][] = attestationSlot.map(point => {
      const slotIdx = slotToIndex.get(point.slot) ?? 0;
      const valIdx = validatorToIndex.get(point.validatorIndex) ?? 0;
      const value = slotConfig.getValue(point);
      return [slotIdx, valIdx, value];
    });

    return {
      data: fillGridGaps(chartData, allSlots.length, uniqueValidators.length),
      xLabels: slotLabels,
      yLabels: validatorLabels,
      validatorIndices: uniqueValidators,
      slots: allSlots,
    };
  }, [attestationSlot, drillDownHour, slotConfig]);

  // Build proposal heatmap data (daily view) when metric is 'proposals'
  const proposalHeatmap = useMemo(() => {
    if (metric !== 'proposals' || blockProposals.length === 0) {
      return {
        data: [] as [number, number, number][],
        xLabels: [] as string[],
        yLabels: [] as string[],
        timestamps: [] as number[],
        validatorIndices: [] as number[],
      };
    }

    // Build day labels spanning from→to
    const allTimestamps: number[] = [];
    const startDate = new Date(from * 1000);
    startDate.setUTCHours(0, 0, 0, 0);
    const endDate = new Date(to * 1000);
    endDate.setUTCHours(0, 0, 0, 0);
    const current = new Date(startDate);
    while (current <= endDate) {
      allTimestamps.push(Math.floor(current.getTime() / 1000));
      current.setUTCDate(current.getUTCDate() + 1);
    }

    // Only include validators the user queried — the API may return extra validators from the same service
    const inputSet = new Set(validatorIndicesProp);
    const attestationValidators = [...new Set(data.map(d => d.validatorIndex))];
    const allValidators = [...new Set([...attestationValidators, ...inputSet])].sort((a, b) => a - b);

    const dayLabels = allTimestamps.map(t => formatDayLabel(t));
    const validatorLabels = allValidators.map(v => formatSlot(v));

    const timestampToIndex = new Map(allTimestamps.map((t, i) => [t, i]));
    const validatorToIndex = new Map(allValidators.map((v, i) => [v, i]));

    // Group proposals by (day, validator), taking worst status
    const cellMap = new Map<string, number>();
    for (const p of blockProposals) {
      const dayTs = Math.floor(new Date(p.slotTimestamp * 1000).setUTCHours(0, 0, 0, 0) / 1000);
      const dayIdx = timestampToIndex.get(dayTs);
      const valIdx = validatorToIndex.get(p.validatorIndex);
      if (dayIdx === undefined || valIdx === undefined) continue;

      const key = `${dayIdx},${valIdx}`;
      const statusValue = p.status === 'missed' ? 0 : p.status === 'orphaned' ? 50 : 100;
      const existing = cellMap.get(key);
      // Worst status wins: lower value = worse
      if (existing === undefined || statusValue < existing) {
        cellMap.set(key, statusValue);
      }
    }

    const chartData: [number, number, number][] = Array.from(cellMap.entries()).map(([key, value]) => {
      const [x, y] = key.split(',').map(Number);
      return [x, y, value];
    });

    return {
      data: fillGridGaps(chartData, allTimestamps.length, allValidators.length),
      xLabels: dayLabels,
      yLabels: validatorLabels,
      timestamps: allTimestamps,
      validatorIndices: allValidators,
    };
  }, [metric, blockProposals, from, to, data, validatorIndicesProp]);

  // Build proposal hourly heatmap data — filter blockProposals by selected day, group by hour
  const proposalHourlyHeatmap = useMemo(() => {
    if (metric !== 'proposals' || blockProposals.length === 0 || drillDownDay === null) {
      return {
        data: [] as [number, number, number][],
        yLabels: [] as string[],
        validatorIndices: [] as number[],
      };
    }

    const dayStart = drillDownDay;
    const dayEnd = dayStart + 86400;

    // Use the same validator set as the daily proposal heatmap for consistency
    const allValidators = proposalHeatmap.validatorIndices;
    const validatorLabels = allValidators.map(v => formatSlot(v));
    const validatorToIndex = new Map(allValidators.map((v, i) => [v, i]));

    // Filter proposals for the selected day
    const dayProposals = blockProposals.filter(p => p.slotTimestamp >= dayStart && p.slotTimestamp < dayEnd);

    // Group by (hour, validator), worst status wins
    const cellMap = new Map<string, number>();
    for (const p of dayProposals) {
      const hour = new Date(p.slotTimestamp * 1000).getUTCHours();
      const valIdx = validatorToIndex.get(p.validatorIndex);
      if (valIdx === undefined) continue;

      const key = `${hour},${valIdx}`;
      const statusValue = p.status === 'missed' ? 0 : p.status === 'orphaned' ? 50 : 100;
      const existing = cellMap.get(key);
      if (existing === undefined || statusValue < existing) {
        cellMap.set(key, statusValue);
      }
    }

    const chartData: [number, number, number][] = Array.from(cellMap.entries()).map(([key, value]) => {
      const [x, y] = key.split(',').map(Number);
      return [x, y, value];
    });

    return {
      data: fillGridGaps(chartData, 24, allValidators.length),
      yLabels: validatorLabels,
      validatorIndices: allValidators,
    };
  }, [metric, blockProposals, drillDownDay, proposalHeatmap.validatorIndices]);

  // Build proposal slot heatmap data — filter blockProposals by selected hour
  const proposalSlotHeatmap = useMemo(() => {
    if (metric !== 'proposals' || blockProposals.length === 0 || drillDownHour === null) {
      return {
        data: [] as [number, number, number][],
        xLabels: [] as string[],
        yLabels: [] as string[],
        validatorIndices: [] as number[],
        slots: [] as number[],
      };
    }

    const hourStart = drillDownHour;
    const hourEnd = hourStart + 3600;

    // Use the same validator set as daily for consistency
    const allValidators = proposalHeatmap.validatorIndices;
    const validatorLabels = allValidators.map(v => formatSlot(v));
    const validatorToIndex = new Map(allValidators.map((v, i) => [v, i]));

    // Filter proposals for the selected hour
    const hourProposals = blockProposals.filter(p => p.slotTimestamp >= hourStart && p.slotTimestamp < hourEnd);

    // Use attestation slot range so columns match other metrics; fall back to proposal-derived range
    let allSlots: number[];
    if (slotHeatmap.slots.length > 0) {
      allSlots = slotHeatmap.slots;
    } else if (hourProposals.length > 0) {
      const dataSlots = [...new Set(hourProposals.map(p => p.slot))].sort((a, b) => a - b);
      const minSlot = dataSlots[0];
      const maxSlot = dataSlots[dataSlots.length - 1];
      allSlots = [];
      for (let s = minSlot; s <= maxSlot; s++) {
        allSlots.push(s);
      }
    } else {
      return {
        data: [] as [number, number, number][],
        xLabels: [] as string[],
        yLabels: validatorLabels,
        validatorIndices: allValidators,
        slots: [] as number[],
      };
    }

    const slotLabels = allSlots.map(s => formatSlot(s));
    const slotToIndex = new Map(allSlots.map((s, i) => [s, i]));

    const chartData: [number, number, number][] = hourProposals
      .filter(p => slotToIndex.has(p.slot) && validatorToIndex.has(p.validatorIndex))
      .map(p => {
        const slotIdx = slotToIndex.get(p.slot)!;
        const valIdx = validatorToIndex.get(p.validatorIndex)!;
        const statusValue = p.status === 'missed' ? 0 : p.status === 'orphaned' ? 50 : 100;
        return [slotIdx, valIdx, statusValue];
      });

    return {
      data: fillGridGaps(chartData, allSlots.length, allValidators.length),
      xLabels: slotLabels,
      yLabels: validatorLabels,
      validatorIndices: allValidators,
      slots: allSlots,
    };
  }, [metric, blockProposals, drillDownHour, proposalHeatmap.validatorIndices, slotHeatmap.slots]);

  // Resolve daily data based on metric (proposals uses its own dataset)
  const isProposalsMetric = metric === 'proposals';
  const activeDailyData = isProposalsMetric ? proposalHeatmap.data : heatmapData;
  const activeDailyXLabels = isProposalsMetric ? proposalHeatmap.xLabels : xLabels;
  const activeDailyYLabels = isProposalsMetric ? proposalHeatmap.yLabels : yLabels;
  const activeDailyTimestamps = isProposalsMetric ? proposalHeatmap.timestamps : timestamps;
  const activeDailyValidators = isProposalsMetric ? proposalHeatmap.validatorIndices : validatorIndices;

  // Compute responsive x-axis intervals based on container width
  const gridWidth = Math.max(0, containerWidth - GRID_HORIZONTAL_PADDING);

  const dailyXAxisInterval = useMemo(() => {
    if (gridWidth <= 0 || activeDailyXLabels.length === 0) return 0;
    const maxLabels = Math.max(1, Math.floor(gridWidth / LABEL_WIDTH_DAILY));
    return activeDailyXLabels.length <= maxLabels ? 0 : Math.ceil(activeDailyXLabels.length / maxLabels) - 1;
  }, [gridWidth, activeDailyXLabels.length]);

  const hourlyXAxisInterval = useMemo(() => {
    if (gridWidth <= 0) return 0;
    return computeHourlyInterval(gridWidth);
  }, [gridWidth]);

  const slotXAxisInterval = useMemo(() => {
    const activeSlotXLabels = isProposalsMetric ? proposalSlotHeatmap.xLabels : slotHeatmap.xLabels;
    const count = activeSlotXLabels.length;
    if (gridWidth <= 0 || count === 0) {
      return (index: number) => index === 0 || index === count - 1 || index % 20 === 0;
    }
    const maxLabels = Math.max(2, Math.floor(gridWidth / LABEL_WIDTH_SLOT));
    const modulo = Math.max(1, Math.ceil(count / maxLabels));
    const lastIndex = count - 1;
    return (index: number) => index === 0 || index === lastIndex || index % modulo === 0;
  }, [gridWidth, slotHeatmap.xLabels, proposalSlotHeatmap.xLabels, isProposalsMetric]);

  // Click handler for daily heatmap cells
  const handleCellClick = useCallback(
    (params: Record<string, unknown>) => {
      const value = params.value as [number, number, number];
      const dayTs = activeDailyTimestamps[value[0]];
      const valIdx = activeDailyValidators[value[1]];
      if (dayTs === undefined) return;
      if (onCellSelect) {
        onCellSelect({ validatorIndex: valIdx ?? null, dayTimestamp: dayTs, hourTimestamp: null });
      } else {
        setDrillDownDay(dayTs);
      }
    },
    [activeDailyTimestamps, activeDailyValidators, onCellSelect, setDrillDownDay]
  );

  // Click handler for hourly heatmap cells
  const handleHourlyCellClick = useCallback(
    (params: Record<string, unknown>) => {
      const value = params.value as [number, number, number];
      const hourIndex = value[0]; // 0-23
      if (drillDownDay === null) return;
      const hourTs = drillDownDay + hourIndex * 3600;
      const activeHourlyValidators = isProposalsMetric
        ? proposalHourlyHeatmap.validatorIndices
        : hourlyHeatmap.validatorIndices;
      const valIdx = activeHourlyValidators[value[1]];
      if (onCellSelect) {
        onCellSelect({ validatorIndex: valIdx ?? null, dayTimestamp: drillDownDay, hourTimestamp: hourTs });
      } else {
        setDrillDownHour(hourTs);
      }
    },
    [
      drillDownDay,
      hourlyHeatmap.validatorIndices,
      proposalHourlyHeatmap.validatorIndices,
      isProposalsMetric,
      onCellSelect,
      setDrillDownHour,
    ]
  );

  const handleBackToDaily = useCallback(() => {
    if (onCellSelect) {
      onCellSelect({ validatorIndex: selection?.validatorIndex ?? null, dayTimestamp: null, hourTimestamp: null });
    } else {
      setDrillDownDay(null);
      setDrillDownHour(null);
    }
  }, [onCellSelect, selection?.validatorIndex, setDrillDownDay, setDrillDownHour]);

  const handleBackToHourly = useCallback(() => {
    if (onCellSelect) {
      onCellSelect({
        validatorIndex: selection?.validatorIndex ?? null,
        dayTimestamp: drillDownDay,
        hourTimestamp: null,
      });
    } else {
      setDrillDownHour(null);
    }
  }, [onCellSelect, selection?.validatorIndex, drillDownDay, setDrillDownHour]);

  // Click handler for slot-level heatmap cells — switches highlighted validator
  const handleSlotCellClick = useCallback(
    (params: Record<string, unknown>) => {
      const value = params.value as [number, number, number];
      const activeSlotValidators = isProposalsMetric
        ? proposalSlotHeatmap.validatorIndices
        : slotHeatmap.validatorIndices;
      const valIdx = activeSlotValidators[value[1]];
      if (onCellSelect && valIdx !== undefined) {
        onCellSelect({
          validatorIndex: valIdx,
          dayTimestamp: drillDownDay,
          hourTimestamp: drillDownHour,
        });
      }
    },
    [
      slotHeatmap.validatorIndices,
      proposalSlotHeatmap.validatorIndices,
      isProposalsMetric,
      onCellSelect,
      drillDownDay,
      drillDownHour,
    ]
  );

  // Compute highlighted row index from selection.validatorIndex for each view
  const dailyHighlightedRow =
    selection?.validatorIndex != null ? activeDailyValidators.indexOf(selection.validatorIndex) : -1;
  const activeHourlyValidatorsForHighlight = isProposalsMetric
    ? proposalHourlyHeatmap.validatorIndices
    : hourlyHeatmap.validatorIndices;
  const hourlyHighlightedRow =
    selection?.validatorIndex != null ? activeHourlyValidatorsForHighlight.indexOf(selection.validatorIndex) : -1;
  const activeSlotValidatorsForHighlight = isProposalsMetric
    ? proposalSlotHeatmap.validatorIndices
    : slotHeatmap.validatorIndices;
  const slotHighlightedRow =
    selection?.validatorIndex != null ? activeSlotValidatorsForHighlight.indexOf(selection.validatorIndex) : -1;

  // Calculate dynamic height based on number of validators — 20px per row + 100px for axes/labels
  const ROW_HEIGHT = 20;
  const CHART_PADDING = 100;
  const expectedRows = validatorIndicesProp.length;
  const activeHourlyYLabels = isProposalsMetric ? proposalHourlyHeatmap.yLabels : hourlyHeatmap.yLabels;
  const activeSlotYLabels = isProposalsMetric ? proposalSlotHeatmap.yLabels : slotHeatmap.yLabels;
  const dailyChartHeight = Math.max(200, activeDailyYLabels.length * ROW_HEIGHT + CHART_PADDING);
  const hourlyChartHeight = Math.max(200, (activeHourlyYLabels.length || expectedRows) * ROW_HEIGHT + CHART_PADDING);
  const slotChartHeight = Math.max(200, (activeSlotYLabels.length || expectedRows) * ROW_HEIGHT + CHART_PADDING);

  /** Skeleton loader that mimics the heatmap grid layout during drill-down loading.
   *  Padding matches ECharts grid defaults: top=16, right=90, bottom=50, left=60. */
  const HeatmapSkeleton = ({ rows, height }: { rows: number; height: number }): JSX.Element => (
    <div className="relative" style={{ height }}>
      {/* Y-axis label placeholders */}
      <div className="absolute flex flex-col justify-evenly" style={{ top: 16, bottom: 50, left: 8, width: 48 }}>
        {Array.from({ length: rows }, (_, i) => (
          <LoadingContainer key={i} className="h-3 w-full rounded-xs" shimmer={false} />
        ))}
      </div>
      {/* Grid row shimmer bars */}
      <div className="absolute flex flex-col justify-evenly gap-1" style={{ top: 16, right: 90, bottom: 50, left: 60 }}>
        {Array.from({ length: rows }, (_, i) => (
          <LoadingContainer key={i} className="h-5 w-full rounded-xs" />
        ))}
      </div>
      {/* X-axis placeholder */}
      <div className="absolute" style={{ left: 60, right: 90, bottom: 24 }}>
        <LoadingContainer className="h-2 w-full rounded-xs" shimmer={false} />
      </div>
      {/* Visual map placeholder */}
      <div className="absolute" style={{ right: 24, top: '25%', bottom: '25%', width: 16 }}>
        <LoadingContainer className="h-full w-full rounded-xs" shimmer={false} />
      </div>
    </div>
  );

  // Daily tooltip formatter
  const dailyTooltipFormatter = (params: { value: [number, number, number] }): string => {
    const [dayIdx, validatorIdx, value] = params.value;
    const timestamp = activeDailyTimestamps[dayIdx];
    const validatorIndex = activeDailyValidators[validatorIdx];
    const date = new Date(timestamp * 1000);
    const fullDate = date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    if (value === NO_DATA) {
      const label = isProposalsMetric ? 'No duty' : 'No data';
      let statusLine = '';
      if (getStatusAtTimestamp) {
        const status = getStatusAtTimestamp(validatorIndex, timestamp);
        statusLine = `<br/>Status: ${formatStatusLabel(status)}`;
      }
      return `<strong>Validator ${formatSlot(validatorIndex)}</strong><br/>${fullDate}<br/><span style="opacity:0.5">${label}</span>${statusLine}`;
    }
    return `<strong>Validator ${formatSlot(validatorIndex)}</strong><br/>${fullDate}<br/>${config.label}: ${config.formatValue(value)}`;
  };

  // Hourly tooltip formatter
  const hourlyTooltipFormatter = (params: { value: [number, number, number] }): string => {
    const [hourIdx, validatorIdx, value] = params.value;
    const validators = isProposalsMetric ? proposalHourlyHeatmap.validatorIndices : hourlyHeatmap.validatorIndices;
    const validatorIndex = validators[validatorIdx];
    if (value === NO_DATA) {
      const label = isProposalsMetric ? 'No duty' : 'No data';
      let statusLine = '';
      if (getStatusAtTimestamp && drillDownDay !== null) {
        const hourTs = drillDownDay + hourIdx * 3600;
        const status = getStatusAtTimestamp(validatorIndex, hourTs);
        statusLine = `<br/>Status: ${formatStatusLabel(status)}`;
      }
      return `<strong>Validator ${formatSlot(validatorIndex)}</strong><br/>${HOUR_LABELS[hourIdx]} UTC<br/><span style="opacity:0.5">${label}</span>${statusLine}`;
    }
    return `<strong>Validator ${formatSlot(validatorIndex)}</strong><br/>${HOUR_LABELS[hourIdx]} UTC<br/>${config.label}: ${config.formatValue(value)}`;
  };

  // Slot tooltip formatter
  const slotTooltipFormatter = (params: { value: [number, number, number] }): string => {
    const [slotIdx, validatorIdx, value] = params.value;
    const slotValidators = isProposalsMetric ? proposalSlotHeatmap.validatorIndices : slotHeatmap.validatorIndices;
    const slotSlots = isProposalsMetric ? proposalSlotHeatmap.slots : slotHeatmap.slots;
    const validatorIndex = slotValidators[validatorIdx];
    const slot = slotSlots[slotIdx];
    if (value === NO_DATA) {
      const label = isProposalsMetric ? 'No duty' : 'No data';
      return `<strong>Validator ${formatSlot(validatorIndex)}</strong><br/>Slot ${formatSlot(slot)}<br/><span style="opacity:0.5">${label}</span>`;
    }
    const valueText = isProposalsMetric ? config.formatValue(value) : slotConfig.formatValue(value);
    return `<strong>Validator ${formatSlot(validatorIndex)}</strong><br/>Slot ${formatSlot(slot)}<br/>${config.label}: ${valueText}`;
  };

  /** Metric toggle buttons shared across all views */
  const metricToggle = (
    <div className="mb-4 flex flex-wrap items-center gap-4">
      <span className="text-sm font-medium text-muted">Metric:</span>
      <ButtonGroup rounded>
        {(Object.keys(METRIC_CONFIGS) as HeatmapMetric[]).map(m => (
          <Button key={m} variant={metric === m ? 'primary' : 'secondary'} size="xs" onClick={() => onMetricChange(m)}>
            {METRIC_CONFIGS[m].label}
          </Button>
        ))}
      </ButtonGroup>
    </div>
  );

  if (isLoading) {
    return (
      <Card className={clsx('p-4', className)}>
        <div className="mb-4 h-8 w-48 animate-pulse rounded-xs bg-muted/20" />
        <div className="h-64 animate-pulse rounded-xs bg-muted/10" />
      </Card>
    );
  }

  if (data.length === 0 && blockProposals.length === 0 && validatorIndicesProp.length === 0) {
    return (
      <Card className={clsx('p-4', className)}>
        <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xs border border-dashed border-border/50">
          <ChartBarIcon className="size-8 text-muted/40" />
          <p className="text-sm text-muted">No daily data available for heatmap visualization.</p>
        </div>
      </Card>
    );
  }

  // Slot-level drill-down view
  if (drillDownHour !== null) {
    return (
      <Card className={clsx('p-4', className)}>
        <div ref={containerRef}>
          <div className="mb-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleBackToHourly}
              className="flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              <ArrowLeftIcon className="size-4" />
              Back to hourly view
            </button>
            <span className="text-sm text-muted">
              {formatFullDate(drillDownDay!)} &middot; {formatHourLabel(drillDownHour)}
            </span>
          </div>

          {metricToggle}

          {(() => {
            const activeSlotData = isProposalsMetric ? proposalSlotHeatmap : slotHeatmap;
            const isSlotEmpty = activeSlotData.data.length === 0;
            const showSkeleton = !isProposalsMetric && isSlotLoading;

            if (showSkeleton) {
              return <HeatmapSkeleton rows={validatorIndicesProp.length} height={slotChartHeight} />;
            }
            if (isSlotEmpty) {
              return (
                <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xs border border-dashed border-border/50">
                  <ChartBarIcon className="size-8 text-muted/40" />
                  <p className="text-sm text-muted">
                    {isProposalsMetric ? 'No block proposals for this hour.' : 'No slot data available for this hour.'}
                  </p>
                </div>
              );
            }
            return (
              <HeatmapChart
                key={`slot-${metric}`}
                data={activeSlotData.data}
                xLabels={activeSlotData.xLabels}
                yLabels={activeSlotData.yLabels}
                height={slotChartHeight}
                min={config.min}
                max={config.max}
                colorGradient={config.colorGradient}
                formatValue={isProposalsMetric ? config.formatValue : slotConfig.formatValue}
                tooltipFormatter={slotTooltipFormatter}
                visualMapText={config.visualMapText}
                xAxisTitle="Slot"
                yAxisTitle="Validator"
                xAxisInterval={slotXAxisInterval}
                showCellBorders
                emphasisDisabled={false}
                emptyColor={emptyColor}
                highlightedRow={slotHighlightedRow}
                yAxisInverse
                onEvents={{ click: handleSlotCellClick }}
              />
            );
          })()}
        </div>
      </Card>
    );
  }

  // Hourly drill-down view
  if (drillDownDay !== null) {
    return (
      <Card className={clsx('p-4', className)}>
        <div ref={containerRef}>
          <div className="mb-4 flex items-center gap-3">
            <button
              type="button"
              onClick={handleBackToDaily}
              className="flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              <ArrowLeftIcon className="size-4" />
              Back to daily view
            </button>
            <span className="text-sm text-muted">
              {formatFullDate(drillDownDay)} &middot; Select a cell to explore slot details
            </span>
          </div>

          {metricToggle}

          {(() => {
            const activeHourlyData = isProposalsMetric ? proposalHourlyHeatmap : hourlyHeatmap;
            const isHourlyEmpty = activeHourlyData.data.length === 0;
            const showSkeleton = !isProposalsMetric && isHourlyLoading;

            if (showSkeleton) {
              return <HeatmapSkeleton rows={validatorIndicesProp.length} height={hourlyChartHeight} />;
            }
            if (isHourlyEmpty) {
              return (
                <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xs border border-dashed border-border/50">
                  <ChartBarIcon className="size-8 text-muted/40" />
                  <p className="text-sm text-muted">
                    {isProposalsMetric ? 'No block proposals for this day.' : 'No hourly data available for this day.'}
                  </p>
                </div>
              );
            }
            return (
              <HeatmapChart
                key={`hourly-${metric}`}
                data={activeHourlyData.data}
                xLabels={HOUR_LABELS}
                yLabels={activeHourlyData.yLabels}
                height={hourlyChartHeight}
                min={config.min}
                max={config.max}
                colorGradient={config.colorGradient}
                formatValue={config.formatValue}
                tooltipFormatter={hourlyTooltipFormatter}
                visualMapText={config.visualMapText}
                xAxisTitle="Hour (UTC)"
                yAxisTitle="Validator"
                showCellBorders
                emphasisDisabled={false}
                xAxisInterval={hourlyXAxisInterval}
                xAxisLabelRotate={0}
                emptyColor={emptyColor}
                highlightedRow={hourlyHighlightedRow}
                yAxisInverse
                onEvents={{ click: handleHourlyCellClick }}
              />
            );
          })()}
        </div>
      </Card>
    );
  }

  // Daily view (default)
  return (
    <Card className={clsx('p-4', className)}>
      <div ref={containerRef}>
        <div className="mb-4 flex items-center gap-3">
          <span className="text-sm text-muted">Select a cell to explore hourly breakdown</span>
        </div>

        {metricToggle}

        {activeDailyData.length === 0 ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-xs border border-dashed border-border/50">
            <ChartBarIcon className="size-8 text-muted/40" />
            <p className="text-sm text-muted">
              {isProposalsMetric
                ? 'No block proposals in this period.'
                : 'No daily data available for heatmap visualization.'}
            </p>
          </div>
        ) : (
          <HeatmapChart
            key={`daily-${metric}`}
            data={activeDailyData}
            xLabels={activeDailyXLabels}
            yLabels={activeDailyYLabels}
            height={dailyChartHeight}
            min={config.min}
            max={config.max}
            colorGradient={config.colorGradient}
            formatValue={config.formatValue}
            tooltipFormatter={dailyTooltipFormatter}
            visualMapText={config.visualMapText}
            xAxisTitle="Date"
            yAxisTitle="Validator"
            showCellBorders
            emphasisDisabled={false}
            xAxisInterval={dailyXAxisInterval}
            xAxisLabelRotate={0}
            emptyColor={emptyColor}
            highlightedRow={dailyHighlightedRow}
            yAxisInverse
            onEvents={{ click: handleCellClick }}
          />
        )}
      </div>
    </Card>
  );
}
