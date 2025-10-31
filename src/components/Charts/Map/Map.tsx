import type React from 'react';
import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { ECharts } from 'echarts';
import * as echarts from 'echarts';
// Use selective imports to avoid "geo3D exists" warning (ECharts v6 + echarts-gl)
import { Lines3DChart, Scatter3DChart } from 'echarts-gl/charts';
import { Geo3DComponent } from 'echarts-gl/components';
import type { MapChartProps } from './Map.types';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTheme } from '@/hooks/useTheme';
import { resolveCssColorToHex } from '@/utils/color';
import { getDataVizColors } from '@/utils/dataVizColors';

// Get data visualization colors once at module level
const { CHART_CATEGORICAL_COLORS } = getDataVizColors();

// Register echarts-gl components selectively to prevent duplicate registration
echarts.use([Lines3DChart, Scatter3DChart, Geo3DComponent]);

/**
 * MapChart - A 3D map visualization component using ECharts GL
 * Displays flight routes on a 3D world map with animated effects
 *
 * @example
 * ```tsx
 * <MapChart
 *   routes={[
 *     { from: [-74.0, 40.7], to: [-0.1, 51.5], name: 'NYC to London' },
 *     { from: [-118.4, 33.9], to: [139.8, 35.6], name: 'LA to Tokyo' },
 *   ]}
 *   title="Global Flight Routes"
 * />
 * ```
 */
export function MapChart({
  routes = [],
  points = [],
  title,
  height = 600,
  showEffect = true,
  environment,
  lineColor,
  pointColor,
  pointSize = 4,
  mapColor,
  distance = 70,
  alpha = 89,
  regionHeight = 0.5,
  minDistance = 40,
  maxDistance = 200,
}: MapChartProps): React.JSX.Element {
  const themeColors = useThemeColors();
  const { theme } = useTheme();
  const [echartsInstance, setEchartsInstance] = useState<ECharts | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Convert OKLCH colors (from Tailwind v4) to hex format for ECharts compatibility
  const convertedLineColor = lineColor ? resolveCssColorToHex(lineColor) : undefined;
  const convertedMapColor = mapColor ? resolveCssColorToHex(mapColor) : undefined;
  const convertedEnvironment = environment ? resolveCssColorToHex(environment) : undefined;
  const convertedPointColor = pointColor ? resolveCssColorToHex(pointColor) : undefined;

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

  // Prepare options and memoize to avoid unnecessary re-renders
  const option = useMemo(() => {
    // Prepare route data for lines3D
    const routeData = routes.map(route => ({
      coords: [route.from, route.to],
      name: route.name,
    }));

    // Prepare point data for scatter3D
    const pointData = points.map(point => ({
      name: point.name,
      value: [...point.coords, point.value || 1],
    }));

    const series: Array<Record<string, unknown>> = [];

    // Determine theme-aware defaults (treat both dark and star as dark themes)
    const isDark = theme === 'dark' || theme === 'star';

    // Add routes series if there are routes
    if (routes.length > 0) {
      series.push({
        type: 'lines3D',
        coordinateSystem: 'geo3D',
        effect: showEffect
          ? {
              show: true,
              trailWidth: 1,
              trailOpacity: 0.5,
              trailLength: 0.2,
              constantSpeed: 5,
            }
          : undefined,
        blendMode: 'lighter',
        lineStyle: {
          width: 0.2,
          color: convertedLineColor || CHART_CATEGORICAL_COLORS[0],
          opacity: 0.05,
        },
        data: routeData,
      });
    }

    // Add points series if there are points
    if (points.length > 0) {
      series.push({
        type: 'scatter3D',
        coordinateSystem: 'geo3D',
        symbol: 'circle',
        symbolSize: pointSize,
        itemStyle: {
          color: convertedPointColor || CHART_CATEGORICAL_COLORS[0],
          opacity: 0.8,
        },
        label: {
          show: false,
        },
        emphasis: {
          label: {
            show: false,
          },
        },
        data: pointData,
      });
    }

    return {
      backgroundColor: convertedEnvironment || themeColors.background,
      tooltip: {
        show: true,
        formatter: (params: Record<string, unknown>) => {
          const seriesType = params.seriesType as string | undefined;
          const data = params.data as Record<string, unknown> | undefined;
          const name = params.name as string | undefined;

          if (seriesType === 'scatter3D' && data) {
            const pointName = (data.name as string) || 'Unknown';
            const valueArray = data.value as number[] | undefined;
            const value = valueArray?.[2] ?? (data.value as number) ?? 0;
            return `<strong>${pointName}</strong>: ${value}`;
          }
          if (seriesType === 'lines3D' && data) {
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
      geo3D: {
        map: 'world',
        shading: 'realistic',
        silent: true,
        environment: convertedEnvironment || themeColors.background,
        realisticMaterial: {
          roughness: 0.8,
          metalness: 0,
        },
        postEffect: {
          enable: true,
        },
        groundPlane: {
          show: false,
        },
        light: {
          main: {
            intensity: isDark ? 0.8 : 1.2,
            alpha: 30,
          },
          ambient: {
            intensity: isDark ? 0.1 : 0,
          },
        },
        viewControl: {
          distance: distance,
          alpha: alpha,
          minDistance: minDistance,
          maxDistance: maxDistance,
          panMouseButton: 'left',
          rotateMouseButton: 'right',
          autoRotate: false,
          zoomSensitivity: 1,
        },
        itemStyle: {
          color: convertedMapColor || themeColors.muted,
        },
        regionHeight: regionHeight,
      },
      series,
    };
  }, [
    routes,
    points,
    title,
    showEffect,
    convertedEnvironment,
    convertedLineColor,
    convertedPointColor,
    pointSize,
    convertedMapColor,
    distance,
    alpha,
    regionHeight,
    minDistance,
    maxDistance,
    themeColors,
    theme,
  ]);

  useEffect(() => {
    if (echartsInstance) {
      // Re-render when options change
      echartsInstance.setOption(option);
    }
  }, [echartsInstance, option]);

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
        option={option}
        style={{ height, width: '100%', minHeight: height }}
        onChartReady={instance => setEchartsInstance(instance)}
        notMerge={true}
        lazyUpdate={false}
      />
    </div>
  );
}
