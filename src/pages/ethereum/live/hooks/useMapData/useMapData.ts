import { useMemo } from 'react';
import type { FctBlockFirstSeenByNode } from '@/api/types.gen';
import type { PointData } from '@/components/Charts/Map/Map.types';

export interface MapPointWithTiming extends PointData {
  earliestSeenTime: number; // Earliest seen_slot_start_diff for this city group
}

export function useMapData(nodes: FctBlockFirstSeenByNode[]): MapPointWithTiming[] {
  return useMemo(() => {
    // Group nodes by city/country for aggregation
    const cityGroups = new Map<string, FctBlockFirstSeenByNode[]>();

    nodes.forEach(node => {
      const cityKey = `${node.meta_client_geo_city}-${node.meta_client_geo_country_code}`;
      if (!cityGroups.has(cityKey)) {
        cityGroups.set(cityKey, []);
      }
      cityGroups.get(cityKey)!.push(node);
    });

    // Convert to PointData format with timing information
    return Array.from(cityGroups.entries())
      .map(([, cityNodes]) => {
        const node = cityNodes[0];
        const name = node.meta_client_geo_city
          ? `${node.meta_client_geo_city}, ${node.meta_client_geo_country}`
          : (node.meta_client_geo_country ?? 'Unknown');

        // Find the earliest seen time for this city group
        const earliestSeenTime = Math.min(
          ...cityNodes.map(n => n.seen_slot_start_diff ?? Infinity).filter(time => time !== Infinity)
        );

        // Get coordinates - return null if invalid
        const lon = node.meta_client_geo_longitude;
        const lat = node.meta_client_geo_latitude;

        return {
          name,
          coords: [lon ?? null, lat ?? null] as [number | null, number | null],
          value: cityNodes.length, // Number of nodes at this location
          earliestSeenTime: earliestSeenTime === Infinity ? 0 : earliestSeenTime,
        };
      })
      .filter(point => {
        // Filter out points with invalid coordinates or null island [0, 0]
        return point.coords[0] != null && point.coords[1] != null && !(point.coords[0] === 0 && point.coords[1] === 0);
      }) as MapPointWithTiming[];
  }, [nodes]);
}
