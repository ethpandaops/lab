import type React from 'react';
import { useState, useEffect, useRef, useMemo, useCallback, useContext } from 'react';
import type { EChartsInstance } from 'echarts-for-react/lib';
import type ReactEChartsCore from 'echarts-for-react/lib/core';
import ReactEChartsComponent from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart as EChartsLine, BarChart as EChartsBar } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
  DataZoomComponent,
  LegendComponent,
  MarkLineComponent,
  MarkAreaComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { hexToRgba, formatSmartDecimal, getDataVizColors, resolveCssColorToHex } from '@/utils';
import { CHART_FONT_FAMILY } from '@/utils/dataVizColors';
import { useThemeColors } from '@/hooks/useThemeColors';
import { SharedCrosshairsContext } from '@/contexts/SharedCrosshairsContext';
import { Disclosure } from '@/components/Layout/Disclosure';
import type { MultiLineChartProps } from './MultiLine.types';
import { dateCategoryTicks } from './MultiLine.utils';
import { formatAxisNumber } from '../chartChrome';
import { ECHARTS_THEME } from '@/utils/echarts-theme';

/** Maximum number of plain lines that get an end-of-line label */
const MAX_END_LABELS = 8;

/** Last non-null y value of a series, whatever shape its data takes */
function lastValue(data: unknown[]): number | null {
  for (let i = data.length - 1; i >= 0; i--) {
    const point = data[i];
    const y = Array.isArray(point)
      ? point[1]
      : point !== null && typeof point === 'object'
        ? (point as { value?: unknown }).value
        : point;
    const value = Array.isArray(y) ? y[1] : y;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

/** Pixel gap end labels need between them (11px text plus breathing room) */
const END_LABEL_GAP_PX = 18;

/** Legend key drawn like the mark it names: a filled block for areas and bands, a line (dashed when the series is) otherwise */
function LegendSwatch({
  series,
  color,
  active,
}: {
  series: { showArea?: boolean; lineStyle?: string; lineWidth?: number; seriesType?: string };
  color: string;
  active: boolean;
}): React.JSX.Element {
  const block = series.seriesType === 'bar' || (series.showArea && series.lineWidth === 0);
  return block ? (
    <span
      aria-hidden
      className="size-2.5 rounded-xs transition-opacity"
      style={{ backgroundColor: color, opacity: active ? 0.9 : 0.25 }}
    />
  ) : (
    <span
      aria-hidden
      className="w-3 transition-opacity"
      style={{
        borderTop: `2px ${series.lineStyle === 'dotted' ? 'dotted' : series.lineStyle === 'dashed' ? 'dashed' : 'solid'} ${color}`,
        opacity: active ? 1 : 0.3,
      }}
    />
  );
}

/**
 * Label for marks that share one spot: two names read as a pair ("Petersburg · Constantinople");
 * three or more name the first and count the rest, so a column of forks stays one short label
 */
function mergedMarkLabel(names: string[]): string {
  return names.length > 2 ? `${names[0]} +${names.length - 1}` : names.join(' · ');
}

/** `color` laid over `base` at `alpha`, as an opaque hex colour */
function blendHex(color: string, base: string, alpha: number): string {
  const rgb = (hex: string): number[] => {
    const h = hex.replace('#', '');
    const full = h.length === 3 ? h.replace(/./g, c => c + c) : h.slice(0, 6);
    return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16));
  };
  const [a, b] = [rgb(color), rgb(base)];
  if (a.some(Number.isNaN) || b.some(Number.isNaN)) return hexToRgba(color, alpha);
  return `#${a
    .map((v, i) =>
      Math.round(v * alpha + b[i] * (1 - alpha))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`;
}

/** Whether every pair of line ends is far enough apart, on a plot of the given height, for labels */
function endLabelsClear(values: (number | null)[], plotHeight: number, axisMin?: number, axisMax?: number): boolean {
  const ends = values.filter((v): v is number => v !== null).sort((a, b) => a - b);
  if (ends.length < 2) return ends.length > 0;
  const low = axisMin ?? Math.min(0, ends[0]);
  const high = axisMax ?? ends[ends.length - 1];
  const range = high - low || 1;
  const minGap = (END_LABEL_GAP_PX / Math.max(plotHeight, 1)) * range;
  for (let i = 1; i < ends.length; i++) {
    if (ends[i] - ends[i - 1] < minGap) return false;
  }
  return true;
}

/**
 * Value-axis bounds. 'dataMin'/'dataMax' would make ECharts start or end the axis on the raw data
 * value (1.333…, 0.002192), so the first or last tick label is off the grid. Instead they become
 * `scale: true`: the axis may leave out zero, and ECharts rounds the extent to whole intervals.
 */
function valueAxisBounds(
  min: number | 'dataMin' | undefined,
  max: number | 'dataMax' | undefined
): { min?: number; max?: number; scale?: boolean } {
  return {
    min: min === 'dataMin' ? undefined : min,
    max: max === 'dataMax' ? undefined : max,
    scale: min === 'dataMin' || max === 'dataMax' ? true : undefined,
  };
}
/** Narrowest chart (px) that gets end labels */
const END_LABEL_MIN_WIDTH = 480;
/** Minimum horizontal gap (px) between two shown mark-line labels */
const MARK_LABEL_GAP_PX = 16;

// Register ECharts components
echarts.use([
  EChartsLine,
  EChartsBar,
  GridComponent,
  TooltipComponent,
  TitleComponent,
  DataZoomComponent,
  LegendComponent,
  MarkLineComponent,
  MarkAreaComponent,
  CanvasRenderer,
]);

/**
 * MultiLineChart - A flexible multi-series line chart component using ECharts
 *
 * Supports multiple data series with category or value-based x-axis.
 * Perfect for comparing multiple metrics, nodes, or entities over time or across values.
 *
 * @example Single series with category axis
 * ```tsx
 * <MultiLineChart
 *   series={[{
 *     name: 'Sales',
 *     data: [820, 932, 901, 934, 1290],
 *     showArea: true,
 *   }]}
 *   xAxis={{ type: 'category', labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] }}
 *   yAxis={{ name: 'Amount' }}
 *   title="Weekly Sales"
 * />
 * ```
 *
 * @example Multi-series with value axis
 * ```tsx
 * <MultiLineChart
 *   series={[
 *     { name: 'Node 1', data: [[100, 200], [101, 210]], color: '#ff0000', showSymbol: true },
 *     { name: 'Node 2', data: [[100, 180], [101, 190]], color: '#00ff00', showSymbol: true },
 *   ]}
 *   xAxis={{ type: 'value', name: 'Slot', min: 100, max: 200 }}
 *   yAxis={{ name: 'Latency (ms)' }}
 *   showLegend={true}
 *   enableDataZoom={true}
 * />
 * ```
 */
export function MultiLineChart({
  series,
  xAxis,
  yAxis,
  secondaryYAxis,
  title,
  subtitle,
  height: _height = 400,
  showLegend = false,
  legendPosition = 'top',
  useNativeLegend = false,
  showCard = false,
  enableDataZoom = false,
  showDataZoomSlider = true,
  tooltipFormatter,
  tooltipTrigger = 'axis',
  tooltipMode = 'default',
  connectNulls = false,
  animationDuration = 300,
  grid,
  colorPalette,
  enableAggregateToggle = false,
  aggregateSeriesName = 'Average',
  enableSeriesFilter = false,
  relativeSlots,
  syncGroup,
  notMerge = true,
  endLabels = true,
  onSeriesClick,
  markLines,
  markAreas,
  onChartReady: onChartReadyProp,
}: MultiLineChartProps): React.JSX.Element {
  // Store ref to the ReactEChartsCore wrapper (not the instance) for click handling
  const chartWrapperRef = useRef<ReactEChartsCore | null>(null);
  // Store the chart instance for sync cleanup
  const chartInstanceRef = useRef<EChartsInstance | null>(null);
  // Track the chart's width so end labels only render where there is room for them
  const [chartWidth, setChartWidth] = useState(0);
  const isWideEnoughForEndLabels = chartWidth === 0 || chartWidth >= END_LABEL_MIN_WIDTH;
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const measureRef = useCallback((node: HTMLDivElement | null) => {
    resizeObserverRef.current?.disconnect();
    if (!node || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(entries => {
      setChartWidth(Math.round(entries[0]?.contentRect.width ?? 0));
    });
    observer.observe(node);
    resizeObserverRef.current = observer;
  }, []);

  // Store dataZoom state to preserve zoom across data updates and legend toggles
  // Using state (not ref) ensures zoom range is included in the option config
  const [zoomRange, setZoomRange] = useState({ start: 0, end: 100 });

  // Get shared crosshairs context for sync registration
  const crosshairsContext = useContext(SharedCrosshairsContext);

  // Handle chart ready - register for sync when chart is fully initialized
  const handleChartReady = useCallback(
    (instance: EChartsInstance) => {
      const echartsInstance = instance;
      chartInstanceRef.current = echartsInstance;
      if (syncGroup && crosshairsContext) {
        crosshairsContext.registerChart(syncGroup, echartsInstance);
      }
      onChartReadyProp?.(echartsInstance);

      // Track dataZoom changes to preserve zoom state across data updates and legend toggles
      // Using state ensures the zoom range is included in the option config on re-renders
      if (enableDataZoom) {
        const handleDataZoom = (): void => {
          const option = echartsInstance.getOption() as {
            dataZoom?: Array<{ start?: number; end?: number }>;
          };
          const dz = option.dataZoom?.[0];
          if (dz && typeof dz.start === 'number' && typeof dz.end === 'number') {
            const newStart = dz.start;
            const newEnd = dz.end;
            // Only update state if values changed significantly (prevents infinite loops)
            setZoomRange(prev => {
              if (Math.abs(prev.start - newStart) < 0.01 && Math.abs(prev.end - newEnd) < 0.01) {
                return prev; // No change, return same reference
              }
              return { start: newStart, end: newEnd };
            });
          }
        };
        echartsInstance.on('datazoom', handleDataZoom);
      }
    },
    [syncGroup, crosshairsContext, enableDataZoom, onChartReadyProp]
  );

  // Cleanup sync registration on unmount or syncGroup change
  useEffect(() => {
    return () => {
      if (chartInstanceRef.current && syncGroup && crosshairsContext) {
        crosshairsContext.unregisterChart(syncGroup, chartInstanceRef.current);
      }
    };
  }, [syncGroup, crosshairsContext]);

  // Store wrapper ref for click handling
  const chartRef = useCallback((node: ReactEChartsCore | null) => {
    chartWrapperRef.current = node;
  }, []);

  // Handle click on chart to find closest series
  const handleChartClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onSeriesClick || !chartWrapperRef.current) return;

      // Get fresh instance from wrapper
      const instance = chartWrapperRef.current.getEchartsInstance() as unknown as import('echarts/core').EChartsType;
      if (!instance || instance.isDisposed?.()) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;

      // Convert pixel coordinates to data coordinates
      const pointInGrid = instance.convertFromPixel('grid', [offsetX, offsetY]);
      if (!pointInGrid) return;

      // Get all series data and find which one is closest to click position
      const opt = instance.getOption() as { series?: Array<{ name?: string; data?: unknown[] }> };
      const chartSeries = opt.series || [];
      let closestSeries: string | null = null;
      let minDistance = Infinity;

      for (const s of chartSeries) {
        if (!s.name || !s.data) continue;
        // Find the y value at the clicked x position
        const xIndex = Math.round(pointInGrid[0]);
        if (xIndex < 0 || xIndex >= s.data.length) continue;
        const dataPoint = s.data[xIndex];
        if (dataPoint === null || dataPoint === undefined) continue;

        const yValue = typeof dataPoint === 'number' ? dataPoint : (dataPoint as [number, number])[1];
        if (yValue === null || yValue === undefined) continue;

        const distance = Math.abs(yValue - pointInGrid[1]);
        if (distance < minDistance) {
          minDistance = distance;
          closestSeries = s.name;
        }
      }

      if (closestSeries) {
        onSeriesClick(closestSeries);
      }
    },
    [onSeriesClick]
  );

  const themeColors = useThemeColors();
  const { CHART_CATEGORICAL_COLORS } = getDataVizColors();

  // Helper functions for relative slot display
  const toRelativeSlot = useCallback(
    (absoluteSlot: number): number => {
      if (!relativeSlots) return absoluteSlot;
      return absoluteSlot - relativeSlots.epoch * 32 + 1;
    },
    [relativeSlots]
  );

  const formatSlotLabel = useCallback(
    (absoluteSlot: number): string => {
      if (!relativeSlots) return formatSmartDecimal(absoluteSlot, 0);
      const relativeSlot = toRelativeSlot(absoluteSlot);
      return `${relativeSlot}`;
    },
    [relativeSlots, toRelativeSlot]
  );

  const formatSlotTooltip = useCallback(
    (absoluteSlot: number): string => {
      if (!relativeSlots) return formatSmartDecimal(absoluteSlot, 0);
      const relativeSlot = toRelativeSlot(absoluteSlot);
      return `Slot: ${formatSmartDecimal(absoluteSlot, 0)} (${relativeSlot}/32)`;
    },
    [relativeSlots, toRelativeSlot]
  );

  // Convert OKLCH colors (from Tailwind v4) to hex format for ECharts compatibility
  const convertedColorPalette = colorPalette?.map(color => resolveCssColorToHex(color));

  // Build extended palette: custom palette or data viz categorical colors
  const extendedPalette = convertedColorPalette || CHART_CATEGORICAL_COLORS;

  // Manage aggregate series visibility
  const [showAggregate, setShowAggregate] = useState(false);

  // Manage visible series when interactive legend is enabled
  // Use lazy initialization to ensure stable initial Set reference across StrictMode remounts
  // Filter by visible !== false (shown in legend) AND initiallyVisible !== false (starts enabled)
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(
    () => new Set(series.filter(s => s.visible !== false && s.initiallyVisible !== false).map(s => s.name))
  );

  // Series filter state
  const [searchQuery, setSearchQuery] = useState('');

  // Track all series names we've ever seen to detect genuinely new series
  // Initialize with current series to prevent treating them as "new" on mount/remount
  const seenSeriesNamesRef = useRef<Set<string>>(new Set(series.filter(s => s.visible !== false).map(s => s.name)));

  // Update visible series when series prop changes
  // Preserve user selections and only auto-show genuinely new series
  useEffect(() => {
    const currentSeriesNames = new Set(series.filter(s => s.visible !== false).map(s => s.name));

    // Find genuinely new series (never seen before)
    const newSeriesNames = new Set<string>();
    currentSeriesNames.forEach(name => {
      if (!seenSeriesNamesRef.current.has(name)) {
        newSeriesNames.add(name);
        seenSeriesNamesRef.current.add(name); // Track that we've seen this series
      }
    });

    // Remove series from visible set if they no longer exist in current series
    // Also remove from seenSeriesNamesRef so they'll be treated as "new" when re-added
    setVisibleSeries(prevVisible => {
      const updated = new Set(prevVisible);
      let changed = false;

      // Remove series that no longer exist
      prevVisible.forEach(name => {
        if (!currentSeriesNames.has(name)) {
          updated.delete(name);
          seenSeriesNamesRef.current.delete(name); // Forget this series so it's "new" when re-added
          changed = true;
        }
      });

      // Also clean up seenSeriesNamesRef for series that were hidden (not in prevVisible) but removed
      seenSeriesNamesRef.current.forEach(name => {
        if (!currentSeriesNames.has(name)) {
          seenSeriesNamesRef.current.delete(name);
        }
      });

      // Auto-add only genuinely new series (respecting initiallyVisible)
      if (newSeriesNames.size > 0) {
        newSeriesNames.forEach(name => {
          const s = series.find(s => s.name === name);
          // Only auto-add if initiallyVisible is not explicitly false
          if (s && s.initiallyVisible !== false) {
            updated.add(name);
            changed = true;
          }
        });
      }

      // Return same reference if nothing changed to avoid re-render
      return changed ? updated : prevVisible;
    });
  }, [series]);

  // Toggle series visibility
  const toggleSeries = (name: string): void => {
    setVisibleSeries(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  // Filter series helper functions (memoized to avoid recomputing on every render)
  const filterableSeries = useMemo(
    () => series.filter(s => !enableAggregateToggle || s.name !== aggregateSeriesName),
    [series, enableAggregateToggle, aggregateSeriesName]
  );

  const filteredSeriesBySearch = useMemo(
    () => filterableSeries.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [filterableSeries, searchQuery]
  );

  const selectAllFiltered = (): void => {
    setVisibleSeries(prev => {
      const next = new Set(prev);
      filteredSeriesBySearch.forEach(s => next.add(s.name));
      return next;
    });
  };

  const clearAllFiltered = (): void => {
    setVisibleSeries(prev => {
      const next = new Set(prev);
      filteredSeriesBySearch.forEach(s => next.delete(s.name));
      return next;
    });
  };

  const visibleCount = useMemo(
    () => filterableSeries.filter(s => visibleSeries.has(s.name)).length,
    [filterableSeries, visibleSeries]
  );

  // Filter series based on visibility (when legend or filter is enabled) and aggregate toggle
  // Use useMemo to create a new array reference only when filtering actually changes
  const displayedSeries = useMemo(() => {
    return series.filter(s => {
      // Band base series (visible: false) should follow their companion width series' visibility
      // so hidden bands don't force the y-axis range down with their lower-bound data
      if (s.visible === false) {
        if (s.stack && (showLegend || enableSeriesFilter)) {
          const companion = series.find(c => c.stack === s.stack && c.visible !== false);
          if (companion && !visibleSeries.has(companion.name)) return false;
        }
        return true;
      }
      // Filter by visibility if legend or series filter is enabled
      if ((showLegend || enableSeriesFilter) && !visibleSeries.has(s.name)) return false;
      // Filter aggregate series if toggle is enabled and aggregate is hidden
      if (enableAggregateToggle && s.name === aggregateSeriesName && !showAggregate) return false;
      return true;
    });
  }, [
    series,
    showLegend,
    enableSeriesFilter,
    visibleSeries,
    enableAggregateToggle,
    aggregateSeriesName,
    showAggregate,
  ]);

  // Build complete option
  // Memoize based on actual data that should trigger re-animation
  const option = useMemo(() => {
    // Build x-axis configuration
    // For time axis, use 'value' type with Unix timestamps for proper crosshair sync
    const isTimeAxis = xAxis.type === 'time';
    const timeMin = isTimeAxis && xAxis.timestamps?.length ? Math.min(...xAxis.timestamps) : undefined;
    const timeMax = isTimeAxis && xAxis.timestamps?.length ? Math.max(...xAxis.timestamps) : undefined;

    // Default time formatter: "Jan 15" format
    const defaultTimeFormatter = (ts: number): string => {
      const d = new Date(ts * 1000);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    };

    const xAxisHasName = xAxis.type === 'value' && Boolean(xAxis.name);
    const categoryLabels = xAxis.type === 'category' ? xAxis.labels : undefined;
    // Date labels tick on calendar boundaries (years, quarters, months, weeks), not every Nth point
    const dateTicks =
      categoryLabels && !xAxis.formatter
        ? dateCategoryTicks(categoryLabels, Math.floor(((chartWidth || 800) - 80) / 75))
        : null;
    const categoryLabelInterval =
      categoryLabels && new Set(categoryLabels).size < categoryLabels.length
        ? (index: number, value: string): boolean => index === 0 || categoryLabels[index - 1] !== value
        : undefined;

    const xAxisConfig = {
      type: isTimeAxis ? ('value' as const) : xAxis.type,
      // Dates and category labels describe themselves; only numeric axes keep a name
      name: xAxisHasName ? xAxis.name : undefined,
      nameLocation: 'middle' as const,
      nameGap: 28,
      nameTextStyle: { color: themeColors.muted, fontSize: 11 },
      data: xAxis.type === 'category' ? xAxis.labels : undefined,
      boundaryGap: xAxis.type === 'category',
      axisLine: {
        show: true,
        lineStyle: { color: themeColors.border },
      },
      axisTick: { show: false },
      axisLabel: {
        color: themeColors.muted,
        fontSize: 11,
        hideOverlap: true,
        // Hourly series repeat each day's label; show only the first point of each run
        interval: dateTicks ? (index: number): boolean => dateTicks.has(index) : categoryLabelInterval,
        formatter:
          xAxis.formatter ||
          (dateTicks ? (value: string, index: number) => dateTicks.get(index) ?? value : undefined) ||
          (isTimeAxis ? defaultTimeFormatter : undefined) ||
          (relativeSlots ? (value: number) => formatSlotLabel(value) : undefined),
      },
      splitLine: {
        show: false,
      },
      min: isTimeAxis ? (xAxis.min ?? timeMin) : xAxis.type === 'value' ? xAxis.min : undefined,
      max: isTimeAxis ? (xAxis.max ?? timeMax) : xAxis.type === 'value' ? xAxis.max : undefined,
    };

    // Build y-axis configuration (primary)
    const primaryYAxisConfig = {
      type: 'value' as const,
      // Unit label sits above the axis, reading horizontally, instead of rotated alongside it
      name: yAxis?.name,
      nameLocation: 'end' as const,
      nameGap: 10,
      nameTextStyle: { color: themeColors.muted, fontSize: 11, align: 'left' as const, padding: [0, 0, 0, -8] },
      axisLine: { show: false },
      axisTick: { show: false },
      splitLine: {
        show: true,
        lineStyle: { color: themeColors.border, type: 'solid' as const },
      },
      axisLabel: {
        color: themeColors.muted,
        fontSize: 11,
        formatter: yAxis?.formatter ?? formatAxisNumber,
      },
      ...valueAxisBounds(yAxis?.min, yAxis?.max),
      minInterval: yAxis?.minInterval,
    };

    // Build secondary y-axis configuration (right side) if provided
    const secondaryYAxisConfig = secondaryYAxis
      ? {
          type: 'value' as const,
          name: secondaryYAxis.name,
          nameLocation: 'end' as const,
          nameGap: 10,
          nameTextStyle: { color: themeColors.muted, fontSize: 11, align: 'right' as const, padding: [0, -8, 0, 0] },
          position: 'right' as const,
          axisLine: { show: false },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: {
            color: themeColors.muted,
            fontSize: 11,
            formatter: secondaryYAxis.formatter ?? formatAxisNumber,
          },
          ...valueAxisBounds(secondaryYAxis.min, secondaryYAxis.max),
          minInterval: secondaryYAxis.minInterval,
        }
      : null;

    // Combined y-axis config (single or array)
    const yAxisConfig = secondaryYAxisConfig ? [primaryYAxisConfig, secondaryYAxisConfig] : primaryYAxisConfig;

    // Build series configuration
    // Note: Don't filter by visible property here - displayedSeries already handles visibility via visibleSeries state
    const canEndLabel = (s: (typeof displayedSeries)[number]): boolean =>
      (s.seriesType ?? 'line') === 'line' &&
      !s.stack &&
      !s.showArea &&
      !s.showEndLabel &&
      s.visible !== false &&
      !s.name.startsWith('__');
    // End labels cost ~80px of plot width, too much on a phone-width chart
    // The right edge belongs to the secondary axis when there is one, so no end labels then
    const labelledCount =
      endLabels && isWideEnoughForEndLabels && !secondaryYAxis ? displayedSeries.filter(canEndLabel).length : 0;
    // Labels sit at each line's last value; when two lines end within a label's height of each
    // other the labels overprint, so the chart falls back to the legend alone
    const endValues = displayedSeries.filter(canEndLabel).map(s => lastValue(s.data));
    const plotHeight = (typeof _height === 'number' ? _height : 300) - 60;
    const showEndLabels =
      labelledCount > 1 &&
      labelledCount <= MAX_END_LABELS &&
      endLabelsClear(
        endValues,
        plotHeight,
        typeof yAxis?.min === 'number' ? yAxis.min : undefined,
        typeof yAxis?.max === 'number' ? yAxis.max : undefined
      );
    const longestEndLabel = showEndLabels
      ? Math.max(...displayedSeries.filter(canEndLabel).map(s => s.name.length))
      : 0;
    const endLabelMargin = showEndLabels ? Math.min(140, Math.ceil(longestEndLabel * 6 + 12)) : 0;

    // Share stacks (every layer filled) render as solid bands; confidence bands stack on an invisible
    // zero-opacity base and stay translucent so they layer over each other and the grid
    const bandStacks = new Set(series.filter(s => s.stack && s.areaOpacity === 0).map(s => s.stack));
    const seriesConfig = displayedSeries.map(s => {
      // Use explicit color or auto-assign from palette
      const originalIndex = series.indexOf(s);
      const seriesColor = s.color || extendedPalette[originalIndex % extendedPalette.length];

      const chartType = s.seriesType ?? 'line';

      const baseConfig = {
        name: s.name,
        type: chartType as 'line' | 'bar',
        data: s.data,
        smooth: s.smooth ?? false,
        step: s.step ?? false,
        connectNulls,
        showSymbol: s.showSymbol ?? false,
        symbolSize: s.symbolSize ?? 4,
        stack: s.stack,
        yAxisIndex: s.yAxisIndex ?? 0,
        triggerLineEvent: true, // Enable click events on lines
        // Dense lines (thousands of points across a few hundred pixels) alias into fuzz; LTTB keeps
        // the shape, peaks included, at the plot's resolution
        ...(chartType === 'line' && !s.stack && s.data.length > 600 ? { sampling: 'lttb' as const } : {}),
        lineStyle: {
          color: seriesColor,
          width: s.lineWidth ?? 1.5,
          type: s.lineStyle ?? ('solid' as const),
        },
        itemStyle: {
          color: seriesColor,
        },
        // Add emphasis configuration for hover effects
        // Use 'none' focus to prevent other series from fading (avoids flickering on stacked charts)
        emphasis: s.emphasis
          ? {
              focus: s.emphasis.focus,
              itemStyle: {
                color: seriesColor,
              },
              ...(s.emphasis.showSymbol !== undefined ? { showSymbol: s.emphasis.showSymbol } : {}),
              ...(s.emphasis.symbolSize !== undefined ? { symbolSize: s.emphasis.symbolSize } : {}),
            }
          : {
              focus: 'none' as const,
              itemStyle: {
                color: seriesColor,
              },
            },
        ...(showEndLabels && canEndLabel(s)
          ? {
              endLabel: {
                show: true,
                formatter: '{a}',
                color: seriesColor,
                fontSize: 11,
                distance: 6,
              },
              labelLayout: { moveOverlap: 'shiftY' as const },
            }
          : {}),
        // Add label at the right side of the chart if requested
        ...(s.showEndLabel
          ? {
              markPoint: {
                symbol: 'none',
                label: {
                  show: true,
                  position: 'insideEndTop' as const,
                  formatter: s.name,
                  color: seriesColor,
                  fontSize: 12,
                  fontWeight: 'bold' as const,
                  backgroundColor: 'transparent',
                },
                data: [
                  {
                    xAxis: 'max' as const,
                    yAxis: Array.isArray(s.data[0]) ? (s.data[0] as [number, number])[1] : 0,
                  },
                ],
              },
            }
          : {}),
      };

      // Share stacks: fill each layer with an opaque blend over the surface, so grid lines and
      // neighbouring layers never show through; the fills alone draw the edges
      if (s.showArea && s.stack && !bandStacks.has(s.stack)) {
        return {
          ...baseConfig,
          lineStyle: { ...baseConfig.lineStyle, width: 0 },
          areaStyle: { color: blendHex(seriesColor, themeColors.surface, s.areaOpacity ?? 0.85), opacity: 1 },
        };
      }

      // Add area style if requested
      if (s.showArea) {
        return {
          ...baseConfig,
          areaStyle: {
            color:
              s.areaOpacity !== undefined
                ? hexToRgba(seriesColor, s.areaOpacity)
                : {
                    type: 'linear' as const,
                    x: 0,
                    y: 0,
                    x2: 0,
                    y2: 1,
                    colorStops: [
                      {
                        offset: 0,
                        color: hexToRgba(seriesColor, 0.5),
                      },
                      {
                        offset: 1,
                        color: hexToRgba(seriesColor, 0.06),
                      },
                    ],
                  },
          },
        };
      }

      return baseConfig;
    });

    // Add annotation series for markLines/markAreas if provided
    const hasMarkLines = markLines && markLines.length > 0;
    const hasMarkAreas = markAreas && markAreas.length > 0;
    // Mark-line labels are vertical text ~11px wide; where marks crowd (e.g. every fork on an
    // all-time chart) labels overprint. Keep a label only if it is far enough from the last one
    // kept, newest first; a crowded mark's name joins the label it would have overprinted.
    const visibleMarkLabels = new Set<number>();
    const mergedMarkLabels = new Map<number, string[]>();
    if (hasMarkLines) {
      const plotWidth = Math.max((chartWidth || 800) - 52 - 16 - endLabelMargin, 1);
      const categoryLabels = xAxis.type === 'category' ? xAxis.labels : undefined;
      const numericXs = markLines!.map(ml => Number(ml.xValue)).filter(Number.isFinite);
      const xMin = Number(xAxis.min ?? (isTimeAxis ? timeMin : undefined) ?? Math.min(...numericXs));
      const xMax = Number(xAxis.max ?? (isTimeAxis ? timeMax : undefined) ?? Math.max(...numericXs));
      const fraction = (value: number | string): number | null => {
        if (categoryLabels) {
          const index = categoryLabels.indexOf(String(value));
          return index < 0 || categoryLabels.length < 2 ? null : index / (categoryLabels.length - 1);
        }
        const x = Number(value);
        return Number.isFinite(x) && xMax > xMin ? (x - xMin) / (xMax - xMin) : null;
      };
      const placed = markLines!
        .map((ml, index) => ({ index, px: fraction(ml.xValue), labelled: !!ml.label }))
        .filter(m => m.labelled)
        .sort((a, b) => (b.px ?? 0) - (a.px ?? 0));
      let lastPx = Infinity;
      let lastIndex = -1;
      for (const mark of placed) {
        if (mark.px === null) {
          visibleMarkLabels.add(mark.index);
          continue;
        }
        const px = mark.px * plotWidth;
        if (lastPx - px >= MARK_LABEL_GAP_PX || lastIndex < 0) {
          visibleMarkLabels.add(mark.index);
          lastPx = px;
          lastIndex = mark.index;
        } else {
          const names = mergedMarkLabels.get(lastIndex) ?? [];
          names.unshift(markLines![mark.index].label ?? '');
          mergedMarkLabels.set(lastIndex, names);
        }
      }
    }

    const annotationSeries =
      hasMarkLines || hasMarkAreas
        ? [
            {
              name: '__annotations__',
              type: 'line' as const,
              // Above the data series, so lines near the plot edge cannot cover the labels
              z: 5,
              data: [], // Empty data - this series is only for annotations
              legendHoverLink: false,
              tooltip: { show: false },
              ...(hasMarkLines
                ? {
                    markLine: {
                      symbol: 'none',
                      animation: false,
                      data: markLines!.map((ml, index) => ({
                        xAxis: ml.xValue,
                        // Hovering the line shows the full name when the resting label is truncated
                        emphasis: {
                          label: { show: !!ml.label, overflow: 'none' as const },
                          lineStyle: { width: ml.lineWidth ?? 1 },
                        },
                        label: {
                          show: visibleMarkLabels.has(index),
                          formatter: mergedMarkLabel([...(mergedMarkLabels.get(index) ?? []), ml.label ?? '']),
                          position: ml.labelPosition ?? 'end',
                          rotate: -90,
                          align: 'left',
                          // Start a little below the plot's top edge, clear of series running along the maximum
                          offset: ml.distance ?? [10, -2],
                          color: hexToRgba(ml.color ?? themeColors.muted, 0.9),
                          fontSize: 11,
                          // Vertical labels run down from the plot top; a long merged label would
                          // otherwise cross the x-axis, so it ends in an ellipsis at the plot bottom
                          width: Math.max(plotHeight - 18, 40),
                          overflow: 'truncate' as const,
                          // A halo in the surface colour keeps the name legible where it crosses the data
                          textBorderColor: themeColors.surface,
                          textBorderWidth: 3,
                          padding: [2, 4],
                        },
                        lineStyle: {
                          // Half-strength rules: the annotation layer reads quieter than the data
                          // (an alpha colour, since lineStyle.opacity would also fade the label)
                          color: hexToRgba(resolveCssColorToHex(ml.color ?? themeColors.muted), 0.5),
                          type: (ml.lineStyle ?? 'dashed') as 'solid' | 'dashed' | 'dotted',
                          width: ml.lineWidth ?? 1,
                        },
                      })),
                    },
                  }
                : {}),
              ...(hasMarkAreas
                ? {
                    markArea: {
                      silent: true,
                      animation: false,
                      data: markAreas!.map(ma => [
                        {
                          xAxis: ma.xStart,
                          itemStyle: {
                            color: hexToRgba(ma.color ?? themeColors.muted, ma.opacity ?? 0.15),
                          },
                          label: {
                            show: !!ma.label,
                            formatter: ma.label ?? '',
                            position: 'insideTop' as const,
                            color: hexToRgba(ma.color ?? themeColors.muted, 0.8),
                            fontSize: 10,
                          },
                        },
                        {
                          xAxis: ma.xEnd,
                        },
                      ]),
                    },
                  }
                : {}),
            },
          ]
        : [];

    const finalSeriesConfig = [...seriesConfig, ...annotationSeries];

    // Calculate grid padding - just basic padding, let ECharts handle the rest
    // Add extra bottom padding for dataZoom slider when enabled
    const baseBottom = xAxisHasName ? 48 : 28;
    const legendBottom = useNativeLegend && showLegend && legendPosition === 'bottom' ? 40 : 0;
    // The range track is chrome until the chart is zoomed; at full range it shows nothing
    const sliderVisible = enableDataZoom && showDataZoomSlider && (zoomRange.start > 0.01 || zoomRange.end < 99.99);
    const dataZoomBottom = sliderVisible ? 28 : 0;
    const hasYAxisName = Boolean(yAxis?.name || secondaryYAxis?.name);

    const gridConfig = grid
      ? { ...grid, right: (grid.right ?? 16) + endLabelMargin }
      : {
          left: 52,
          // Extra space for secondary y-axis labels, plus end labels when rendered
          right: (secondaryYAxis ? 56 : 16) + endLabelMargin,
          top: hasYAxisName ? 32 : 12,
          bottom: baseBottom + legendBottom + dataZoomBottom,
        };

    // Create default smart tooltip formatter
    // Auto-enable if valueDecimals is set OR if no custom formatter is provided
    const effectiveValueDecimals = yAxis?.valueDecimals ?? (tooltipFormatter ? undefined : 2);
    const defaultTooltipFormatter =
      !tooltipFormatter && effectiveValueDecimals !== undefined
        ? (params: unknown): string => {
            // ECharts passes array for 'axis' trigger, single object for 'item' trigger
            const dataPoints = Array.isArray(params) ? params : [params];

            // Build tooltip HTML
            let html = '';

            // Add x-axis label (first item's axis value)
            // For numeric x-axis, format as integer to avoid decimals like "9876543.5"
            // When relativeSlots is enabled, show both absolute and relative values
            if (dataPoints.length > 0 && dataPoints[0]) {
              const firstPoint = dataPoints[0] as { axisValue?: string | number };
              if (firstPoint.axisValue !== undefined) {
                const axisLabel =
                  typeof firstPoint.axisValue === 'number'
                    ? relativeSlots
                      ? formatSlotTooltip(firstPoint.axisValue)
                      : formatSmartDecimal(firstPoint.axisValue, 0) // 0 decimals = integers only
                    : firstPoint.axisValue;
                html += `<div style="margin-bottom: 4px; font-weight: 600;">${axisLabel}</div>`;
              }
            }

            // Add each series - apply smart decimal formatting to y values
            if (tooltipMode === 'compact') {
              // Compact mode: Filter out zero values and show top 10 with summary (like Grafana)
              const nonZeroPoints = dataPoints
                .map(point => {
                  const p = point as {
                    marker?: string;
                    seriesName?: string;
                    value?: number | [number, number];
                  };
                  const yValue = Array.isArray(p.value) ? p.value[1] : p.value;
                  return { ...p, yValue };
                })
                .filter(
                  p =>
                    p.marker &&
                    p.seriesName !== undefined &&
                    p.yValue !== undefined &&
                    p.yValue !== null &&
                    p.yValue !== 0
                )
                .sort((a, b) => (b.yValue ?? 0) - (a.yValue ?? 0)); // Sort by value descending

              const maxVisible = 10;
              const visiblePoints = nonZeroPoints.slice(0, maxVisible);
              const hiddenPoints = nonZeroPoints.slice(maxVisible);

              // Show top series
              visiblePoints.forEach(p => {
                const formattedValue = formatSmartDecimal(p.yValue!, effectiveValueDecimals);
                html += `<div style="display: flex; align-items: center; gap: 8px;">`;
                html += p.marker;
                html += `<span>${p.seriesName}:</span>`;
                html += `<span style="font-weight: 600; margin-left: auto;">${formattedValue}</span>`;
                html += `</div>`;
              });

              // Add summary for remaining series
              if (hiddenPoints.length > 0) {
                const totalHidden = hiddenPoints.reduce((sum, p) => sum + (p.yValue ?? 0), 0);
                const formattedTotal = formatSmartDecimal(totalHidden, effectiveValueDecimals);
                html += `<div style="display: flex; align-items: center; gap: 8px; margin-top: 4px; padding-top: 4px; border-top: 1px solid rgba(128, 128, 128, 0.2);">`;
                html += `<span style="color: rgba(128, 128, 128, 0.8); font-size: 11px;">+${hiddenPoints.length} more:</span>`;
                html += `<span style="font-weight: 600; margin-left: auto; font-size: 11px;">${formattedTotal}</span>`;
                html += `</div>`;
              }
            } else {
              // Default mode: Show all series (including zero values)
              dataPoints.forEach(point => {
                const p = point as {
                  marker?: string;
                  seriesName?: string;
                  value?: number | [number, number];
                };

                if (p.marker && p.seriesName !== undefined) {
                  // Extract y value
                  const yValue = Array.isArray(p.value) ? p.value[1] : p.value;

                  if (yValue !== undefined && yValue !== null) {
                    const formattedValue = formatSmartDecimal(yValue, effectiveValueDecimals);
                    html += `<div style="display: flex; align-items: center; gap: 8px;">`;
                    html += p.marker;
                    html += `<span>${p.seriesName}:</span>`;
                    html += `<span style="font-weight: 600; margin-left: auto;">${formattedValue}</span>`;
                    html += `</div>`;
                  }
                }
              });
            }

            return html;
          }
        : undefined;

    // Build tooltip configuration
    const tooltipConfig = {
      trigger: tooltipTrigger,
      triggerOn: 'mousemove' as const, // Enable fine-grained mousemove tracking for step charts
      backgroundColor: themeColors.surface,
      borderColor: themeColors.border,
      borderWidth: 1,
      padding: [8, 10],
      extraCssText: 'border-radius: 6px;',
      textStyle: {
        color: themeColors.foreground,
        fontSize: 12,
        fontFamily: CHART_FONT_FAMILY,
      },
      axisPointer:
        tooltipTrigger === 'axis'
          ? {
              type: 'line' as const,
              lineStyle: {
                color: themeColors.muted,
                type: 'dashed' as const,
              },
              snap: true, // Snap to data points for better step chart interaction
            }
          : undefined,
      formatter: tooltipFormatter || defaultTooltipFormatter,
      appendToBody: true, // Render tooltip in document body to prevent container clipping
    };

    return {
      // ECharts v6: animation is enabled by default with optimized performance
      animationDuration,
      animationEasing: 'cubicOut' as const,
      backgroundColor: 'transparent',
      textStyle: {
        color: themeColors.foreground,
      },
      grid: gridConfig,
      xAxis: xAxisConfig,
      yAxis: yAxisConfig,
      series: finalSeriesConfig,
      tooltip: tooltipConfig,
      legend:
        useNativeLegend && showLegend
          ? {
              show: true,
              orient: 'horizontal' as const,
              [legendPosition]: legendPosition === 'bottom' ? 10 : 10,
              left: 'center' as const,
              textStyle: {
                color: themeColors.foreground,
                fontSize: 12,
              },
              itemWidth: 14,
              itemHeight: 10,
              itemGap: 16,
            }
          : undefined,
      dataZoom: enableDataZoom
        ? [
            {
              type: 'inside' as const,
              xAxisIndex: 0,
              filterMode: 'none' as const,
              zoomOnMouseWheel: true,
              moveOnMouseWheel: false,
              moveOnMouseMove: true,
              start: zoomRange.start,
              end: zoomRange.end,
            },
            {
              // A slim, neutral range track: no data preview, no move bar, no accent color
              type: 'slider' as const,
              xAxisIndex: 0,
              filterMode: 'none' as const,
              height: 8,
              bottom: 6,
              start: zoomRange.start,
              end: zoomRange.end,
              showDataShadow: false,
              showDetail: false,
              brushSelect: false,
              moveHandleSize: 0,
              borderColor: 'transparent',
              borderRadius: 3,
              backgroundColor: hexToRgba(themeColors.border, 0.5),
              fillerColor: hexToRgba(themeColors.muted, 0.2),
              handleIcon: 'path://M0,0 h3 v8 h-3 z',
              handleSize: '100%',
              handleStyle: {
                color: themeColors.muted,
                borderWidth: 0,
              },
              emphasis: {
                handleStyle: { color: themeColors.foreground },
              },
            },
          ].slice(0, sliderVisible ? 2 : 1)
        : undefined,
    };
  }, [
    _height,
    animationDuration,
    themeColors.foreground,
    themeColors.border,
    themeColors.muted,
    themeColors.surface,
    xAxis,
    yAxis,
    secondaryYAxis,
    displayedSeries,
    series,
    grid,
    tooltipFormatter,
    tooltipTrigger,
    tooltipMode,
    enableDataZoom,
    showDataZoomSlider,
    zoomRange,
    connectNulls,
    extendedPalette,
    endLabels,
    isWideEnoughForEndLabels,
    chartWidth,
    relativeSlots,
    formatSlotLabel,
    formatSlotTooltip,
    useNativeLegend,
    showLegend,
    legendPosition,
    markLines,
    markAreas,
  ]);

  // Group series by their group property, maintaining order
  const legendGroups: Array<{ name: string | null; items: typeof series }> = [];
  for (const s of series) {
    if (s.visible === false || (enableAggregateToggle && s.name === aggregateSeriesName)) continue;
    const groupName = s.group ?? null;
    let group = legendGroups.find(g => g.name === groupName);
    if (!group) legendGroups.push((group = { name: groupName, items: [] }));
    group.items.push(s);
  }
  const legendControls = (
    <>
      {enableAggregateToggle && (
        <div className="mb-2 flex items-center justify-end">
          <button
            onClick={() => setShowAggregate(!showAggregate)}
            className={`rounded-sm px-2 py-1 text-xs/5 transition-colors ${
              showAggregate ? 'bg-muted/20 text-foreground' : 'text-muted hover:bg-muted/10'
            }`}
          >
            {showAggregate ? '✓' : '○'} {aggregateSeriesName}
          </button>
        </div>
      )}
      {/* One wrapping row: each group is a muted name followed by its series */}
      <div className="flex max-h-[200px] flex-wrap items-center gap-x-5 gap-y-1 overflow-y-auto">
        {legendGroups.map(group => (
          <div key={group.name ?? '__ungrouped__'} className="flex flex-wrap items-center gap-x-0.5 gap-y-0.5">
            {group.name && <span className="mr-1 text-xs/5 whitespace-nowrap text-muted">{group.name}</span>}
            {group.items.map(s => {
              const isVisible = visibleSeries.has(s.name);
              const seriesColor = s.color || extendedPalette[series.indexOf(s) % extendedPalette.length];
              return (
                <button
                  key={s.name}
                  onClick={() => toggleSeries(s.name)}
                  aria-pressed={isVisible}
                  className={`flex cursor-pointer items-center gap-1.5 rounded-xs px-1.5 py-0.5 text-xs/5 transition-colors hover:bg-muted/10 ${
                    isVisible ? 'text-foreground' : 'text-muted/60'
                  }`}
                >
                  <LegendSwatch series={s} color={seriesColor} active={isVisible} />
                  <span>{s.name}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );

  const chartContent = (
    <>
      {/* Title and subtitle (when not using card) */}
      {title && !showCard && (
        <div className={subtitle ? 'mb-4' : 'mb-4'}>
          <h3 className="mb-1 text-lg/7 font-semibold text-foreground">{title}</h3>
          {subtitle && <p className="text-xs/5 text-muted">{subtitle}</p>}
        </div>
      )}

      {/* Series Filter (collapsible with search) */}
      {enableSeriesFilter && filterableSeries.length > 0 && (
        <div className="mb-4">
          <Disclosure
            title={`Filter Series (${visibleCount} of ${filterableSeries.length} shown)`}
            rightContent={
              visibleCount < filterableSeries.length && (
                <span
                  onClick={e => {
                    e.stopPropagation();
                    setVisibleSeries(new Set(filterableSeries.map(s => s.name)));
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      setVisibleSeries(new Set(filterableSeries.map(s => s.name)));
                    }
                  }}
                  className="cursor-pointer px-2 py-0.5 text-xs text-muted hover:bg-muted/10 hover:text-foreground"
                >
                  Show All
                </span>
              )
            }
          >
            {/* Search box */}
            <div className="mb-3">
              <input
                type="text"
                placeholder="Search series..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:ring-2 focus:ring-primary focus:outline-none"
              />
            </div>

            {/* Action buttons */}
            <div className="mb-3 flex gap-2">
              <button
                onClick={selectAllFiltered}
                className="bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
              >
                Select All {searchQuery && `(${filteredSeriesBySearch.length})`}
              </button>
              <button
                onClick={clearAllFiltered}
                className="bg-muted/10 px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-muted/20"
              >
                Clear All {searchQuery && `(${filteredSeriesBySearch.length})`}
              </button>
            </div>

            {/* Series checkboxes */}
            <div className="max-h-[300px] space-y-1 overflow-y-auto">
              {filteredSeriesBySearch.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted">No series match your search</div>
              ) : (
                filteredSeriesBySearch.map(s => {
                  const isVisible = visibleSeries.has(s.name);
                  const seriesColor = s.color || extendedPalette[series.indexOf(s) % extendedPalette.length];
                  return (
                    <label
                      key={s.name}
                      className="hover:bg-surface-hover flex cursor-pointer items-center gap-2 px-2 py-1.5 text-sm transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={() => toggleSeries(s.name)}
                        className="h-4 w-4 cursor-pointer border-border text-primary focus:ring-2 focus:ring-primary focus:ring-offset-0"
                      />
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: seriesColor }} />
                      <span className={isVisible ? 'text-foreground' : 'text-muted'}>{s.name}</span>
                    </label>
                  );
                })
              )}
            </div>
          </Disclosure>
        </div>
      )}

      {/* Interactive Legend Controls - Top */}
      {showLegend && !useNativeLegend && series.length > 1 && legendPosition === 'top' && (
        <div className="mb-3">{legendControls}</div>
      )}

      <div
        style={{
          height: _height === '100%' ? '100%' : 'auto',
          flex: _height === '100%' ? '1 1 0%' : undefined,
          minHeight: _height === '100%' ? 0 : undefined,
          cursor: onSeriesClick ? 'pointer' : undefined,
        }}
        onClickCapture={onSeriesClick ? handleChartClick : undefined}
      >
        <ReactEChartsComponent
          theme={ECHARTS_THEME}
          ref={chartRef}
          echarts={echarts}
          option={option}
          style={{
            height: typeof _height === 'number' && !(showLegend && series.length > 1) ? _height + 52 : _height,
            width: '100%',
            minHeight: typeof _height === 'number' && !(showLegend && series.length > 1) ? _height + 52 : _height,
          }}
          notMerge={notMerge}
          opts={{ renderer: 'canvas' }}
          onChartReady={handleChartReady}
        />
      </div>

      {/* Interactive Legend Controls - Bottom */}
      {showLegend && !useNativeLegend && series.length > 1 && legendPosition === 'bottom' && (
        <div className="mt-3">{legendControls}</div>
      )}
    </>
  );

  // Wrap in card if requested
  if (showCard) {
    return (
      <div ref={measureRef} className="rounded-sm border border-border bg-surface p-4">
        {title && (
          <div className="mb-4">
            <h3 className="text-sm/6 font-semibold text-foreground">{title}</h3>
            {subtitle && <p className="text-xs/5 text-muted">{subtitle}</p>}
          </div>
        )}
        {chartContent}
      </div>
    );
  }

  // Return unwrapped chart
  return (
    <div ref={measureRef} className={_height === '100%' ? 'h-full w-full' : 'w-full'}>
      {chartContent}
    </div>
  );
}
