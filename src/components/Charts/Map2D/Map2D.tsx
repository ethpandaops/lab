import type React from 'react';
import { useState, useEffect, useMemo, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import type { Map2DChartProps } from './Map2D.types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTheme } from '@/hooks/useTheme';

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
  mapColor,
  roam = true,
  animationDuration = 300,
}: Map2DChartProps): React.JSX.Element {
  const themeColors = useThemeColors();
  const { theme } = useTheme();
  const [mapLoaded, setMapLoaded] = useState(false);
  const chartRef = useRef<ReactECharts | null>(null);
  const previousPointsLengthRef = useRef(0);

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

  // Append new points directly to chart without re-rendering
  useEffect(() => {
    if (!chartRef.current || !mapLoaded) return;

    const chart = chartRef.current.getEchartsInstance();
    const currentLength = points.length;
    const previousLength = previousPointsLengthRef.current;

    // If points array got smaller, it means we reset (e.g., new slot) - reset the chart
    if (currentLength < previousLength) {
      previousPointsLengthRef.current = 0;
      const currentOption = chart.getOption();
      const series = currentOption.series as Array<Record<string, unknown>>;
      const scatterSeriesIndex = series.findIndex(s => s.type === 'scatter');

      if (scatterSeriesIndex !== -1) {
        chart.setOption({
          series: [{
            seriesIndex: scatterSeriesIndex,
            data: [],
          }],
        });
      }
      return;
    }

    // Only append if we have new points
    if (currentLength > previousLength) {
      const newPoints = points.slice(previousLength);
      const currentOption = chart.getOption();

      // Find the scatter series (should be last series if points exist)
      const series = currentOption.series as Array<Record<string, unknown>>;
      const scatterSeriesIndex = series.findIndex(s => s.type === 'scatter');

      if (scatterSeriesIndex !== -1) {
        // Append new data to existing series
        const existingData = (series[scatterSeriesIndex].data as Array<unknown>) || [];

        const newPointData = newPoints.map(point => ({
          name: point.name,
          value: [...point.coords, point.value || 1],
        }));

        chart.setOption({
          series: [{
            seriesIndex: scatterSeriesIndex,
            data: [...existingData, ...newPointData],
          }],
        });
      }

      previousPointsLengthRef.current = currentLength;
    }
  }, [points, mapLoaded]);

  // Prepare initial options - only used once on mount
  const option = useMemo(() => {
    const isDark = theme === 'dark' || theme === 'star';

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
    series.push({
      type: 'scatter',
      coordinateSystem: 'geo',
      zlevel: 3,
      symbol: 'circle',
      symbolSize: (value: number[]) => {
        // Scale point size based on value (index 2 is the value)
        const pointValue = value[2] || 1;
        // Use a fixed multiplier since we don't know min/max initially
        const baseSize = 8;
        const maxSize = 30;
        const size = Math.min(maxSize, baseSize + Math.log(pointValue + 1) * 3);
        return size * pointSizeMultiplier;
      },
      itemStyle: {
        color: pointColor || themeColors.primary,
        opacity: 0.8,
        shadowBlur: 10,
        shadowColor: pointColor || themeColors.primary,
      },
      emphasis: {
        scale: true,
        itemStyle: {
          opacity: 1,
          shadowBlur: 20,
        },
      },
      data: [], // Start empty, will be populated by effect
      // Performance optimizations for large datasets
      large: true,
      largeThreshold: 1000,
      progressive: 500,
      progressiveThreshold: 1000,
      animation: false, // Disable animation for better append performance
    });

    return {
      backgroundColor: 'transparent',
      animation: false, // Disable animation for progressive updates
      animationDuration,
      animationEasing: 'cubicOut',
      tooltip: {
        show: true,
        trigger: 'item',
        backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.9)',
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
            textStyle: {
              color: themeColors.foreground,
              fontSize: 16,
              fontWeight: 600,
            },
            left: 'center',
            top: 8,
          }
        : undefined,
      geo: {
        map: 'world',
        roam: roam,
        silent: false,
        itemStyle: {
          areaColor: mapColor || themeColors.muted,
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          borderWidth: 0.5,
        },
        emphasis: {
          itemStyle: {
            areaColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
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
  }, [
    routes,
    title,
    showEffect,
    lineColor,
    pointColor,
    pointSizeMultiplier,
    mapColor,
    roam,
    animationDuration,
    themeColors,
    theme,
  ]);

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
        style={{ height, width: '100%', minHeight: height }}
        notMerge={false}
        lazyUpdate={true}
        opts={{
          renderer: 'canvas', // Explicitly use canvas for best performance
        }}
      />
    </div>
  );
}
