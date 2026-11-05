import { useMemo } from 'react';
import type { NodeRange } from '@/pages/xatu/nodes/constants';
import { useLastSeenNodes } from '@/pages/xatu/nodes/hooks/useLastSeenNodes';
import type {
  UseGeographicalDataReturn,
  ProcessedNode,
  ContinentData,
  GeographicalStats,
  ContinentCode,
  NodeClassification,
} from './useGeographicalData.types';
import { CONTINENT_CONFIG, getContinentCode, getClassification } from './useGeographicalData.utils';
import { getCountryFlag } from '@/utils';

/**
 * Xatu nodes last seen inside the range, by continent, country and city
 */
export function useGeographicalData(range: NodeRange): UseGeographicalDataReturn {
  const { nodes: rawNodes, isLoading, error } = useLastSeenNodes(range);

  // Process and aggregate data
  const { continents, stats, allNodes } = useMemo(() => {
    if (isLoading || error) {
      return {
        continents: new Map<ContinentCode, ContinentData>(),
        stats: {
          totalNodes: 0,
          totalContinents: 0,
          totalCountries: 0,
          totalCities: 0,
          byClientImplementation: [],
        },
        allNodes: [],
      };
    }

    // Process nodes with classification and continent metadata
    const processedNodes: ProcessedNode[] = rawNodes.map(node => {
      const continentCode = getContinentCode(node.meta_client_geo_continent_code);
      const continentConfig = CONTINENT_CONFIG[continentCode];
      // Use the classification from the API, map institution -> corporate
      const apiClassification = node.classification || getClassification(node.meta_client_name);
      // Map API's "institution" to our "corporate"
      const classification: NodeClassification =
        apiClassification === 'institution' ? 'corporate' : (apiClassification as NodeClassification);

      return {
        ...node,
        classification,
        continentCode,
        continentName: continentConfig.name,
        continentEmoji: continentConfig.emoji,
        countryFlag: getCountryFlag(node.meta_client_geo_country_code),
      };
    });

    // Build hierarchical structure: Continent → Country → City → Nodes
    const continentsMap = new Map<ContinentCode, ContinentData>();

    processedNodes.forEach(node => {
      const continentCode = node.continentCode;
      const countryCode = node.meta_client_geo_country_code || 'UNKNOWN';
      const countryName = node.meta_client_geo_country || 'Unknown';
      const cityName = node.meta_client_geo_city || 'Unknown';
      const lon = node.meta_client_geo_longitude ?? 0;
      const lat = node.meta_client_geo_latitude ?? 0;

      // Get or create continent
      if (!continentsMap.has(continentCode)) {
        const config = CONTINENT_CONFIG[continentCode];
        continentsMap.set(continentCode, {
          code: continentCode,
          name: config.name,
          emoji: config.emoji,
          color: config.color,
          countries: new Map(),
          totalNodes: 0,
          totalCountries: 0,
          totalCities: 0,
        });
      }
      const continent = continentsMap.get(continentCode)!;
      continent.totalNodes++;

      // Get or create country
      if (!continent.countries.has(countryCode)) {
        continent.countries.set(countryCode, {
          name: countryName,
          code: countryCode,
          emoji: getCountryFlag(countryCode),
          cities: new Map(),
          totalNodes: 0,
        });
        continent.totalCountries++;
      }
      const country = continent.countries.get(countryCode)!;
      country.totalNodes++;

      // Get or create city; nodes without one are grouped under "Unknown" but it isn't counted as a city
      if (!country.cities.has(cityName)) {
        country.cities.set(cityName, {
          name: cityName,
          countryName,
          countryCode,
          coords: [lon, lat],
          nodes: [],
        });
        if (node.meta_client_geo_city) continent.totalCities++;
      }
      const city = country.cities.get(cityName)!;
      city.nodes.push(node);
    });

    // Calculate client implementation statistics
    const clientImplMap = new Map<string, number>();
    processedNodes.forEach(node => {
      const impl = node.meta_consensus_implementation || 'Unknown';
      clientImplMap.set(impl, (clientImplMap.get(impl) || 0) + 1);
    });

    const byClientImplementation = Array.from(clientImplMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: (count / processedNodes.length) * 100,
      }))
      .sort((a, b) => b.count - a.count);

    // Calculate statistics
    const stats: GeographicalStats = {
      totalNodes: processedNodes.length,
      totalContinents: continentsMap.size,
      totalCountries: Array.from(continentsMap.values()).reduce((sum, c) => sum + c.countries.size, 0),
      totalCities: Array.from(continentsMap.values()).reduce((sum, c) => sum + c.totalCities, 0),
      byClientImplementation,
    };

    return { continents: continentsMap, stats, allNodes: processedNodes };
  }, [rawNodes, isLoading, error]);

  return {
    continents,
    stats,
    allNodes,
    isLoading,
    error,
  };
}
