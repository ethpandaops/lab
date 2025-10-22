import type React from 'react';
import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { ECharts } from 'echarts';
import * as echarts from 'echarts';
import 'echarts-gl';
import type { MapChartProps } from './Map.types';
import { resolveCssColorToHex } from '@/utils/colour';

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
  environment = '#333',
  lineColor,
  pointColor,
  pointSize = 4,
  mapColor = '#000',
  distance = 70,
  alpha = 89,
  regionHeight = 0.5,
  minDistance = 40,
  maxDistance = 150,
}: MapChartProps): React.JSX.Element {
  const [themeColors] = useState(() => {
    // Get computed CSS variables from the root element on initial render
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);

    // Fallback colors (hex format for ECharts compatibility)
    const fallbackColors = {
      primary: '#06b6d4', // fallback cyan-500
      foreground: '#09090b', // fallback zinc-950
    };

    // Extract theme colors from CSS variables
    const primaryColor =
      computedStyle.getPropertyValue('--color-primary').trim() ||
      computedStyle.getPropertyValue('--color-cyan-500').trim();
    const foregroundColor =
      computedStyle.getPropertyValue('--color-foreground').trim() ||
      computedStyle.getPropertyValue('--color-zinc-950').trim();

    // Resolve CSS colors (oklch, color-mix, etc.) to hex for ECharts
    return {
      primary: primaryColor ? resolveCssColorToHex(primaryColor, fallbackColors.primary) : fallbackColors.primary,
      foreground: foregroundColor
        ? resolveCssColorToHex(foregroundColor, fallbackColors.foreground)
        : fallbackColors.foreground,
    };
  });

  const [echartsInstance, setEchartsInstance] = useState<ECharts | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

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
          color: lineColor || themeColors.primary,
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
          color: pointColor || themeColors.primary,
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
      backgroundColor: environment,
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
        environment: environment,
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
            intensity: 1,
            alpha: 30,
          },
          ambient: {
            intensity: 0,
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
          color: mapColor,
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
    environment,
    lineColor,
    pointColor,
    pointSize,
    mapColor,
    distance,
    alpha,
    regionHeight,
    minDistance,
    maxDistance,
    themeColors,
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
    <div className="w-full">
      <ReactECharts
        option={option}
        style={{ height, width: '100%', minHeight: height }}
        onChartReady={instance => setEchartsInstance(instance)}
      />
    </div>
  );
}
