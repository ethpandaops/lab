import { type JSX, useMemo, forwardRef, useCallback, useState } from 'react';
import ReactEChartsCore from 'echarts-for-react/lib/core';
import * as echarts from 'echarts/core';
import { BarChart as EChartsBar } from 'echarts/charts';
import { GridComponent, TooltipComponent } from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import clsx from 'clsx';
import { useThemeColors } from '@/hooks/useThemeColors';
import { getDataVizColors } from '@/utils/dataVizColors';
import type { StackedBarProps } from './StackedBar.types';

// Get data visualization colors once at module level
const { CHART_CATEGORICAL_COLORS } = getDataVizColors();

// Register ECharts components
echarts.use([EChartsBar, GridComponent, TooltipComponent, CanvasRenderer]);

/**
 * Default formatter for values (K/M suffix)
 */
function defaultValueFormatter(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toLocaleString();
}

/**
 * StackedBar - Horizontal stacked bar for proportional data visualization
 *
 * A generic component for displaying proportional segments in a horizontal bar.
 * Can be used for gas breakdowns, resource allocation, budget distribution,
 * or any data that needs proportional visualization.
 *
 * @example
 * ```tsx
 * // Gas breakdown example
 * <StackedBar
 *   segments={[
 *     { name: 'Intrinsic', value: 21608, color: '#6366f1' },
 *     { name: 'EVM Execution', value: 1969778, color: '#3b82f6' },
 *   ]}
 *   title="Gas Breakdown"
 *   subtitle="Receipt: 1.59M"
 *   footerRight="Refund: -672K (capped)"
 *   footerRightClassName="text-success"
 * />
 *
 * // With interactivity
 * <StackedBar
 *   segments={segments}
 *   onSegmentClick={(segment) => console.log('Clicked:', segment.name)}
 *   selectedSegmentName="Engineering"
 *   showLegend
 * />
 * ```
 */
export const StackedBar = forwardRef<ReactEChartsCore, StackedBarProps>(function StackedBar(
  {
    segments,
    total: providedTotal,
    title,
    subtitle,
    footerLeft,
    footerRight,
    footerLeftClassName,
    footerRightClassName,
    showLabels = true,
    showPercentages = true,
    animated = true,
    height = 120,
    animationDuration = 300,
    valueFormatter = defaultValueFormatter,
    showLegend = false,
    onSegmentClick,
    onSegmentHover,
    selectedSegmentName,
    minWidthPercent = 0.5,
    minLabelWidthPercent = 8,
    renderTooltip,
    emptyMessage = 'No data available',
  },
  ref
): JSX.Element {
  const themeColors = useThemeColors();
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);

  // Calculate total from segments if not provided
  const total = useMemo(() => {
    if (providedTotal !== undefined) return providedTotal;
    return segments.reduce((sum, seg) => sum + seg.value, 0);
  }, [segments, providedTotal]);

  // Filter segments that meet minimum width threshold
  const visibleSegments = useMemo(() => {
    if (total === 0) return [];
    return segments.filter(seg => {
      const pct = (seg.value / total) * 100;
      return pct >= minWidthPercent;
    });
  }, [segments, total, minWidthPercent]);

  // Build segment color map for legend and consistency
  const segmentColors = useMemo(() => {
    const colors: Record<string, string> = {};
    segments.forEach((seg, index) => {
      colors[seg.name] = seg.color || CHART_CATEGORICAL_COLORS[index % CHART_CATEGORICAL_COLORS.length];
    });
    return colors;
  }, [segments]);

  // Calculate percentage for a segment
  const getPercentage = useCallback(
    (value: number) => {
      return total > 0 ? (value / total) * 100 : 0;
    },
    [total]
  );

  // Handle chart events
  const handleChartEvents = useMemo(() => {
    return {
      click: (params: { seriesName: string }) => {
        const segment = segments.find(s => s.name === params.seriesName);
        if (segment && onSegmentClick) {
          onSegmentClick(segment);
        }
      },
      mouseover: (params: { seriesName: string }) => {
        const segment = segments.find(s => s.name === params.seriesName);
        setHoveredSegment(params.seriesName);
        if (segment && onSegmentHover) {
          onSegmentHover(segment);
        }
      },
      mouseout: () => {
        setHoveredSegment(null);
        if (onSegmentHover) {
          onSegmentHover(null);
        }
      },
    };
  }, [segments, onSegmentClick, onSegmentHover]);

  const option = useMemo(() => {
    if (visibleSegments.length === 0) {
      return null;
    }

    // Create series data for stacked bar
    const seriesData = visibleSegments.map((seg, index) => {
      const pct = getPercentage(seg.value);
      const isSelected = seg.name === selectedSegmentName;
      const isHovered = seg.name === hoveredSegment;
      const color = seg.color || CHART_CATEGORICAL_COLORS[index % CHART_CATEGORICAL_COLORS.length];

      return {
        name: seg.name,
        type: 'bar' as const,
        stack: 'stack',
        data: [seg.value],
        itemStyle: {
          color,
          borderColor: isSelected ? themeColors.primary : undefined,
          borderWidth: isSelected ? 2 : 0,
          opacity: isHovered ? 1 : selectedSegmentName && !isSelected ? 0.6 : 1,
        },
        label:
          showLabels && pct >= minLabelWidthPercent
            ? {
                show: true,
                position: 'inside' as const,
                formatter: () => {
                  if (showPercentages) {
                    return `${valueFormatter(seg.value)} (${pct.toFixed(1)}%)`;
                  }
                  return valueFormatter(seg.value);
                },
                color: '#ffffff',
                fontSize: 11,
                fontWeight: 500,
              }
            : { show: false },
        emphasis: {
          itemStyle: {
            opacity: 1,
          },
        },
        cursor: onSegmentClick ? 'pointer' : 'default',
      };
    });

    return {
      animation: animated,
      animationDuration,
      animationEasing: 'cubicOut',
      grid: {
        left: 16,
        right: 16,
        top: 8,
        bottom: 8,
      },
      xAxis: {
        type: 'value' as const,
        max: total,
        show: false,
      },
      yAxis: {
        type: 'category' as const,
        data: [''],
        show: false,
      },
      series: seriesData,
      tooltip: {
        trigger: 'item' as const,
        backgroundColor: themeColors.background,
        borderColor: themeColors.border,
        borderWidth: 1,
        textStyle: {
          color: themeColors.foreground,
          fontSize: 12,
        },
        formatter: (params: { seriesName: string; value: number; color: string }) => {
          const segment = segments.find(s => s.name === params.seriesName);
          if (!segment) return '';

          const pct = getPercentage(params.value);

          // Use custom renderer if provided
          if (renderTooltip) {
            // For custom tooltip, we need to return HTML string
            // This is a limitation - custom renderers return ReactNode but ECharts needs HTML
            // For now, fall back to default for custom renderers (they can use onSegmentHover instead)
          }

          return `
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="background:${params.color};width:10px;height:10px;border-radius:2px;display:inline-block;"></span>
              <span style="font-weight:500;">${params.seriesName}</span>
            </div>
            <div style="margin-top:4px;">
              <strong>${params.value.toLocaleString()}</strong> (${pct.toFixed(2)}%)
            </div>
            ${segment.description ? `<div style="margin-top:4px;color:${themeColors.muted};font-size:11px;">${segment.description}</div>` : ''}
          `;
        },
      },
    };
  }, [
    visibleSegments,
    segments,
    total,
    showLabels,
    showPercentages,
    valueFormatter,
    animated,
    animationDuration,
    themeColors,
    selectedSegmentName,
    hoveredSegment,
    minLabelWidthPercent,
    getPercentage,
    onSegmentClick,
    renderTooltip,
  ]);

  const hasHeader = title || subtitle;
  const hasFooter = footerLeft || footerRight;
  const legendHeight = showLegend ? 28 : 0;
  const chartHeight = height - (hasHeader ? 24 : 0) - (hasFooter ? 24 : 0) - legendHeight;

  // Empty state
  if (total === 0 || visibleSegments.length === 0) {
    return (
      <div className="w-full">
        {hasHeader && (
          <div className="mb-2 flex items-center justify-between">
            {title && <span className="text-sm font-medium text-foreground">{title}</span>}
            {subtitle && <span className="text-sm text-muted">{subtitle}</span>}
          </div>
        )}
        <div
          className="flex items-center justify-center rounded-xs border border-border bg-surface text-sm text-muted"
          style={{ height: chartHeight }}
        >
          {emptyMessage}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      {hasHeader && (
        <div className="mb-2 flex items-center justify-between">
          {title && <span className="text-sm font-medium text-foreground">{title}</span>}
          {subtitle && <span className="text-sm text-muted">{subtitle}</span>}
        </div>
      )}

      {/* Chart */}
      {option && (
        <ReactEChartsCore
          ref={ref}
          echarts={echarts}
          option={option}
          style={{ height: chartHeight, width: '100%' }}
          notMerge={false}
          lazyUpdate={true}
          onEvents={handleChartEvents}
        />
      )}

      {/* Footer */}
      {hasFooter && (
        <div className="mt-2 flex items-center justify-between text-xs">
          {footerLeft && <span className={clsx('text-muted', footerLeftClassName)}>{footerLeft}</span>}
          {footerRight && <span className={clsx('text-muted', footerRightClassName)}>{footerRight}</span>}
        </div>
      )}

      {/* Legend */}
      {showLegend && (
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          {segments.map(seg => {
            const pct = getPercentage(seg.value);
            if (pct < minWidthPercent) return null;

            const isSelected = seg.name === selectedSegmentName;
            const color = segmentColors[seg.name];

            return (
              <button
                key={seg.name}
                type="button"
                className={clsx(
                  'flex items-center gap-1.5 transition-opacity',
                  onSegmentClick && 'cursor-pointer hover:opacity-80',
                  selectedSegmentName && !isSelected && 'opacity-50'
                )}
                onClick={() => onSegmentClick?.(seg)}
                onMouseEnter={() => {
                  setHoveredSegment(seg.name);
                  onSegmentHover?.(seg);
                }}
                onMouseLeave={() => {
                  setHoveredSegment(null);
                  onSegmentHover?.(null);
                }}
              >
                <span
                  className={clsx('size-3 rounded-xs', isSelected && 'ring-2 ring-primary ring-offset-1')}
                  style={{ backgroundColor: color }}
                />
                <span className="text-foreground">{seg.name}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
});
