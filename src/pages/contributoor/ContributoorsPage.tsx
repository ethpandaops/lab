import { useNavigate } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import type { FctNodeActiveLast24h } from '@/api/types.gen';
import { fctNodeActiveLast24hServiceListOptions } from '@/api/@tanstack/react-query.gen';
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

function processNodes(nodes: FctNodeActiveLast24h[]): Contributor[] {
  const contributorMap = new Map<string, Contributor>();

  nodes.forEach(node => {
    const clientName = node.meta_client_name || 'Unknown';
    const username = node.username || clientName;
    const existing = contributorMap.get(username);

    if (existing) {
      existing.nodeCount++;
      existing.lastSeen = Math.max(existing.lastSeen, node.last_seen_date_time || 0);

      // Track all unique consensus implementations
      if (node.meta_consensus_implementation) {
        existing.consensusImplementations.add(node.meta_consensus_implementation);
      }

      // Track all unique versions
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
        consensusImplementations: new Set(node.meta_consensus_implementation ? [node.meta_consensus_implementation] : []),
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

export function ContributoorsPage() {
  const navigate = useNavigate();

  const { data: pubData, error: pubError, isLoading: pubLoading } = useQuery({
    ...fctNodeActiveLast24hServiceListOptions({
      query: {
        meta_client_name_starts_with: 'pub-',
        page_size: 1000,
      },
    }),
  });

  const { data: corpData, error: corpError, isLoading: corpLoading } = useQuery({
    ...fctNodeActiveLast24hServiceListOptions({
      query: {
        meta_client_name_starts_with: 'corp-',
        page_size: 1000,
      },
    }),
  });

  const { data: ethData, error: ethError, isLoading: ethLoading } = useQuery({
    ...fctNodeActiveLast24hServiceListOptions({
      query: {
        meta_client_name_starts_with: 'ethpandaops',
        page_size: 1000,
      },
    }),
  });

  const isLoading = pubLoading || corpLoading || ethLoading;
  const error = pubError || corpError || ethError;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="text-secondary">Loading contributors...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          Error loading contributors: {error.message}
        </div>
      </div>
    );
  }

  // Process each category separately - no need to combine and re-categorize!
  const publicContributors = processNodes(pubData?.fct_node_active_last_24h ?? []);
  const corporateContributors = processNodes(corpData?.fct_node_active_last_24h ?? []);
  const internalContributors = processNodes(ethData?.fct_node_active_last_24h ?? []);

  const totalCount = publicContributors.length + corporateContributors.length + internalContributors.length;

  const renderContributorSection = (title: string, contributors: Contributor[]) => {
    if (contributors.length === 0) return null;

    return (
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-primary">{title}</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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
              onClick={() => navigate({ to: '/contributoor/$id', params: { id: contributor.username } })}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-6 text-3xl font-bold text-primary">Contributoors</h1>
      <p className="mb-8 text-secondary">Active node operators in the last 24 hours ({totalCount})</p>

      {renderContributorSection('Public Contributors', publicContributors)}
      {renderContributorSection('Corporate Contributors', corporateContributors)}
      {renderContributorSection('Internal (ethPandaOps)', internalContributors)}

      {totalCount === 0 && (
        <div className="rounded-lg border border-border bg-surface-secondary p-8 text-center text-secondary">
          No active contributors found in the last 24 hours.
        </div>
      )}
    </div>
  );
}
