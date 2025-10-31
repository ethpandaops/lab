import type { JSX } from 'react';
import { useMemo, useState, useEffect, useRef } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import { Link } from '@tanstack/react-router';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Dialog } from '@/components/Overlays/Dialog';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { Badge } from '@/components/Elements/Badge';
import { MapPinIcon } from '@heroicons/react/20/solid';
import { getClassificationBadgeClasses, getRelativeTime, getCountryFlag } from '@/utils';
import type { GeographicalMapViewProps } from './GeographicalMapView.types';
import type { ProcessedNode } from '../../hooks/useGeographicalData/useGeographicalData.types';

interface PointData {
  name?: string;
  coords: [number, number];
  value: number;
}

interface LocationNodes {
  city: string;
  country: string;
  coords: [number, number];
  nodes: ProcessedNode[];
}

export function GeographicalMapView({ nodes, isLoading }: GeographicalMapViewProps): JSX.Element {
  const themeColors = useThemeColors();
  const [mapLoaded, setMapLoaded] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationNodes | null>(null);
  const chartRef = useRef<ReactECharts>(null);

  // Create mapping of locations to nodes for dialog
  const locationMap = useMemo(() => {
    const map = new Map<string, LocationNodes>();
    const cityGroups = new Map<string, typeof nodes>();

    nodes.forEach(node => {
      if (
        node.meta_client_geo_longitude != null &&
        node.meta_client_geo_latitude != null &&
        !isNaN(node.meta_client_geo_longitude) &&
        !isNaN(node.meta_client_geo_latitude)
      ) {
        const cityKey = `${node.meta_client_geo_city}-${node.meta_client_geo_country_code}`;
        if (!cityGroups.has(cityKey)) {
          cityGroups.set(cityKey, []);
        }
        cityGroups.get(cityKey)!.push(node);
      }
    });

    cityGroups.forEach((cityNodes, key) => {
      const node = cityNodes[0];
      const city = node.meta_client_geo_city || 'Unknown';
      const country = node.meta_client_geo_country || 'Unknown';
      const coords: [number, number] = [node.meta_client_geo_longitude!, node.meta_client_geo_latitude!];

      map.set(key, {
        city,
        country,
        coords,
        nodes: cityNodes,
      });
    });

    return map;
  }, [nodes]);

  const pointData = useMemo<PointData[]>(() => {
    return Array.from(locationMap.values()).map(location => {
      const name = location.city ? `${location.city}, ${location.country}` : location.country;
      return {
        name,
        coords: location.coords,
        value: location.nodes.length,
      };
    });
  }, [locationMap]);

  // Load world map on mount
  useEffect(() => {
    const loadWorldMap = async (): Promise<void> => {
      try {
        const response = await fetch('/data/maps/world.json');
        const worldGeoJson = await response.json();
        echarts.registerMap('world', worldGeoJson);
        setMapLoaded(true);
      } catch (error) {
        console.error('Failed to load world map:', error);
        setMapLoaded(false);
      }
    };

    loadWorldMap();
  }, []);

  const option = useMemo(() => {
    if (!mapLoaded) {
      return { backgroundColor: 'transparent' };
    }

    const scatterData = pointData.map(point => ({
      name: point.name,
      value: [...point.coords, point.value],
    }));

    return {
      backgroundColor: 'transparent',
      animation: true,
      tooltip: {
        show: true,
        trigger: 'item',
        backgroundColor: `${themeColors.surface}f0`,
        borderColor: themeColors.border,
        borderWidth: 1,
        textStyle: {
          color: themeColors.foreground,
        },
        formatter: (params: { data?: { name?: string; value?: number[] }; name?: string }) => {
          const data = params.data;
          if (data) {
            const pointName = data.name || 'Unknown';
            const value = data.value?.[2] ?? 0;
            return `<strong>${pointName}</strong><br/>Nodes: ${value}<br/><span style="font-size: 11px; opacity: 0.7;">Click for details</span>`;
          }
          return params.name || '';
        },
      },
      geo: {
        map: 'world',
        roam: true,
        silent: false,
        center: [20, 20],
        zoom: 1.2,
        itemStyle: {
          areaColor: `${themeColors.muted}15`,
          borderColor: `${themeColors.border}30`,
          borderWidth: 0.5,
        },
        emphasis: {
          itemStyle: {
            areaColor: `${themeColors.muted}30`,
          },
          label: {
            show: false,
          },
        },
      },
      series: [
        {
          type: 'scatter',
          coordinateSystem: 'geo',
          zlevel: 3,
          symbol: 'circle',
          cursor: 'pointer',
          symbolSize: (value: number[]) => {
            const pointValue = value[2] || 1;
            const baseSize = 3;
            const maxSize = 7;
            const size = Math.min(maxSize, baseSize + Math.log(pointValue + 1) * 0.8);
            return size * 2.5;
          },
          itemStyle: {
            color: themeColors.primary,
            opacity: 0.85,
            shadowBlur: 3,
            shadowColor: themeColors.primary,
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
              borderColor: themeColors.foreground,
            },
          },
          data: scatterData,
        },
      ],
    };
  }, [mapLoaded, pointData, themeColors]);

  // Handle chart click
  const onChartClick = (params: { componentType?: string; data?: { name?: string; value?: number[] } }): void => {
    if (params.componentType === 'series' && params.data) {
      const clickedCoords = params.data.value?.slice(0, 2) as [number, number] | undefined;
      if (clickedCoords) {
        // Find the location by coordinates
        const location = Array.from(locationMap.values()).find(
          loc => loc.coords[0] === clickedCoords[0] && loc.coords[1] === clickedCoords[1]
        );
        if (location) {
          setSelectedLocation(location);
        }
      }
    }
  };

  if (isLoading) {
    return <div className="flex h-[600px] items-center justify-center">Loading map...</div>;
  }

  if (!mapLoaded) {
    return <div className="flex h-[600px] items-center justify-center text-foreground">Loading map...</div>;
  }

  if (pointData.length === 0) {
    return (
      <div className="flex h-[600px] items-center justify-center text-muted">
        No node locations found. Try adjusting your filters.
      </div>
    );
  }

  return (
    <>
      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height: 600, width: '100%' }}
        notMerge={true}
        lazyUpdate={false}
        opts={{ renderer: 'canvas' }}
        onEvents={{ click: onChartClick }}
      />

      {/* Node Details Dialog */}
      <Dialog
        open={selectedLocation !== null}
        onClose={() => setSelectedLocation(null)}
        size="full"
        title={
          selectedLocation
            ? `${selectedLocation.city}, ${selectedLocation.country} (${selectedLocation.nodes.length} node${selectedLocation.nodes.length !== 1 ? 's' : ''})`
            : 'Node Details'
        }
      >
        {selectedLocation && (
          <div className="max-h-[600px] overflow-y-auto">
            <ul role="list" className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
              {selectedLocation.nodes.map((node: ProcessedNode, index: number) => {
                const countryFlag = node.meta_client_geo_country_code
                  ? getCountryFlag(node.meta_client_geo_country_code, '')
                  : '';
                const location =
                  node.meta_client_geo_city && node.meta_client_geo_country
                    ? `${node.meta_client_geo_city}, ${node.meta_client_geo_country}`
                    : node.meta_client_geo_country || 'Unknown';

                return (
                  <li key={`${node.username}-${index}`} className="rounded-lg border border-border bg-surface p-4">
                    <div className="flex items-center gap-x-3">
                      {node.username ? (
                        <Link
                          to="/xatu/contributors/$id"
                          params={{ id: node.username }}
                          className="truncate text-sm/6 font-semibold text-foreground hover:text-primary hover:underline"
                        >
                          {node.username}
                        </Link>
                      ) : (
                        <h3 className="truncate text-sm/6 font-semibold text-foreground">Unknown</h3>
                      )}
                      {node.classification && (
                        <span
                          className={`inline-flex shrink-0 items-center rounded-sm px-1.5 py-0.5 text-xs font-medium inset-ring ${getClassificationBadgeClasses(node.classification)}`}
                        >
                          {node.classification}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-x-2 text-xs/5 text-muted">
                      <div className="flex items-center gap-x-1">
                        <MapPinIcon className="size-4" aria-hidden="true" />
                        <span>
                          {location} {countryFlag}
                        </span>
                      </div>
                      <svg viewBox="0 0 2 2" className="size-0.5 fill-current">
                        <circle r={1} cx={1} cy={1} />
                      </svg>
                      <span>{getRelativeTime(node.last_seen_date_time)}</span>
                    </div>
                    {(node.meta_consensus_implementation || node.meta_consensus_version) && (
                      <div className="mt-2 flex items-center gap-2">
                        {node.meta_consensus_implementation && (
                          <ClientLogo client={node.meta_consensus_implementation} />
                        )}
                        {node.meta_consensus_version && (
                          <Badge color="gray" variant="flat">
                            {node.meta_consensus_version.startsWith('v')
                              ? node.meta_consensus_version
                              : `v${node.meta_consensus_version}`}
                          </Badge>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </Dialog>
    </>
  );
}
