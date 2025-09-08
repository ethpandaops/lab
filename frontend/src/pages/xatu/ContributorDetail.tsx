import { useParams } from 'react-router-dom';
import { useDataFetch, useHybridDataFetch } from '@/utils/data.ts';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { formatDistanceToNow } from 'date-fns';
import { XatuCallToAction } from '@/components/xatu/XatuCallToAction';
import useConfig from '@/contexts/config';
import { NETWORK_METADATA, type NetworkKey } from '@/constants/networks.tsx';
import { Card } from '@/components/common/Card';
import useApi from '@/contexts/api';
import useNetwork from '@/contexts/network';
import { getRestApiClient } from '@/api';
import { FEATURE_FLAGS } from '@/config/features';
import { transformNodeToContributor } from '@/utils/transformers';

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
  const { config } = useConfig();
  const { baseUrl } = useApi();
  const { selectedNetwork } = useNetwork();
  const userPath = config?.modules?.['xatuPublicContributors']?.pathPrefix
    ? `${config.modules['xatuPublicContributors'].pathPrefix}/user-summaries/users/${name}.json`
    : null;

  const {
    data: contributor,
    loading,
    error,
  } = useHybridDataFetch<ContributorData>(
    `${baseUrl}${userPath}`,
    async () => {
      const client = await getRestApiClient();
      // When using REST API, only fetch user's nodes from selected network (performance optimization)
      const response = await client.getNodes(selectedNetwork, {
        username: { eq: name || '' },
      });
      // Transform nodes for selected network only
      const nodesWithNetwork = response.nodes.map(node =>
        transformNodeToContributor(node, selectedNetwork),
      );
      return {
        name: name || '',
        nodes: nodesWithNetwork,
        updated_at: Date.now() / 1000,
      };
    },
    FEATURE_FLAGS.useRestApiForXatu,
    {
      enabled: !!userPath || (FEATURE_FLAGS.useRestApiForXatu && !!selectedNetwork && !!name),
      // Re-fetch when selected network changes
      queryKey: ['contributor-detail', name, selectedNetwork, FEATURE_FLAGS.useRestApiForXatu],
    },
  );

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState message="Failed to load contributor data" />;
  }

  if (!contributor) {
    return <ErrorState message="No data available for this contributor" />;
  }

  // Group nodes by network
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
      <Card className="card-primary">
        <div className="card-body">
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
              <div className="flex flex-wrap gap-3">
                {sortedNetworks.map(([network, nodes]) => {
                  const metadata = NETWORK_METADATA[network as NetworkKey] || {
                    name: network.charAt(0).toUpperCase() + network.slice(1),
                    icon: '🔥',
                  };
                  return (
                    <div
                      key={network}
                      className="flex items-center gap-2 card-secondary px-3 py-1.5 text-sm font-mono"
                    >
                      <span className="w-5 h-5 flex items-center justify-center">
                        {metadata.icon}
                      </span>
                      <span className="text-primary/90">{metadata.name}</span>
                      <span className="text-accent font-medium">{nodes.length} nodes</span>
                    </div>
                  );
                })}
              </div>
            </div>
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
                <h2 className="text-xl font-sans font-bold text-primary">{metadata.name}</h2>
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
    </div>
  );
}

export default ContributorDetail;
