import type React from 'react';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { LineChart as EChartsLine } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  TitleComponent,
  DataZoomComponent,
  LegendComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { hexToRgba, formatSmartDecimal, getDataVizColors, resolveCssColorToHex } from '@/utils';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useSharedCrosshairs } from '@/hooks/useSharedCrosshairs';
import { Disclosure } from '@/components/Layout/Disclosure';
import type { MultiLineChartProps } from './MultiLine.types';

// Register ECharts components
echarts.use([
  EChartsLine,
  GridComponent,
  TooltipComponent,
  TitleComponent,
  DataZoomComponent,
  LegendComponent,
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
}: MultiLineChartProps): React.JSX.Element {
  // Get callback ref for crosshair sync
  const chartRef = useSharedCrosshairs({ syncGroup });

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
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(
    () => new Set(series.filter(s => s.visible !== false).map(s => s.name))
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
    setVisibleSeries(prevVisible => {
      const updated = new Set(prevVisible);
      let changed = false;

      // Remove series that no longer exist
      prevVisible.forEach(name => {
        if (!currentSeriesNames.has(name)) {
          updated.delete(name);
          changed = true;
        }
      });

      // Auto-add only genuinely new series
      if (newSeriesNames.size > 0) {
        newSeriesNames.forEach(name => {
          updated.add(name);
        });
        changed = true;
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
    const xAxisConfig = {
      type: xAxis.type,
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
        formatter: xAxis.formatter || (relativeSlots ? (value: number) => formatSlotLabel(value) : undefined),
      },
      splitLine: {
        show: false,
      },
      min: xAxis.type === 'value' ? xAxis.min : undefined,
      max: xAxis.type === 'value' ? xAxis.max : undefined,
    };

    // Build y-axis configuration
    const yAxisConfig = {
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

    // Build series configuration
    // Note: Don't filter by visible property here - displayedSeries already handles visibility via visibleSeries state
    const seriesConfig = displayedSeries.map(s => {
      // Use explicit color or auto-assign from palette
      const originalIndex = series.indexOf(s);
      const seriesColor = s.color || extendedPalette[originalIndex % extendedPalette.length];

      const baseConfig = {
        name: s.name,
        type: 'line' as const,
        data: s.data,
        smooth: s.smooth ?? false,
        step: s.step ?? false,
        connectNulls,
        showSymbol: s.showSymbol ?? false,
        symbolSize: s.symbolSize ?? 4,
        lineStyle: {
          color: seriesColor,
          width: s.lineWidth ?? 2,
          type: s.lineStyle ?? ('solid' as const),
        },
        itemStyle: {
          color: seriesColor,
        },
        // Add emphasis configuration for hover effects
        // Auto-enable symbol display on hover for better interactivity (especially important for step charts)
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
              focus: 'series' as const,
              showSymbol: true,
              symbolSize: 8,
              itemStyle: {
                color: seriesColor,
                borderColor: themeColors.background,
                borderWidth: 2,
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

    // Calculate grid padding - just basic padding, let ECharts handle the rest
    const gridConfig = grid ?? {
      left: 60,
      right: 24,
      top: 16,
      bottom: useNativeLegend && showLegend && legendPosition === 'bottom' ? 90 : 50,
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
      series: seriesConfig,
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
              zoomOnMouseWheel: false,
              moveOnMouseWheel: false,
              moveOnMouseMove: true,
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
    themeColors.background,
    xAxis,
    yAxis,
    displayedSeries,
    series,
    grid,
    tooltipFormatter,
    tooltipTrigger,
    tooltipMode,
    enableDataZoom,
    connectNulls,
    extendedPalette,
    relativeSlots,
    formatSlotLabel,
    formatSlotTooltip,
    useNativeLegend,
    showLegend,
    legendPosition,
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
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm/6 font-medium text-muted">Series:</span>
            {enableAggregateToggle && (
              <button
                onClick={() => setShowAggregate(!showAggregate)}
                className={`rounded-sm px-2 py-1 text-xs/5 transition-colors ${
                  showAggregate ? 'bg-muted/20 text-foreground' : 'text-muted hover:bg-muted/10'
                }`}
              >
                {showAggregate ? '✓' : '○'} {aggregateSeriesName}
              </button>
            )}
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            <div className="flex flex-wrap items-center gap-2">
              {series
                .filter(s => !enableAggregateToggle || s.name !== aggregateSeriesName)
                .map(s => {
                  const isVisible = visibleSeries.has(s.name);
                  const seriesColor = s.color || extendedPalette[series.indexOf(s) % extendedPalette.length];
                  return (
                    <button
                      key={s.name}
                      onClick={() => toggleSeries(s.name)}
                      className={`flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs/5 transition-colors ${
                        isVisible
                          ? 'bg-surface-hover text-foreground'
                          : 'hover:bg-surface-hover/50 bg-surface/50 text-muted/50'
                      }`}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: isVisible ? seriesColor : 'transparent',
                          border: `2px solid ${seriesColor}`,
                        }}
                      />
                      <span className="font-medium">{s.name}</span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          pointerEvents: 'none',
          height: _height === '100%' ? '100%' : 'auto',
          flex: _height === '100%' ? '1 1 0%' : undefined,
          minHeight: _height === '100%' ? 0 : undefined,
        }}
      >
        <ReactEChartsCore
          ref={chartRef}
          echarts={echarts}
          option={option}
          style={{
            height: typeof _height === 'number' && !(showLegend && series.length > 1) ? _height + 52 : _height,
            width: '100%',
            minHeight: typeof _height === 'number' && !(showLegend && series.length > 1) ? _height + 52 : _height,
            pointerEvents: 'auto',
          }}
          notMerge={notMerge}
          opts={{ renderer: 'canvas' }}
        />
      </div>

      {/* Interactive Legend Controls - Bottom */}
      {showLegend && !useNativeLegend && series.length > 1 && legendPosition === 'bottom' && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm/6 font-medium text-muted">Series:</span>
            {enableAggregateToggle && (
              <button
                onClick={() => setShowAggregate(!showAggregate)}
                className={`rounded-sm px-2 py-1 text-xs/5 transition-colors ${
                  showAggregate ? 'bg-muted/20 text-foreground' : 'text-muted hover:bg-muted/10'
                }`}
              >
                {showAggregate ? '✓' : '○'} {aggregateSeriesName}
              </button>
            )}
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            <div className="flex flex-wrap items-center gap-2">
              {series
                .filter(s => !enableAggregateToggle || s.name !== aggregateSeriesName)
                .map(s => {
                  const isVisible = visibleSeries.has(s.name);
                  const seriesColor = s.color || extendedPalette[series.indexOf(s) % extendedPalette.length];
                  return (
                    <button
                      key={s.name}
                      onClick={() => toggleSeries(s.name)}
                      className={`flex items-center gap-1.5 rounded-sm px-2 py-1 text-xs/5 transition-colors ${
                        isVisible
                          ? 'bg-surface-hover text-foreground'
                          : 'hover:bg-surface-hover/50 bg-surface/50 text-muted/50'
                      }`}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{
                          backgroundColor: isVisible ? seriesColor : 'transparent',
                          border: `2px solid ${seriesColor}`,
                        }}
                      />
                      <span className="font-medium">{s.name}</span>
                    </button>
                  );
                })}
            </div>
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
