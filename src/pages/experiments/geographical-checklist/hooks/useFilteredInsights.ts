import { useMemo } from 'react';
import type { ProcessedNode, ClientImplementationStats, LocationStats } from './useGeographicalData';
import { TOP_LOCATIONS_LIMIT } from '../constants';

export interface FilteredInsights {
  clientData: ClientImplementationStats[];
  topCountries: LocationStats[];
  topCities: LocationStats[];
}

/**
 * Custom hook to compute insights (client distribution, top countries/cities) from filtered nodes
 * Optimized to aggregate all data in a single pass through the nodes array
 */
export function useFilteredInsights(filteredNodes: ProcessedNode[]): FilteredInsights {
  return useMemo(() => {
    const clientCounts = new Map<string, number>();
    const countryCounts = new Map<string, number>();
    const countryMetadata = new Map<string, { name: string; code: string; emoji: string }>();
    const cityCounts = new Map<string, number>();
    const cityMetadata = new Map<string, { name: string; countryName: string }>();

    // Single-pass aggregation for maximum efficiency
    filteredNodes.forEach(node => {
      // Client implementation counts
      const client = node.meta_consensus_implementation || 'Unknown';
      clientCounts.set(client, (clientCounts.get(client) || 0) + 1);

      // Country counts and metadata
      const countryCode = node.meta_client_geo_country_code || 'UNKNOWN';
      const countryName = node.meta_client_geo_country || 'Unknown';
      countryCounts.set(countryCode, (countryCounts.get(countryCode) || 0) + 1);
      if (!countryMetadata.has(countryCode)) {
        countryMetadata.set(countryCode, {
          name: countryName,
          code: countryCode,
          emoji: node.countryFlag,
        });
      }

      // City counts and metadata
      const cityName = node.meta_client_geo_city || 'Unknown';
      const cityKey = `${cityName}, ${countryName}`;
      cityCounts.set(cityKey, (cityCounts.get(cityKey) || 0) + 1);
      if (!cityMetadata.has(cityKey)) {
        cityMetadata.set(cityKey, { name: cityName, countryName });
      }
    });

    // Transform client counts to ClientImplementationStats
    const totalNodes = filteredNodes.length;
    const clientData = Array.from(clientCounts.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalNodes > 0 ? (count / totalNodes) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Transform country counts to LocationStats (top N)
    const topCountries = Array.from(countryCounts.entries())
      .map(([code, count]) => {
        const metadata = countryMetadata.get(code)!;
        return {
          name: metadata.name,
          code: metadata.code,
          emoji: metadata.emoji,
          count,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_LOCATIONS_LIMIT);

    // Transform city counts to LocationStats (top N)
    const topCities = Array.from(cityCounts.entries())
      .map(([cityKey, count]) => {
        const metadata = cityMetadata.get(cityKey)!;
        return {
          name: `${metadata.name}, ${metadata.countryName}`,
          count,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_LOCATIONS_LIMIT);

    return { clientData, topCountries, topCities };
  }, [filteredNodes]);
}
