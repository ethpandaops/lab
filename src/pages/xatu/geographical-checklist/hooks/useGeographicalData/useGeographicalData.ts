import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fctNodeActiveLast24hServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { FctNodeActiveLast24h } from '@/api/types.gen';
import type {
  UseGeographicalDataReturn,
  ProcessedNode,
  ContinentData,
  GeographicalStats,
  ContinentCode,
  NodeClassification,
} from './useGeographicalData.types';
import { CONTINENT_CONFIG, getContinentCode, getClassification } from './utils';
import { getCountryFlag } from '@/utils';

export function useGeographicalData(): UseGeographicalDataReturn {
  // Three parallel queries for pub-, corp-, ethpandaops nodes
  const {
    data: publicData,
    error: publicError,
    isLoading: publicLoading,
  } = useQuery({
    ...fctNodeActiveLast24hServiceListOptions({
      query: {
        meta_client_name_starts_with: 'pub-',
        page_size: 1000,
      },
    }),
  });

  const {
    data: corporateData,
    error: corporateError,
    isLoading: corporateLoading,
  } = useQuery({
    ...fctNodeActiveLast24hServiceListOptions({
      query: {
        meta_client_name_starts_with: 'corp-',
        page_size: 1000,
      },
    }),
  });

  const {
    data: internalData,
    error: internalError,
    isLoading: internalLoading,
  } = useQuery({
    ...fctNodeActiveLast24hServiceListOptions({
      query: {
        meta_client_name_starts_with: 'ethpandaops',
        page_size: 1000,
      },
    }),
  });

  // Combine loading states
  const isLoading = publicLoading || corporateLoading || internalLoading;
  const error = publicError || corporateError || internalError;

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
          lastUpdated: 0,
          uniqueVersions: 0,
          byClassification: { individual: 0, corporate: 0, internal: 0 },
          byClientImplementation: [],
          topCountries: [],
          topCities: [],
        },
        allNodes: [],
      };
    }

    const rawNodes: FctNodeActiveLast24h[] = [
      ...(publicData?.fct_node_active_last_24h || []),
      ...(corporateData?.fct_node_active_last_24h || []),
      ...(internalData?.fct_node_active_last_24h || []),
    ];

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

      // Get or create city
      if (!country.cities.has(cityName)) {
        country.cities.set(cityName, {
          name: cityName,
          countryName,
          countryCode,
          coords: [lon, lat],
          nodes: [],
        });
        continent.totalCities++;
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
      lastUpdated: Math.max(...processedNodes.map(n => n.last_seen_date_time || 0)),
      uniqueVersions: 0,
      byClassification: {
        individual: processedNodes.filter(n => n.classification === 'individual').length,
        corporate: processedNodes.filter(n => n.classification === 'corporate').length,
        internal: processedNodes.filter(n => n.classification === 'internal').length,
      },
      byClientImplementation,
      topCountries: [],
      topCities: [],
    };

    return { continents: continentsMap, stats, allNodes: processedNodes };
  }, [publicData, corporateData, internalData, isLoading, error]);

  return {
    continents,
    stats,
    allNodes,
    isLoading,
    error: error as Error | null,
  };
}
