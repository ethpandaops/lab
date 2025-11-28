import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { FctNodeActiveLast24h } from '@/api/types.gen';
import { fctNodeActiveLast24hServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { UserClassification } from '../../components/UserCard';
import type { Contributor, UseContributorsDataReturn } from './useContributorsData.types';

/**
 * Processes raw node data into aggregated contributor information
 */
function processNodes(nodes: FctNodeActiveLast24h[]): Contributor[] {
  const contributorMap = new Map<string, Contributor>();

  nodes.forEach(node => {
    const clientName = node.meta_client_name || 'Unknown';
    const username = node.username || clientName;
    const existing = contributorMap.get(username);

    if (existing) {
      existing.nodeCount++;
      existing.lastSeen = Math.max(existing.lastSeen, node.last_seen_date_time || 0);

      if (node.meta_consensus_implementation) {
        existing.consensusImplementations.add(node.meta_consensus_implementation);
      }

      if (node.meta_client_version) {
        existing.versions.add(node.meta_client_version);
      }

      if (node.meta_client_geo_country) {
        existing.locations.add(node.meta_client_geo_country);
        const currentCount = existing.countryCount.get(node.meta_client_geo_country) || 0;
        existing.countryCount.set(node.meta_client_geo_country, currentCount + 1);
      }
    } else {
      const countryCount = new Map<string, number>();
      if (node.meta_client_geo_country) {
        countryCount.set(node.meta_client_geo_country, 1);
      }

      contributorMap.set(username, {
        username,
        clientName,
        classification: (node.classification || 'unclassified') as UserClassification,
        nodeCount: 1,
        lastSeen: node.last_seen_date_time || 0,
        locations: new Set(node.meta_client_geo_country ? [node.meta_client_geo_country] : []),
        primaryCountry: node.meta_client_geo_country || null,
        primaryCountryCode: node.meta_client_geo_country_code || null,
        primaryCity: node.meta_client_geo_city || null,
        versions: new Set(node.meta_client_version ? [node.meta_client_version] : []),
        consensusImplementations: new Set(
          node.meta_consensus_implementation ? [node.meta_consensus_implementation] : []
        ),
        countryCount,
      });
    }
  });

  // Calculate primary country (most nodes) for each contributor
  contributorMap.forEach(contributor => {
    if (contributor.countryCount.size > 0) {
      const sortedCountries = Array.from(contributor.countryCount.entries()).sort((a, b) => b[1] - a[1]);
      contributor.primaryCountry = sortedCountries[0][0];
    }
  });

  return Array.from(contributorMap.values()).sort((a, b) => b.nodeCount - a.nodeCount);
}

/**
 * Custom hook to fetch and process contributors data
 * Fetches data for public, corporate, and internal contributors
 * and aggregates the node information for each contributor
 */
export function useContributorsData(): UseContributorsDataReturn {
  // Fetch public contributors
  const {
    data: pubData,
    error: pubError,
    isLoading: pubLoading,
  } = useQuery({
    ...fctNodeActiveLast24hServiceListOptions({
      query: {
        meta_client_name_starts_with: 'pub-',
        page_size: 1000,
      },
    }),
  });

  // Fetch corporate contributors
  const {
    data: corpData,
    error: corpError,
    isLoading: corpLoading,
  } = useQuery({
    ...fctNodeActiveLast24hServiceListOptions({
      query: {
        meta_client_name_starts_with: 'corp-',
        page_size: 1000,
      },
    }),
  });

  // Fetch internal (ethPandaOps) contributors
  const {
    data: ethData,
    error: ethError,
    isLoading: ethLoading,
  } = useQuery({
    ...fctNodeActiveLast24hServiceListOptions({
      query: {
        meta_client_name_starts_with: 'ethpandaops',
        page_size: 1000,
      },
    }),
  });

  const isLoading = pubLoading || corpLoading || ethLoading;
  const error = (pubError || corpError || ethError) as Error | null;

  // Memoize processed contributor lists to avoid reprocessing on every render
  const publicContributors = useMemo(
    () => processNodes(pubData?.fct_node_active_last_24h ?? []),
    [pubData?.fct_node_active_last_24h]
  );

  const corporateContributors = useMemo(
    () => processNodes(corpData?.fct_node_active_last_24h ?? []),
    [corpData?.fct_node_active_last_24h]
  );

  const internalContributors = useMemo(
    () => processNodes(ethData?.fct_node_active_last_24h ?? []),
    [ethData?.fct_node_active_last_24h]
  );

  const totalCount = publicContributors.length + corporateContributors.length + internalContributors.length;

  return {
    publicContributors,
    corporateContributors,
    internalContributors,
    totalCount,
    isLoading,
    error,
  };
}

/**
 * Utility function to get display version string
 * Returns single version, "Multi Versions" for multiple, or undefined for none
 */
export function getDisplayVersion(versions: Set<string>): string | undefined {
  if (versions.size === 0) return undefined;
  if (versions.size === 1) return Array.from(versions)[0];
  return 'Multi Versions';
}
