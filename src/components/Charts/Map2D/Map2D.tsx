import type React from 'react';
import { memo, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import type { Map2DChartProps, PointData, PointNodeData } from './Map2D.types';
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
/** Hovered point data for the info panel */
interface HoveredPointInfo {
  name: string;
  nodes: PointNodeData[];
}

function Map2DChartComponent({
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
  const [hoveredPoint, setHoveredPoint] = useState<HoveredPointInfo | null>(null);
  const chartRef = useRef<ReactECharts | null>(null);
  const allSeenPointsRef = useRef<Map<string, PointData>>(new Map());
  const previousResetKeyRef = useRef(resetKey);
  const previousPointsLengthRef = useRef(0);

  // Memoize derived values
  const computedPointColor = pointColor || themeColors.primary;
  const computedForegroundColor = themeColors.foreground;

  // Memoize style and opts objects to prevent ReactECharts from seeing new props every render
  const chartStyle = useMemo(() => ({ height, width: '100%', minHeight: height }), [height]);
  const chartOpts = useMemo(() => ({ renderer: 'canvas' as const }), []);

  // Load and register world map on mount - retry every 5s on failure
  useEffect(() => {
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout>;

    const loadWorldMap = async (): Promise<void> => {
      try {
        // Fetch with timeout (10 seconds)
        const timeoutPromise = new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Map load timeout')), 10000);
        });

        const fetchPromise = fetch('/data/maps/world.json', {
          signal: controller.signal,
        });

        const response = await Promise.race([fetchPromise, timeoutPromise]);
        clearTimeout(timeoutId);

        // Validate HTTP response
        if (!response.ok) {
          throw new Error(`Failed to load map: HTTP ${response.status} ${response.statusText}`);
        }

        // Parse and validate JSON
        const worldGeoJson = await response.json();

        if (!worldGeoJson || typeof worldGeoJson !== 'object') {
          throw new Error('Invalid map data: malformed GeoJSON');
        }

        // Register the map with echarts
        echarts.registerMap('world', worldGeoJson);
        setMapLoaded(true);
      } catch (error) {
        clearTimeout(timeoutId);

        // Don't retry if aborted (component unmounted)
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error loading map';
        console.error('Failed to load world map:', errorMessage, '- retrying in 5s...');

        // Retry every 5 seconds indefinitely
        timeoutId = setTimeout(() => {
          if (!controller.signal.aborted) {
            loadWorldMap();
          }
        }, 5000);
      }
    };

    loadWorldMap();

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
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
        opacity: 0.95,
        shadowBlur: 5,
        shadowColor: computedPointColor,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        borderWidth: 1,
        borderColor: `${computedForegroundColor}20`,
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
      previousPointsLengthRef.current = 0;
    }

    // If points array is empty, clear accumulated points (slot ended)
    const isClearing = points.length === 0 && allSeenPointsRef.current.size > 0;
    if (isClearing) {
      allSeenPointsRef.current.clear();
      previousPointsLengthRef.current = 0;
    }

    // Early exit: if points array length hasn't changed and we're not resetting or clearing, skip
    if (!isReset && !isClearing && points.length === previousPointsLengthRef.current) {
      return;
    }

    // Add all current points to the set of seen points (accumulate over time)
    // Filter out points without valid coordinates
    let hasNewPoints = false;
    points.forEach(point => {
      // Skip points without valid coordinates or "null island" [0, 0] fallback coords
      if (
        !point.coords ||
        point.coords.length < 2 ||
        point.coords[0] == null ||
        point.coords[1] == null ||
        (point.coords[0] === 0 && point.coords[1] === 0) // Reject [0, 0] null island
      ) {
        return;
      }
      const key = `${point.coords[0]},${point.coords[1]}`;
      if (!allSeenPointsRef.current.has(key)) {
        allSeenPointsRef.current.set(key, point);
        hasNewPoints = true;
      }
    });

    // Only update if we have new points, just reset, or clearing
    if (!hasNewPoints && !isReset && !isClearing) return;

    // Update our tracking ref
    previousPointsLengthRef.current = points.length;

    // Build point data array once
    const allPoints = Array.from(allSeenPointsRef.current.values());
    const pointData = allPoints.map(point => ({
      name: point.name,
      value: [...point.coords, point.value || 1],
      nodes: point.nodes,
    }));

    // Use cached scatter series index (routes don't change after init)
    const scatterSeriesIndex = routes.length > 0 ? 1 : 0;

    // Build minimal series update array
    const seriesUpdate: (Record<string, unknown> | null)[] = [];
    for (let i = 0; i <= scatterSeriesIndex; i++) {
      seriesUpdate.push(i === scatterSeriesIndex ? { data: pointData } : null);
    }

    // Update chart with lazy update enabled for better performance
    chart.setOption({ series: seriesUpdate }, { notMerge: false, lazyUpdate: true });
  }, [points, mapLoaded, resetKey, routes.length]);

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
        show: false, // Disabled - using custom hover panel instead
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
          areaColor: `${themeColors.muted}25`, // Increased opacity for better visibility
          borderColor: `${themeColors.border}80`, // Much more visible borders
          borderWidth: 1, // Thicker borders for better definition
        },
        emphasis: {
          itemStyle: {
            areaColor: `${themeColors.muted}40`, // More visible on hover
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

  // Handle chart events for hover panel
  const onEvents = useMemo(
    () => ({
      mouseover: (params: {
        componentType?: string;
        seriesType?: string;
        name?: string;
        data?: { name?: string; nodes?: PointNodeData[] };
      }) => {
        // Handle scatter point hover (city-level)
        if (params.componentType === 'series' && params.seriesType === 'scatter' && params.data) {
          const { name, nodes } = params.data;
          if (nodes && nodes.length > 0) {
            setHoveredPoint({ name: name || 'Unknown', nodes });
          }
          return;
        }

        // Handle geo region hover (country-level)
        if (params.componentType === 'geo' && params.name) {
          const countryName = params.name;
          // Aggregate all nodes from all points that match this country
          const allPoints = Array.from(allSeenPointsRef.current.values());
          const countryNodes: PointNodeData[] = [];

          for (const point of allPoints) {
            if (point.nodes) {
              for (const node of point.nodes) {
                if (node.country === countryName) {
                  countryNodes.push(node);
                }
              }
            }
          }

          if (countryNodes.length > 0) {
            // Sort by timing
            countryNodes.sort((a, b) => a.timing - b.timing);
            setHoveredPoint({ name: countryName, nodes: countryNodes });
          }
        }
      },
      mouseout: (params: { componentType?: string; seriesType?: string }) => {
        if ((params.componentType === 'series' && params.seriesType === 'scatter') || params.componentType === 'geo') {
          setHoveredPoint(null);
        }
      },
    }),
    []
  );

  // Format timing value for display
  const formatTiming = (timing: number): string => {
    return timing >= 1000 ? `${(timing / 1000).toFixed(2)}s` : `${timing}ms`;
  };

  // Always render the map container
  return (
    <div className="relative h-full w-full">
      {/* Fixed hover panel at top */}
      {hoveredPoint && (
        <div className="pointer-events-none absolute top-3 left-1/2 z-10 -translate-x-1/2">
          <div className="rounded-lg border border-border bg-surface/95 px-4 py-3 shadow-lg backdrop-blur-sm">
            <div className="mb-2 border-b border-border pb-2 text-center">
              <span className="text-sm font-semibold text-foreground">{hoveredPoint.name}</span>
              <span className="ml-2 text-xs text-muted">({hoveredPoint.nodes.length} nodes)</span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted">
                    <th className="pr-4 pb-1 text-left font-medium">Node ID</th>
                    <th className="pr-4 pb-1 text-left font-medium">Username</th>
                    <th className="pr-4 pb-1 text-left font-medium">Client</th>
                    <th className="pb-1 text-right font-medium">Timing</th>
                  </tr>
                </thead>
                <tbody>
                  {hoveredPoint.nodes.map((node, idx) => (
                    <tr key={`${node.nodeId}-${idx}`} className="text-foreground">
                      <td className="max-w-[180px] truncate py-0.5 pr-4 font-mono text-[11px] opacity-80">
                        {node.nodeId}
                      </td>
                      <td className="py-0.5 pr-4">{node.username || <span className="text-muted">—</span>}</td>
                      <td className="py-0.5 pr-4 capitalize">{node.client || <span className="text-muted">—</span>}</td>
                      <td className="py-0.5 text-right font-mono whitespace-nowrap opacity-80">
                        {formatTiming(node.timing)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <ReactECharts
        ref={chartRef}
        option={option}
        style={chartStyle}
        notMerge={false}
        lazyUpdate={true}
        opts={chartOpts}
        onEvents={onEvents}
      />
      <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-surface/90 px-2 py-1 text-xs text-muted backdrop-blur-sm">
        Data from nodes contributing to Xatu • Not representative of actual Ethereum network distribution
      </div>
    </div>
  );
}

const arePropsEqual = (prevProps: Map2DChartProps, nextProps: Map2DChartProps): boolean => {
  return (
    prevProps.routes === nextProps.routes &&
    prevProps.points === nextProps.points &&
    prevProps.title === nextProps.title &&
    prevProps.height === nextProps.height &&
    prevProps.showEffect === nextProps.showEffect &&
    prevProps.lineColor === nextProps.lineColor &&
    prevProps.pointColor === nextProps.pointColor &&
    prevProps.pointSizeMultiplier === nextProps.pointSizeMultiplier &&
    prevProps.roam === nextProps.roam &&
    prevProps.resetKey === nextProps.resetKey
  );
};

export const Map2DChart = memo(Map2DChartComponent, arePropsEqual);
