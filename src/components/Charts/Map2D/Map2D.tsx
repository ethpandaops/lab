import type React from 'react';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import type { Map2DChartProps, PointData } from './Map2D.types';
import { useThemeColors } from '@/hooks/useThemeColors';

/**
 * Map2DChart - A high-performance 2D map visualization component using ECharts
 * Much faster than the 3D version, especially for progressive data updates
 *
 * @example
 * ```tsx
 * <Map2DChart
 *   points={[
 *     { name: 'New York', coords: [-74.0, 40.7], value: 100 },
 *     { name: 'London', coords: [-0.1, 51.5], value: 80 },
 *   ]}
 *   title="Global Node Distribution"
 * />
 * ```
 */
export function Map2DChart({
  routes = [],
  points = [],
  title,
  height = 600,
  showEffect = false,
  lineColor,
  pointColor,
  pointSizeMultiplier = 2.5,
  roam = true,
  resetKey,
}: Map2DChartProps): React.JSX.Element {
  const themeColors = useThemeColors();
  const [mapLoaded, setMapLoaded] = useState(false);
  const chartRef = useRef<ReactECharts | null>(null);
  const allSeenPointsRef = useRef<Map<string, PointData>>(new Map());
  const previousResetKeyRef = useRef(resetKey);

  // Memoize derived values
  const computedPointColor = pointColor || themeColors.primary;
  const computedForegroundColor = themeColors.foreground;

  // Memoize style and opts objects to prevent ReactECharts from seeing new props every render
  const chartStyle = useMemo(() => ({ height, width: '100%', minHeight: height }), [height]);
  const chartOpts = useMemo(() => ({ renderer: 'canvas' as const }), []);

  // Load and register world map on mount
  useEffect(() => {
    const loadWorldMap = async (): Promise<void> => {
      try {
        // Fetch world map GeoJSON from local public directory
        const response = await fetch('/data/maps/world.json');
        const worldGeoJson = await response.json();

        // Register the map with echarts
        echarts.registerMap('world', worldGeoJson);
        setMapLoaded(true);
      } catch (error) {
        console.error('Failed to load world map:', error);
        setMapLoaded(false);
      }
    };

    loadWorldMap();
  }, []);

  // Create a memoized function to generate scatter series config
  const createScatterSeries = useCallback(
    (data: Array<{ name?: string; value: number[] }>) => ({
      type: 'scatter',
      coordinateSystem: 'geo',
      zlevel: 3,
      symbol: 'circle',
      symbolSize: (value: number[]) => {
        const pointValue = value[2] || 1;
        const baseSize = 3;
        const maxSize = 7;
        const size = Math.min(maxSize, baseSize + Math.log(pointValue + 1) * 0.8);
        return size * pointSizeMultiplier;
      },
      itemStyle: {
        color: computedPointColor,
        opacity: 0.85,
        shadowBlur: 3,
        shadowColor: computedPointColor,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        borderWidth: 0,
        borderColor: 'transparent',
      },
      emphasis: {
        scale: 1.4,
        focus: 'self',
        itemStyle: {
          opacity: 0.95,
          shadowBlur: 6,
          borderWidth: 1,
          borderColor: computedForegroundColor,
        },
      },
      data,
      large: true,
      largeThreshold: 1000,
      progressive: 500,
      progressiveThreshold: 1000,
      animation: false,
    }),
    [pointSizeMultiplier, computedPointColor, computedForegroundColor]
  );

  // Track all points seen during this slot and update chart
  useEffect(() => {
    if (!chartRef.current || !mapLoaded) return;

    const chart = chartRef.current.getEchartsInstance();
    if (!chart) return;

    // Check if resetKey changed - if so, reset everything
    const isReset = resetKey !== previousResetKeyRef.current;
    if (isReset) {
      previousResetKeyRef.current = resetKey;
      allSeenPointsRef.current.clear();
    }

    // Add all current points to the set of seen points (accumulate over time)
    // Filter out points without valid coordinates
    let hasNewPoints = false;
    points.forEach(point => {
      // Skip points without valid coordinates
      if (!point.coords || point.coords.length < 2 || point.coords[0] == null || point.coords[1] == null) {
        return;
      }
      const key = `${point.coords[0]},${point.coords[1]}`;
      if (!allSeenPointsRef.current.has(key)) {
        allSeenPointsRef.current.set(key, point);
        hasNewPoints = true;
      }
    });

    // Update chart if we have new points or just reset
    if (hasNewPoints || isReset) {
      const allPoints = Array.from(allSeenPointsRef.current.values());
      const pointData = allPoints.map(point => ({
        name: point.name,
        value: [...point.coords, point.value || 1],
      }));

      const currentOption = chart.getOption();

      if (!currentOption || !currentOption.series) {
        return;
      }

      const series = currentOption.series as Array<Record<string, unknown>>;
      const scatterSeriesIndex = series.findIndex(s => s.type === 'scatter');

      if (scatterSeriesIndex !== -1) {
        // Build a series array where only the scatter series at scatterSeriesIndex has data updated
        // Other indices get null so ECharts skips them (doesn't rebuild)
        const seriesUpdate: (Record<string, unknown> | null)[] = [];
        for (let i = 0; i <= scatterSeriesIndex; i++) {
          if (i === scatterSeriesIndex) {
            seriesUpdate.push({ data: pointData });
          } else {
            seriesUpdate.push(null);
          }
        }

        chart.setOption({ series: seriesUpdate }, { notMerge: false, lazyUpdate: false });
      }
    }
  }, [points, mapLoaded, resetKey]);

  // Prepare initial options - only calculated once on mount
  // We update data via setOption in useEffect, so option should never recalculate
  const option = useMemo(() => {
    // Don't create option until map is loaded to avoid accessing undefined map data
    if (!mapLoaded) {
      return {
        backgroundColor: 'transparent',
      };
    }

    const series: Array<Record<string, unknown>> = [];

    // Add routes series (lines) if there are routes
    if (routes.length > 0) {
      const routeData = routes.map(route => ({
        coords: [route.from, route.to],
        name: route.name,
      }));

      series.push({
        type: showEffect ? 'lines' : 'lines',
        coordinateSystem: 'geo',
        zlevel: 2,
        effect: showEffect
          ? {
              show: true,
              period: 6,
              trailLength: 0.1,
              symbolSize: 3,
              color: lineColor || themeColors.primary,
            }
          : undefined,
        lineStyle: {
          width: 1,
          color: lineColor || themeColors.primary,
          opacity: 0.3,
          curveness: 0.2,
        },
        data: routeData,
        // Performance optimizations
        progressive: 500,
        progressiveThreshold: 1000,
      });
    }

    // Always create scatter series (starts empty, data appended via effect)
    // Use the shared createScatterSeries function to avoid duplication
    series.push(createScatterSeries([]));

    return {
      backgroundColor: 'transparent',
      animation: false, // Disable animation for progressive updates
      tooltip: {
        show: true,
        trigger: 'item',
        backgroundColor: `${themeColors.surface}f0`, // f0 = ~94% opacity in hex
        borderColor: themeColors.border,
        borderWidth: 1,
        textStyle: {
          color: themeColors.foreground,
        },
        formatter: (params: Record<string, unknown>) => {
          const seriesType = params.seriesType as string | undefined;
          const data = params.data as Record<string, unknown> | undefined;
          const name = params.name as string | undefined;

          if (seriesType === 'scatter' && data) {
            const pointName = (data.name as string) || 'Unknown';
            const valueArray = data.value as number[] | undefined;
            const value = valueArray?.[2] ?? (data.value as number) ?? 0;
            return `<strong>${pointName}</strong><br/>Nodes: ${value}`;
          }
          if (seriesType === 'lines' && data) {
            return (data.name as string) || 'Route';
          }
          return name || '';
        },
      },
      title: title
        ? {
            text: title,
            left: 'center',
            top: 10,
            textStyle: {
              color: themeColors.foreground,
              fontSize: 16,
              fontWeight: 600,
            },
          }
        : undefined,
      geo: {
        map: 'world',
        roam: roam,
        silent: false,
        center: [20, 20], // Center slightly towards Europe
        zoom: 1.2, // Balanced zoom level
        itemStyle: {
          areaColor: `${themeColors.muted}15`, // 15 = ~8% opacity in hex
          borderColor: `${themeColors.border}30`, // 30 = ~19% opacity in hex
          borderWidth: 0.5,
        },
        emphasis: {
          itemStyle: {
            areaColor: `${themeColors.muted}30`, // Slightly more visible on hover
          },
          label: {
            show: false,
          },
        },
        // Performance: only render on move end
        renderOnMoving: false,
      },
      series,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded]); // Only recalculate when map loads - after that we update via setOption

  // Don't render until map is loaded
  if (!mapLoaded) {
    return (
      <div className="flex w-full items-center justify-center" style={{ height }}>
        <div className="text-foreground">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ReactECharts
        ref={chartRef}
        option={option}
        style={chartStyle}
        notMerge={false}
        lazyUpdate={true}
        opts={chartOpts}
      />
    </div>
  );
}
