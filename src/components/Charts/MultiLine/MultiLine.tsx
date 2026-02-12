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
import { useThemeColors } from '@/hooks/useThemeColors';
import { SharedCrosshairsContext } from '@/contexts/SharedCrosshairsContext';
import { Disclosure } from '@/components/Layout/Disclosure';
import type { MultiLineChartProps } from './MultiLine.types';

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
  onSeriesClick,
  markLines,
  markAreas,
  onChartReady: onChartReadyProp,
}: MultiLineChartProps): React.JSX.Element {
  // Store ref to the ReactEChartsCore wrapper (not the instance) for click handling
  const chartWrapperRef = useRef<ReactEChartsCore | null>(null);
  // Store the chart instance for sync cleanup
  const chartInstanceRef = useRef<EChartsInstance | null>(null);
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

    const xAxisConfig = {
      type: isTimeAxis ? ('value' as const) : xAxis.type,
      name: xAxis.name,
      nameLocation: 'middle' as const,
      nameGap: 30,
      nameTextStyle: { color: themeColors.muted },
      data: xAxis.type === 'category' ? xAxis.labels : undefined,
      boundaryGap: xAxis.type === 'category',
      axisLine: {
        show: true,
        lineStyle: { color: themeColors.border },
      },
      axisLabel: {
        color: themeColors.muted,
        formatter:
          xAxis.formatter ||
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
      name: yAxis?.name,
      nameLocation: 'middle' as const,
      nameGap: yAxis?.name ? 35 : 0,
      nameTextStyle: { color: themeColors.muted },
      axisLine: {
        show: true,
        lineStyle: { color: themeColors.border },
      },
      axisTick: { show: false },
      splitLine: {
        show: false,
      },
      axisLabel: {
        color: themeColors.muted,
        formatter: yAxis?.formatter,
      },
      min: yAxis?.min,
      max: yAxis?.max,
      minInterval: yAxis?.minInterval,
    };

    // Build secondary y-axis configuration (right side) if provided
    const secondaryYAxisConfig = secondaryYAxis
      ? {
          type: 'value' as const,
          name: secondaryYAxis.name,
          nameLocation: 'middle' as const,
          nameGap: secondaryYAxis.name ? 45 : 0,
          nameTextStyle: { color: themeColors.muted },
          position: 'right' as const,
          axisLine: {
            show: true,
            lineStyle: { color: themeColors.border },
          },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: {
            color: themeColors.muted,
            formatter: secondaryYAxis.formatter,
          },
          min: secondaryYAxis.min,
          max: secondaryYAxis.max,
          minInterval: secondaryYAxis.minInterval,
        }
      : null;

    // Combined y-axis config (single or array)
    const yAxisConfig = secondaryYAxisConfig ? [primaryYAxisConfig, secondaryYAxisConfig] : primaryYAxisConfig;

    // Build series configuration
    // Note: Don't filter by visible property here - displayedSeries already handles visibility via visibleSeries state
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
        lineStyle: {
          color: seriesColor,
          width: s.lineWidth ?? 2,
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
    const annotationSeries =
      hasMarkLines || hasMarkAreas
        ? [
            {
              name: '__annotations__',
              type: 'line' as const,
              data: [], // Empty data - this series is only for annotations
              silent: true, // Don't trigger events
              legendHoverLink: false,
              ...(hasMarkLines
                ? {
                    markLine: {
                      silent: true,
                      symbol: 'none',
                      animation: false,
                      data: markLines!.map(ml => ({
                        xAxis: ml.xValue,
                        label: {
                          show: !!ml.label,
                          formatter: ml.label ?? '',
                          position: ml.labelPosition ?? 'end',
                          rotate: -90,
                          align: 'left',
                          offset: ml.distance ?? [0, -2],
                          color: hexToRgba(ml.color ?? themeColors.muted, 0.7),
                          fontSize: 11,
                          backgroundColor: 'transparent',
                          padding: [2, 4],
                        },
                        lineStyle: {
                          color: ml.color ?? themeColors.muted,
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
    const baseBottom = 50;
    const legendBottom = useNativeLegend && showLegend && legendPosition === 'bottom' ? 40 : 0;
    const dataZoomBottom = enableDataZoom ? 40 : 0;

    const gridConfig = grid ?? {
      left: 60,
      right: secondaryYAxis ? 70 : 24, // Extra space for secondary y-axis
      top: 16,
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
      textStyle: {
        color: themeColors.foreground,
        fontSize: 12,
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
              type: 'slider' as const,
              xAxisIndex: 0,
              filterMode: 'none' as const,
              height: 20,
              bottom: 10,
              start: zoomRange.start,
              end: zoomRange.end,
              borderColor: themeColors.border,
              backgroundColor: 'transparent',
              fillerColor: hexToRgba(themeColors.primary, 0.2),
              handleStyle: {
                color: themeColors.primary,
                borderColor: themeColors.primary,
              },
              textStyle: {
                color: themeColors.muted,
              },
              dataBackground: {
                lineStyle: { color: themeColors.border },
                areaStyle: { color: themeColors.border, opacity: 0.1 },
              },
              selectedDataBackground: {
                lineStyle: { color: themeColors.primary },
                areaStyle: { color: themeColors.primary, opacity: 0.1 },
              },
            },
          ]
        : undefined,
    };
  }, [
    animationDuration,
    themeColors.foreground,
    themeColors.border,
    themeColors.muted,
    themeColors.surface,
    themeColors.primary,
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
    zoomRange,
    connectNulls,
    extendedPalette,
    relativeSlots,
    formatSlotLabel,
    formatSlotTooltip,
    useNativeLegend,
    showLegend,
    legendPosition,
    markLines,
    markAreas,
  ]);

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
        <div className="mb-4 border-b border-border pb-4">
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
          <div className="max-h-[200px] overflow-y-auto">
            {(() => {
              const legendSeries = series.filter(
                s => s.visible !== false && (!enableAggregateToggle || s.name !== aggregateSeriesName)
              );
              // Group series by their group property, maintaining order
              const groups: Array<{ name: string | null; items: typeof legendSeries }> = [];
              const seenGroups = new Set<string | null>();
              legendSeries.forEach(s => {
                const groupName = s.group ?? null;
                if (!seenGroups.has(groupName)) {
                  seenGroups.add(groupName);
                  groups.push({ name: groupName, items: [] });
                }
                groups.find(g => g.name === groupName)?.items.push(s);
              });

              return (
                <div className="flex flex-col gap-2">
                  {groups.map(group => (
                    <div key={group.name ?? '__ungrouped__'} className="flex items-center gap-2">
                      {group.name && <span className="text-xs text-muted">{group.name}:</span>}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {group.items.map(s => {
                          const isVisible = visibleSeries.has(s.name);
                          const seriesColor = s.color || extendedPalette[series.indexOf(s) % extendedPalette.length];
                          return (
                            <button
                              key={s.name}
                              onClick={() => toggleSeries(s.name)}
                              className={`flex cursor-pointer items-center gap-1.5 rounded-sm border px-2 py-1 text-xs/5 transition-all ${
                                isVisible
                                  ? 'bg-surface-hover border-border text-foreground hover:border-primary/50 hover:bg-primary/10'
                                  : 'hover:bg-surface-hover/50 border-transparent bg-surface/50 text-muted/50 hover:border-border'
                              }`}
                              title={isVisible ? `Click to hide ${s.name}` : `Click to show ${s.name}`}
                            >
                              <span
                                className="h-2 w-2 rounded-full transition-colors"
                                style={{
                                  backgroundColor: isVisible ? seriesColor : 'transparent',
                                  border: `2px solid ${seriesColor}`,
                                  opacity: isVisible ? 1 : 0.5,
                                }}
                              />
                              <span className="font-medium">{s.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
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
        <div className="mt-4 border-t border-border pt-4">
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
          <div className="max-h-[200px] overflow-y-auto">
            {(() => {
              const legendSeries = series.filter(
                s => s.visible !== false && (!enableAggregateToggle || s.name !== aggregateSeriesName)
              );
              // Group series by their group property, maintaining order
              const groups: Array<{ name: string | null; items: typeof legendSeries }> = [];
              const seenGroups = new Set<string | null>();
              legendSeries.forEach(s => {
                const groupName = s.group ?? null;
                if (!seenGroups.has(groupName)) {
                  seenGroups.add(groupName);
                  groups.push({ name: groupName, items: [] });
                }
                groups.find(g => g.name === groupName)?.items.push(s);
              });

              return (
                <div className="flex flex-col gap-2">
                  {groups.map(group => (
                    <div key={group.name ?? '__ungrouped__'} className="flex items-center gap-2">
                      {group.name && <span className="text-xs text-muted">{group.name}:</span>}
                      <div className="flex flex-wrap items-center gap-1.5">
                        {group.items.map(s => {
                          const isVisible = visibleSeries.has(s.name);
                          const seriesColor = s.color || extendedPalette[series.indexOf(s) % extendedPalette.length];
                          return (
                            <button
                              key={s.name}
                              onClick={() => toggleSeries(s.name)}
                              className={`flex cursor-pointer items-center gap-1.5 rounded-sm border px-2 py-1 text-xs/5 transition-all ${
                                isVisible
                                  ? 'bg-surface-hover border-border text-foreground hover:border-primary/50 hover:bg-primary/10'
                                  : 'hover:bg-surface-hover/50 border-transparent bg-surface/50 text-muted/50 hover:border-border'
                              }`}
                              title={isVisible ? `Click to hide ${s.name}` : `Click to show ${s.name}`}
                            >
                              <span
                                className="h-2 w-2 rounded-full transition-colors"
                                style={{
                                  backgroundColor: isVisible ? seriesColor : 'transparent',
                                  border: `2px solid ${seriesColor}`,
                                  opacity: isVisible ? 1 : 0.5,
                                }}
                              />
                              <span className="font-medium">{s.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </>
  );

  // Wrap in card if requested
  if (showCard) {
    return (
      <div className="rounded-sm border border-border bg-surface p-4">
        {title && (
          <div className={subtitle ? 'mb-4' : 'mb-4'}>
            <h3 className="mb-1 text-lg/7 font-semibold text-foreground">{title}</h3>
            {subtitle && <p className="text-xs/5 text-muted">{subtitle}</p>}
          </div>
        )}
        {chartContent}
      </div>
    );
  }

  // Return unwrapped chart
  return <div className={_height === '100%' ? 'h-full w-full' : 'w-full'}>{chartContent}</div>;
}
