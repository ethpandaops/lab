import { useMemo } from 'react';
import type { FctNodeLastSeen } from '@/api/types.gen';
import type { NodeRange } from '@/pages/xatu/nodes/constants';
import { useLastSeenNodes } from '@/pages/xatu/nodes/hooks/useLastSeenNodes';
import type { UserClassification } from '../../components/UserCard';
import type { Contributor, UseContributorsDataReturn } from './useContributorsData.types';

/**
 * Processes raw node data into aggregated contributor information
 */
function processNodes(nodes: FctNodeLastSeen[]): Contributor[] {
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

      if (node.meta_client_implementation) {
        existing.collectors.add(node.meta_client_implementation);
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
        versions: new Set(node.meta_client_version ? [node.meta_client_version] : []),
        collectors: new Set(node.meta_client_implementation ? [node.meta_client_implementation] : []),
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
 * Contributors with Xatu nodes last seen inside the range, grouped into public, corporate and internal by node name
 */
export function useContributorsData(range: NodeRange): UseContributorsDataReturn {
  const { nodes, isLoading, error } = useLastSeenNodes(range);

  const { publicContributors, corporateContributors, internalContributors } = useMemo(() => {
    const byPrefix = (prefix: string): Contributor[] =>
      processNodes(nodes.filter(node => node.meta_client_name?.startsWith(prefix)));
    return {
      publicContributors: byPrefix('pub-'),
      corporateContributors: byPrefix('corp-'),
      internalContributors: byPrefix('ethpandaops'),
    };
  }, [nodes]);

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
 * The one value in a set, "several" for more, or undefined for none
 */
export function getDisplayVersion(versions: Set<string>): string | undefined {
  if (versions.size === 0) return undefined;
  if (versions.size === 1) return Array.from(versions)[0];
  return 'several';
}
