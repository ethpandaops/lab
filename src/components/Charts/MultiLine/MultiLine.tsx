import type React from 'react';
import { useState, useEffect, useRef, useMemo } from 'react';
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
  height = 400,
  showLegend = false,
  showCard = false,
  enableDataZoom = false,
  tooltipFormatter,
  tooltipTrigger = 'axis',
  connectNulls = false,
  animationDuration = 300,
  grid,
  colorPalette,
  enableAggregateToggle = false,
  aggregateSeriesName = 'Average',
  enableSeriesFilter = false,
  relativeSlots,
  markLines,
}: MultiLineChartProps): React.JSX.Element {
  const themeColors = useThemeColors();
  const { CHART_CATEGORICAL_COLORS } = getDataVizColors();

  // Helper functions for relative slot display
  const toRelativeSlot = (absoluteSlot: number): number => {
    if (!relativeSlots) return absoluteSlot;
    return absoluteSlot - relativeSlots.epoch * 32 + 1;
  };

  const formatSlotLabel = (absoluteSlot: number): string => {
    if (!relativeSlots) return formatSmartDecimal(absoluteSlot, 0);
    const relativeSlot = toRelativeSlot(absoluteSlot);
    return `${relativeSlot}`;
  };

  const formatSlotTooltip = (absoluteSlot: number): string => {
    if (!relativeSlots) return formatSmartDecimal(absoluteSlot, 0);
    const relativeSlot = toRelativeSlot(absoluteSlot);
    return `Slot: ${formatSmartDecimal(absoluteSlot, 0)} (${relativeSlot}/32)`;
  };

  // Convert OKLCH colors (from Tailwind v4) to hex format for ECharts compatibility
  const convertedColorPalette = colorPalette?.map(color => resolveCssColorToHex(color));

  // Build extended palette: custom palette or data viz categorical colors
  const extendedPalette = convertedColorPalette || CHART_CATEGORICAL_COLORS;

  // Manage aggregate series visibility
  const [showAggregate, setShowAggregate] = useState(false);

  // Manage visible series when interactive legend is enabled
  // Include all series in the set, respecting initial visible property
  const [visibleSeries, setVisibleSeries] = useState<Set<string>>(
    new Set(series.filter(s => s.visible !== false).map(s => s.name))
  );

  // Series filter state
  const [searchQuery, setSearchQuery] = useState('');

  // Track all series names we've ever seen to detect genuinely new series
  const seenSeriesNamesRef = useRef<Set<string>>(new Set());

  // Update visible series when series prop changes
  // Preserve user selections and only auto-show genuinely new series (respecting initial visible property)
  useEffect(() => {
    // Track ALL series names (including those with visible: false)
    const allSeriesNames = new Set(series.map(s => s.name));

    // Get series that should be visible by default (visible !== false)
    const defaultVisibleNames = new Set(series.filter(s => s.visible !== false).map(s => s.name));

    // Find genuinely new series (never seen before)
    const newSeriesNames = new Set<string>();
    allSeriesNames.forEach(name => {
      if (!seenSeriesNamesRef.current.has(name)) {
        newSeriesNames.add(name);
        seenSeriesNamesRef.current.add(name); // Track that we've seen this series
      }
    });

    // Remove series from visible set if they no longer exist in current series
    setVisibleSeries(prevVisible => {
      const updated = new Set(prevVisible);
      let changed = false;

      // Remove series that no longer exist at all
      prevVisible.forEach(name => {
        if (!allSeriesNames.has(name)) {
          updated.delete(name);
          changed = true;
        }
      });

      // Auto-add only genuinely new series that are visible by default
      if (newSeriesNames.size > 0) {
        newSeriesNames.forEach(name => {
          if (defaultVisibleNames.has(name)) {
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

  // Build x-axis configuration
  const xAxisConfig = {
    type: xAxis.type,
    name: xAxis.name,
    nameLocation: 'middle' as const,
    nameGap: 30,
    nameTextStyle: { color: themeColors.muted },
    data: xAxis.type === 'category' ? xAxis.labels : undefined,
    boundaryGap: xAxis.type === 'category',
    axisLine: { lineStyle: { color: themeColors.border } },
    axisLabel: {
      color: themeColors.muted,
      fontSize: 12,
      formatter: xAxis.formatter || (relativeSlots ? (value: number) => formatSlotLabel(value) : undefined),
      showMaxLabel: false, // Don't force-render the max value to avoid awkward tick spacing
    },
    splitLine: {
      lineStyle: {
        color: themeColors.border,
        opacity: 0.3,
      },
    },
    min: xAxis.type === 'value' ? xAxis.min : undefined,
    max: xAxis.type === 'value' ? xAxis.max : undefined,
  };

  // Build y-axis configuration
  const yAxisConfig = {
    type: 'value' as const,
    name: yAxis?.name,
    nameLocation: 'middle' as const,
    nameGap: yAxis?.name ? 50 : 0,
    nameTextStyle: { color: themeColors.muted },
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: {
      lineStyle: {
        color: themeColors.border,
        type: 'dashed' as const,
      },
    },
    axisLabel: {
      color: themeColors.muted,
      fontSize: 12,
      formatter: yAxis?.formatter,
    },
    min: yAxis?.min,
    max: yAxis?.max,
    minInterval: yAxis?.minInterval,
  };

  // Build series configuration
  // Note: Don't filter by visible property here - displayedSeries already handles visibility via visibleSeries state
  const seriesConfig = displayedSeries.map((s, idx) => {
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
      // Add markLine to ALL series (workaround - ECharts sometimes doesn't render markLine on smooth series)
      ...(markLines && markLines.length > 0
        ? (() => {
            if (idx === 0) {
              console.log('[MultiLine] Adding markLine. markLines:', markLines);
            }
            const markLineConfig = {
              symbol: 'none',
              silent: false,
              animation: false,
              label: {
                show: idx === 0, // Only show label on first series to avoid duplicates
                position: 'end' as const,
                formatter: (params: { name?: string }) => params.name || '',
                color: themeColors.foreground,
                fontSize: 12,
              },
              lineStyle: {
                type: 'dotted' as const,
              },
              data: markLines.map(line => ({
                name: line.label,
                yAxis: line.value,
                lineStyle: {
                  color: line.color || themeColors.danger,
                  type: line.lineStyle || ('dotted' as const),
                  width: 3,
                },
              })),
            };
            if (idx === 0) {
              console.log('[MultiLine] markLine config:', markLineConfig);
            }
            return { markLine: markLineConfig };
          })()
        : {}),
    };

    // Add area style if requested
    if (s.showArea) {
      const configWithArea = {
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
      if (idx === 0) {
        console.log('[MultiLine] First series (WITH AREA) final config:', configWithArea);
        console.log('[MultiLine] Has markLine?', 'markLine' in configWithArea);
      }
      return configWithArea;
    }

    if (idx === 0) {
      console.log('[MultiLine] First series (NO AREA) final config:', baseConfig);
      console.log('[MultiLine] Has markLine?', 'markLine' in baseConfig);
    }
    return baseConfig;
  });

  console.log('[MultiLine] Total series count:', seriesConfig.length);
  console.log('[MultiLine] First series in array:', seriesConfig[0]);

  // Calculate grid padding
  // Title is always rendered by component, never by ECharts
  // ECharts v6: outerBounds adds padding for tick labels, axis names need explicit space
  const gridConfig = {
    top: grid?.top ?? 16,
    right: grid?.right,
    bottom: grid?.bottom ?? (xAxis.name ? 30 : 24),
    left: grid?.left ?? (yAxis?.name ? 30 : 8),
    // ECharts v6: use outerBounds instead of deprecated containLabel
    outerBoundsMode: 'same' as const,
    outerBoundsContain: 'axisLabel' as const,
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

          return html;
        }
      : undefined;

  // Build tooltip configuration
  const tooltipConfig = {
    trigger: tooltipTrigger,
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
          }
        : undefined,
    formatter: tooltipFormatter || defaultTooltipFormatter,
    appendToBody: true, // Render tooltip in document body to prevent container clipping
  };

  // Build complete option
  // Memoize based on actual data that should trigger re-animation, not intermediate objects
  const option = useMemo(() => {
    return {
      animation: true,
      animationDuration,
      animationEasing: 'cubicOut' as const,
      backgroundColor: 'transparent',
      textStyle: {
        color: themeColors.foreground,
      },
      // Never pass title to ECharts - component always renders it
      grid: gridConfig,
      xAxis: xAxisConfig,
      yAxis: yAxisConfig,
      series: seriesConfig,
      tooltip: tooltipConfig,
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
    enableDataZoom,
    seriesConfig,
    gridConfig,
    xAxisConfig,
    yAxisConfig,
    tooltipConfig,
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

      {/* Interactive Legend Controls */}
      {showLegend && series.length > 1 && (
        <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-border pb-4">
          <span className="text-sm/6 font-medium text-muted">Series:</span>
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
          {/* Aggregate Toggle Button - aligned right in same row */}
          {enableAggregateToggle && (
            <button
              onClick={() => setShowAggregate(!showAggregate)}
              className={`ml-auto rounded-sm px-2 py-1 text-xs/5 transition-colors ${
                showAggregate ? 'bg-muted/20 text-foreground' : 'text-muted hover:bg-muted/10'
              }`}
            >
              {showAggregate ? '✓' : '○'} {aggregateSeriesName}
            </button>
          )}
        </div>
      )}

      <div style={{ pointerEvents: 'none' }}>
        <ReactEChartsCore
          echarts={echarts}
          option={option}
          style={{ height, width: '100%', minHeight: height, pointerEvents: 'auto' }}
          notMerge={true}
          opts={{ renderer: 'canvas' }}
        />
      </div>
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
  return <div className="w-full">{chartContent}</div>;
}
