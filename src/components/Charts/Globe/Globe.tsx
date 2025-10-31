import type React from 'react';
import { useState, useEffect, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { ECharts } from 'echarts';
import * as echarts from 'echarts';
// Use selective imports to avoid "geo3D exists" warning (ECharts v6 + echarts-gl)
import { Lines3DChart, Scatter3DChart } from 'echarts-gl/charts';
import { GlobeComponent } from 'echarts-gl/components';
import { useThemeColors } from '@/hooks/useThemeColors';
import { resolveCssColorToHex } from '@/utils/color';
import { getDataVizColors } from '@/utils/dataVizColors';
import type { GlobeChartProps } from './Globe.types';

// Get data visualization colors once at module level
const { CHART_CATEGORICAL_COLORS } = getDataVizColors();

// Register echarts-gl components selectively to prevent duplicate registration
echarts.use([Lines3DChart, Scatter3DChart, GlobeComponent]);

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
  shading = 'lambert',
  roughness = 0.8,
  metalness = 0,
  enablePostEffect = false,
  enableTemporalSuperSampling = true,
  showAtmosphere = false,
  lightIntensity = 0.4,
  ambientLightIntensity = 0.4,
}: GlobeChartProps): React.JSX.Element {
  const themeColors = useThemeColors();
  const [echartsInstance, setEchartsInstance] = useState<ECharts | null>(null);

  // Convert OKLCH colors (from Tailwind v4) to hex format for ECharts compatibility
  const convertedLineColor = lineColor ? resolveCssColorToHex(lineColor) : undefined;
  const convertedPointColor = pointColor ? resolveCssColorToHex(pointColor) : undefined;
  const convertedEnvironment = environment ? resolveCssColorToHex(environment) : undefined;

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
              trailColor: convertedLineColor || CHART_CATEGORICAL_COLORS[0],
            }
          : undefined,
        lineStyle: {
          width: 1,
          color: convertedLineColor || CHART_CATEGORICAL_COLORS[0],
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
          color: convertedPointColor || themeColors.primary,
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
        environment: convertedEnvironment,
        shading: shading,
        realisticMaterial:
          shading === 'realistic'
            ? {
                roughness: roughness,
                metalness: metalness,
              }
            : undefined,
        postEffect: enablePostEffect
          ? {
              enable: true,
              // Enable depth of field for better focus effects
              ...(enableTemporalSuperSampling && {
                SSAO: {
                  enable: true,
                  radius: 2,
                },
              }),
            }
          : undefined,
        temporalSuperSampling:
          enablePostEffect && enableTemporalSuperSampling
            ? {
                enable: true,
              }
            : undefined,
        light: {
          ambient: {
            intensity: ambientLightIntensity,
          },
          main: {
            intensity: lightIntensity,
          },
        },
        atmosphere: showAtmosphere
          ? {
              show: true,
              offset: 5,
              color: '#ffffff',
              glowPower: 6,
              innerGlowPower: 2,
            }
          : undefined,
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
    convertedEnvironment,
    convertedLineColor,
    convertedPointColor,
    pointSize,
    pointOpacity,
    shading,
    roughness,
    metalness,
    enablePostEffect,
    enableTemporalSuperSampling,
    showAtmosphere,
    lightIntensity,
    ambientLightIntensity,
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
        notMerge={true}
        lazyUpdate={false}
      />
    </div>
  );
}
