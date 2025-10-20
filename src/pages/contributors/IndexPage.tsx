import { type JSX, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { FctNodeActiveLast24h } from '@/api/types.gen';
import { fctNodeActiveLast24hServiceListOptions } from '@/api/@tanstack/react-query.gen';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { ContributoorCard } from './components/ContributoorCard';
import type { ContributorClassification } from './components/ContributoorCard';

interface Contributor {
  username: string;
  clientName: string;
  classification: ContributorClassification;
  nodeCount: number;
  lastSeen: number;
  locations: Set<string>;
  primaryCountry: string | null;
  primaryCountryCode: string | null;
  primaryCity: string | null;
  versions: Set<string>;
  consensusImplementations: Set<string>;
  countryCount: Map<string, number>;
}

// Pure utility functions extracted outside component
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
        classification: (node.classification || 'unclassified') as ContributorClassification,
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

function getDisplayVersion(versions: Set<string>): string | undefined {
  if (versions.size === 0) return undefined;
  if (versions.size === 1) return Array.from(versions)[0];
  return 'Multi Versions';
}

export function IndexPage(): JSX.Element {
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
  const error = pubError || corpError || ethError;

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

  // Memoize render function to avoid recreation on every render
  const renderContributorSection = useCallback((title: string, contributors: Contributor[]): JSX.Element | null => {
    if (contributors.length === 0) return null;

    return (
      <div className="mb-12">
        <h2 className="mb-6 text-xl/7 font-semibold text-foreground">{title}</h2>
        <ul role="list" className="md: grid grid-cols-1 gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {contributors.map(contributor => (
            <ContributoorCard
              key={contributor.clientName}
              username={contributor.username}
              classification={contributor.classification}
              nodeCount={contributor.nodeCount}
              locationCount={contributor.locations.size}
              lastSeen={contributor.lastSeen}
              primaryCountry={contributor.primaryCountryCode || undefined}
              primaryCity={contributor.primaryCity || undefined}
              clientVersion={getDisplayVersion(contributor.versions)}
              consensusImplementations={Array.from(contributor.consensusImplementations)}
              to={`/contributors/${contributor.username}`}
            />
          ))}
        </ul>
      </div>
    );
  }, []);

  if (isLoading) {
    return (
      <Container>
        <div className="flex items-center justify-center">
          <div className="text-muted">Loading contributors...</div>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <div className="rounded-sm border border-danger/20 bg-danger/10 p-4 text-danger">
          Error loading contributors: {error.message}
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <Header title="Contributoors" description={`Active node operators in the last 24 hours (${totalCount})`} />

      {renderContributorSection('Public Contributors', publicContributors)}
      {renderContributorSection('Corporate Contributors', corporateContributors)}
      {renderContributorSection('Internal (ethPandaOps)', internalContributors)}

      {totalCount === 0 && (
        <div className="rounded-sm border border-border bg-surface p-8 text-center text-muted">
          No active contributors found in the last 24 hours.
        </div>
      )}
    </Container>
  );
}
