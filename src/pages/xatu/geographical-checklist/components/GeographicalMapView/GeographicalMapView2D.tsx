import type { JSX } from 'react';
import { useMemo } from 'react';
import { Map2DChart } from '@/components/Charts/Map2D';
import { useThemeColors } from '@/hooks/useThemeColors';
import { MAP_MIN_DISTANCE, MAP_MAX_DISTANCE } from '../../constants';
import type { GeographicalMapViewProps } from './GeographicalMapView.types';
import type { PointData } from '@/components/Charts/Map2D/Map2D.types';

/**
 * GeographicalMapView2D - High-performance 2D map version
 *
 * This version uses the 2D canvas-based map instead of 3D WebGL.
 * Benefits:
 * - 3-5x faster performance
 * - Smoother progressive updates
 * - Lower memory usage
 * - Better for large datasets (1000+ nodes)
 */
export function GeographicalMapView2D({ nodes, isLoading }: GeographicalMapViewProps): JSX.Element {
  const themeColors = useThemeColors();

  const pointData = useMemo<PointData[]>(() => {
    // Group nodes by city to calculate point sizes
    const cityGroups = new Map<string, typeof nodes>();

    nodes.forEach(node => {
      const cityKey = `${node.meta_client_geo_city}-${node.meta_client_geo_country_code}`;
      if (!cityGroups.has(cityKey)) {
        cityGroups.set(cityKey, []);
      }
      cityGroups.get(cityKey)!.push(node);
    });

    // Convert to point data with size based on node count
    return Array.from(cityGroups.entries()).map(([, cityNodes]) => {
      const node = cityNodes[0];
      const lon = node.meta_client_geo_longitude ?? 0;
      const lat = node.meta_client_geo_latitude ?? 0;

      // Build name with city and country, handling missing city
      const city = node.meta_client_geo_city;
      const country = node.meta_client_geo_country;
      const name = city ? `${city}, ${country}` : country || 'Unknown';

      return {
        name,
        coords: [lon, lat] as [number, number],
        value: cityNodes.length,
      };
    });
  }, [nodes]);

  if (isLoading) {
    return <div className="flex h-[600px] items-center justify-center">Loading map...</div>;
  }

  if (pointData.length === 0) {
    return (
      <div className="flex h-[600px] items-center justify-center text-muted">
        No node locations found. Try adjusting your filters.
      </div>
    );
  }

  return (
    <Map2DChart
      points={pointData}
      height={600}
      pointSizeMultiplier={0.8}
      pointColor={themeColors.primary}
      mapColor={themeColors.muted}
      roam={true}
      animationDuration={300}
    />
  );
}
