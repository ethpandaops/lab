import { useParams } from 'react-router-dom';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { formatDistanceToNow } from 'date-fns';
import { XatuCallToAction } from '@/components/xatu/XatuCallToAction';
import { NETWORK_METADATA, type NetworkKey } from '@/constants/networks.tsx';
import { Card } from '@/components/common/Card';
import useNetwork from '@/contexts/network';
import { getRestApiClient } from '@/api';
import { useQuery } from '@tanstack/react-query';
import { transformNodeToContributor } from '@/utils/transformers';
import { NetworkSelector } from '@/components/common/NetworkSelector';

interface ContributorNode {
  network: string;
  client_name: string;
  consensus_client: string;
  consensus_version: string;
  country: string;
  city: string;
  continent: string;
  latest_slot: number;
  latest_slot_start_date_time: number;
  client_implementation: string;
  client_version: string;
}

interface ContributorData {
  name: string;
  nodes: ContributorNode[];
  updated_at: number;
}

type NetworkNodes = Record<string, ContributorNode[]>;

const NETWORK_ORDER = ['mainnet', 'holesky', 'sepolia'];
const OFFLINE_THRESHOLD = 3600; // 1 hour in seconds

// Function to generate a deterministic color from a string
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 60%)`;
};

// Function to generate initials from a string
const getInitials = (name: string) => {
  return name
    .split(/[^a-zA-Z0-9]/)
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0])
    .join('')
    .toUpperCase();
};

function getShortNodeName(fullName: string): string {
  const parts = fullName.split('/');
  const lastPart = parts.at(-1) ?? '';
  if (lastPart.startsWith('hashed-')) {
    return lastPart.split('-').at(-1) ?? '';
  }
  return lastPart;
}

function capitalizeWords(input: string): string {
  return input
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function isNodeOffline(node: ContributorNode, updatedAt: number): boolean {
  return updatedAt - node.latest_slot_start_date_time > OFFLINE_THRESHOLD;
}

function ContributorDetail() {
  const { name } = useParams<{ name: string }>();
  const { selectedNetwork, setSelectedNetwork } = useNetwork();

  // Fetch contributor data using REST API only - no conditionals!
  const {
    data: contributor,
    isLoading,
    error,
  } = useQuery<ContributorData>({
    queryKey: ['xatu-data-contributor', name, selectedNetwork],
    queryFn: async () => {
      const client = await getRestApiClient();
      const response = await client.getNodes(selectedNetwork, {
        username: { eq: name || '' },
      });
      // Transform nodes for selected network
      const nodesWithNetwork = response.nodes.map(node =>
        transformNodeToContributor(node, selectedNetwork),
      );
      return {
        name: name || '',
        nodes: nodesWithNetwork,
        updated_at: Date.now() / 1000,
      };
    },
    enabled: !!selectedNetwork && !!name,
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  if (error) {
    return <ErrorState message="Failed to load contributor data" />;
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (!contributor || !contributor.nodes || contributor.nodes.length === 0) {
    return <ErrorState message="No data available for this contributor" />;
  }

  // Group nodes by network (in REST version, all nodes are from selected network)
  const nodesByNetwork = contributor.nodes.reduce((accumulator: NetworkNodes, node) => {
    if (!accumulator[node.network]) {
      accumulator[node.network] = [];
    }
    accumulator[node.network].push(node);
    return accumulator;
  }, {});

  // Sort networks based on NETWORK_ORDER
  const sortedNetworks = Object.entries(nodesByNetwork).sort(([a], [b]) => {
    const aIndex = NETWORK_ORDER.indexOf(a);
    const bIndex = NETWORK_ORDER.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

  const avatarColor = stringToColor(contributor.name);
  const initials = getInitials(contributor.name);

  return (
    <div className="space-y-8">
      <XatuCallToAction />

      {/* Contributor Overview */}
      <Card className="relative z-10 card-primary overflow-visible">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-start gap-4">
            <div className="flex items-start gap-6">
              <div
                className="w-20 h-20 flex items-center justify-center text-2xl font-mono font-bold shadow-neon transition-transform hover:scale-105"
                style={{
                  backgroundColor: avatarColor,
                  boxShadow: `0 0 20px ${avatarColor}10`,
                }}
              >
                {initials}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-sans font-bold text-primary mb-2">
                  {contributor.name}
                </h1>
                <div className="text-sm font-mono text-tertiary mb-4">
                  Last updated{' '}
                  <span
                    title={new Date(contributor.updated_at * 1000).toString()}
                    className="text-primary cursor-help -b -prominent"
                  >
                    {formatDistanceToNow(new Date(contributor.updated_at * 1000), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
            </div>
            <NetworkSelector
              selectedNetwork={selectedNetwork}
              onNetworkChange={network => setSelectedNetwork(network, 'ui')}
              className="w-48"
            />
          </div>
        </div>
      </Card>

      {/* Network Sections */}
      <div className="space-y-8">
        {sortedNetworks.map(([network, nodes]) => {
          const metadata = NETWORK_METADATA[network as NetworkKey] || {
            name: network.charAt(0).toUpperCase() + network.slice(1),
            icon: '🔥',
          };
          return (
            <section key={network} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 flex items-center justify-center">{metadata.icon}</div>
                <h2 className="text-xl font-sans font-bold text-primary">
                  {metadata.name}{' '}
                  <span className="text-accent">
                    ({nodes.length} {nodes.length === 1 ? 'node' : 'nodes'})
                  </span>
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nodes.map(node => {
                  const offline = isNodeOffline(node, contributor.updated_at);
                  const shortName = getShortNodeName(node.client_name);
                  return (
                    <Card
                      key={node.client_name}
                      className={`card-secondary ${
                        offline ? 'border-error/30 hover:border-error/50' : ''
                      }`}
                    >
                      <div className="card-body">
                        <div className="flex items-center gap-3 mb-4">
                          <img
                            src={`/clients/${node.consensus_client}.png`}
                            alt={`${node.consensus_client} logo`}
                            className="w-6 h-6 object-contain opacity-90"
                            onError={e => {
                              const target = e.currentTarget;
                              target.style.display = 'none';
                            }}
                          />
                          <div className="min-w-0">
                            <div className="font-mono font-medium text-primary truncate">
                              {shortName}
                            </div>
                            <div className="text-sm font-mono text-tertiary">
                              {capitalizeWords(node.consensus_client)} ({node.consensus_version})
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm font-mono">
                          <div className="flex justify-between">
                            <span className="text-tertiary">Status</span>
                            <span className={offline ? 'text-error' : 'text-primary'}>
                              {offline ? 'Offline' : 'Online'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-tertiary">Location</span>
                            <span className="text-primary/90">
                              {[node.city, node.country, node.continent].filter(Boolean).join(', ')}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-tertiary">Implementation</span>
                            <span className="text-primary/90">
                              {node.client_implementation} ({node.client_version})
                            </span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Data Note */}
      <div className="text-center py-4">
        <p className="text-xs font-mono text-tertiary">
          Note: This data represents only nodes sending data to the Xatu project and is not
          representative of the total network.
        </p>
      </div>
    </div>
  );
}

export default ContributorDetail;
