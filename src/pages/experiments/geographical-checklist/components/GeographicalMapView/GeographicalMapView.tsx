import type { JSX } from 'react';
import { useMemo, useState, useEffect } from 'react';
import { MapChart } from '@/components/Charts/Map';
import { MAP_MIN_DISTANCE, MAP_MAX_DISTANCE } from '../../constants';
import type { GeographicalMapViewProps } from './GeographicalMapView.types';
import type { PointData } from '@/components/Charts/Map/Map.types';

export function GeographicalMapView({ nodes, isLoading }: GeographicalMapViewProps): JSX.Element {
  // Detect dark mode
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  });

  useEffect(() => {
    // Watch for theme changes
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

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

  // Theme-aware colors - softer contrast for light mode
  const environment = isDark ? '#0a0a0a' : '#ffffff'; // dark: zinc-950, light: white
  const mapColor = isDark ? '#52525b' : '#d4d4d8'; // dark: zinc-600, light: zinc-300

  return (
    <MapChart
      points={pointData}
      height={600}
      pointSize={6}
      environment={environment}
      mapColor={mapColor}
      regionHeight={0}
      minDistance={MAP_MIN_DISTANCE}
      maxDistance={MAP_MAX_DISTANCE}
    />
  );
}
