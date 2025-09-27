import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { Link } from '@tanstack/react-router';
import { formatDistanceToNow } from 'date-fns';
import { Card } from '@/components/common/Card';
import { useNetwork } from '@/stores/appStore';
import { getRestApiClient } from '@/api';
import { useQuery } from '@tanstack/react-query';
import { aggregateContributorSummary } from '@/utils/transformers';
import { NetworkSelector } from '@/components/common/NetworkSelector';

interface Contributor {
  name: string;
  node_count: number;
  updated_at: number;
}

interface Summary {
  contributors: Contributor[];
  updated_at: number;
}

// Function to generate a deterministic color from a string
const stringToColor = (str: string): string => {
  let hash = 0;
  for (let index = 0; index < str.length; index++) {
    hash = (str.codePointAt(index) ?? 0) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 60%)`;
};

// Function to generate initials from a string
const getInitials = (name: string): string =>
  name
    .split(/[^\dA-Za-z]/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();

// Function to safely format a timestamp
const formatTimestamp = (timestamp: number): string => {
  try {
    const date = new Date(timestamp * 1000);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    return formatDistanceToNow(date, { addSuffix: true });
  } catch (e) {
    return 'Invalid date';
  }
};

const ContributorsList = () => {
  const { selectedNetwork, setSelectedNetwork } = useNetwork();

  // Fetch contributors data using REST API only - no conditionals!
  const {
    data: summaryData,
    isLoading,
    error,
  } = useQuery<Summary>({
    queryKey: ['xatu-data-contributors', selectedNetwork],
    queryFn: async () => {
      const client = await getRestApiClient();
      const response = await client.getNodes(selectedNetwork);
      // Aggregate nodes by username for selected network
      return aggregateContributorSummary(response.nodes);
    },
    enabled: !!selectedNetwork,
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  if (error) {
    return <ErrorState message="Failed to load contributors data" />;
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (!summaryData || !summaryData.contributors) {
    return <ErrorState message="No data available" />;
  }

  return (
    <div className="space-y-8">
      {/* About Section */}
      <Card className="card-primary">
        <div className="card-body">
          <div className="flex flex-col">
            <h2 className="text-xl font-sans font-bold text-primary mb-2">About</h2>
            <p className="text-base font-mono text-secondary">
              These are the amazing contributors who are helping us monitor the Ethereum network.
              All data is anonymized and no personally identifiable information is collected.
            </p>
            <div className="text-sm font-mono text-tertiary mt-4">
              Last updated{' '}
              <span
                title={new Date(summaryData.updated_at * 1000).toString()}
                className="text-primary cursor-help -b -prominent"
              >
                {formatTimestamp(summaryData.updated_at)}
              </span>
              {' • '}
              <span className="text-accent">{selectedNetwork}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Contributors List */}
      <Card className="relative z-10 card-primary overflow-visible">
        <div className="card-header">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-col">
              <h2 className="text-xl font-sans font-bold text-primary mb-2">Contributors</h2>
              <p className="text-base font-mono text-secondary">
                {summaryData.contributors.length} active contributors on {selectedNetwork}
              </p>
            </div>
            <NetworkSelector
              selectedNetwork={selectedNetwork}
              onNetworkChange={setSelectedNetwork}
              className="w-48"
            />
          </div>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {summaryData.contributors
              .sort((a, b) => b.node_count - a.node_count)
              .map((contributor, index) => {
                const avatarColor = stringToColor(contributor.name);
                const initials = getInitials(contributor.name);
                const isRecent = Date.now() / 1000 - contributor.updated_at < 3600; // Active in last hour

                return (
                  <Link
                    key={contributor.name}
                    to="/xatu-data/contributors/$name"
                    params={{ name: contributor.name }}
                    className="block group"
                  >
                    <div className="relative bg-surface/20 hover:bg-surface/40 border border-subtle/30 hover:border-accent/40 rounded-xl p-5 transition-all duration-200 h-full overflow-hidden">
                      {/* Gradient accent on hover */}
                      <div
                        className="absolute inset-x-0 top-0 h-px bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                          background: `linear-gradient(90deg, transparent, ${avatarColor}, transparent)`,
                        }}
                      />

                      <div className="flex items-start gap-4">
                        {/* Avatar with status */}
                        <div className="relative">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-mono font-bold text-white transition-transform group-hover:scale-105"
                            style={{
                              backgroundColor: avatarColor,
                              boxShadow: `0 4px 12px ${avatarColor}40`,
                            }}
                          >
                            {initials}
                          </div>
                          {isRecent && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-surface">
                              <div className="w-full h-full bg-green-400 rounded-full animate-ping" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-mono text-primary group-hover:text-accent transition-colors truncate">
                              {contributor.name}
                            </h3>
                            <div className="flex items-baseline gap-1">
                              <span className="text-lg font-bold text-accent">
                                {contributor.node_count}
                              </span>
                              <span className="text-xs text-tertiary">
                                node{contributor.node_count !== 1 ? 's' : ''}
                              </span>
                            </div>
                          </div>

                          <div className="text-xs text-secondary">
                            {formatTimestamp(contributor.updated_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
          </div>
        </div>
      </Card>

      {/* Data Note */}
      <div className="text-center py-4">
        <p className="text-xs font-mono text-tertiary">
          Note: This data represents only nodes sending data to the Xatu project and is not
          representative of the total network.
        </p>
      </div>
    </div>
  );
};

export default ContributorsList;
