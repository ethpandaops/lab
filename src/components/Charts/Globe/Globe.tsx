import type React from 'react';
import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { ECharts } from 'echarts';
import 'echarts-gl';
import { useThemeColors } from '@/hooks/useThemeColors';
import type { GlobeChartProps } from './Globe.types';

/**
 * GlobeChart - A 3D globe visualization component using ECharts GL
 *
 * @example
 * ```tsx
 * <GlobeChart
 *   lines={[
 *     { from: [-122.4, 37.8], to: [139.7, 35.7], name: 'Connection A' },
 *     { from: [-0.1, 51.5], to: [-74.0, 40.7], name: 'Connection B' },
 *   ]}
 *   points={[
 *     { name: 'Location A', coord: [-122.4, 37.8] },
 *     { name: 'Location B', coord: [139.7, 35.7] },
 *   ]}
 *   title="Global Connections"
 * />
 * ```
 */
export function GlobeChart({
  lines = [],
  points = [],
  title,
  height = 600,
  autoRotate = true,
  showEffect = true,
  baseTexture,
  heightTexture,
  environment,
  lineColor,
  pointColor,
  pointSize = 2,
  pointOpacity = 0.2,
  notMerge = false,
  lazyUpdate = true,
}: GlobeChartProps): React.JSX.Element {
  const themeColors = useThemeColors();
  const [echartsInstance, setEchartsInstance] = useState<ECharts | null>(null);

  // Prepare series data and memoize option to avoid unnecessary re-renders
  const option = useMemo(() => {
    // Prepare series data - using Record for flexibility with ECharts GL series options
    const series: Record<string, unknown>[] = [];

    // Add lines3D series for connections
    if (lines.length > 0) {
      // Lines data should be array of coordinate pairs: [[[fromLon, fromLat], [toLon, toLat]], ...]
      const lineData = lines.map(line => [line.from, line.to]);

      series.push({
        type: 'lines3D',
        coordinateSystem: 'globe',
        effect: showEffect
          ? {
              show: true,
              trailWidth: 2,
              trailLength: 0.15,
              trailOpacity: 1,
              trailColor: lineColor || themeColors.accent,
            }
          : undefined,
        lineStyle: {
          width: 1,
          color: lineColor || themeColors.accent,
          opacity: 0.1,
        },
        blendMode: 'lighter',
        data: lineData,
      });
    }

    // Add scatter3D series for points
    if (points.length > 0) {
      // Points data with name and value for tooltips
      series.push({
        type: 'scatter3D',
        coordinateSystem: 'globe',
        blendMode: 'lighter',
        symbolSize: pointSize,
        itemStyle: {
          color: pointColor || themeColors.primary,
          opacity: pointOpacity,
        },
        data: points.map(point => ({
          name: point.name,
          value: [...point.coord, point.value || 0],
        })),
      });
    }

    const chartOption = {
      backgroundColor: themeColors.background,
      tooltip: {
        show: true,
        formatter: (params: { name?: string; value?: number[] }) => {
          if (params.name) {
            return params.name;
          }
          return '';
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
      globe: {
        baseTexture: baseTexture,
        heightTexture: heightTexture,
        displacementScale: baseTexture ? 0.1 : 0,
        displacementQuality: 'high',
        environment: environment,
        shading: 'lambert',
        light: {
          ambient: {
            intensity: 0.4,
          },
          main: {
            intensity: 0.4,
          },
        },
        viewControl: {
          autoRotate: autoRotate,
          autoRotateSpeed: 10,
        },
        silent: true,
      },
      series,
    };

    return chartOption;
  }, [
    lines,
    points,
    title,
    autoRotate,
    showEffect,
    baseTexture,
    heightTexture,
    environment,
    lineColor,
    pointColor,
    pointSize,
    pointOpacity,
    themeColors,
  ]);

  useEffect(() => {
    if (echartsInstance) {
      // Re-render when options change
      echartsInstance.setOption(option);
    }
  }, [echartsInstance, option]);

  return (
    <div className="w-full">
      <ReactECharts
        option={option}
        style={{ height, width: '100%', minHeight: height }}
        onChartReady={instance => setEchartsInstance(instance)}
        notMerge={notMerge}
        lazyUpdate={lazyUpdate}
      />
    </div>
  );
}
