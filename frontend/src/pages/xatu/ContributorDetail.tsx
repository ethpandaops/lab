import { useParams } from 'react-router-dom';
import { useDataFetch } from '../../utils/data';
import { LoadingState } from '../../components/common/LoadingState';
import { ErrorState } from '../../components/common/ErrorState';
import { formatDistanceToNow } from 'date-fns';
import { XatuCallToAction } from '../../components/xatu/XatuCallToAction';

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

const NETWORK_METADATA = {
  mainnet: {
    name: 'Mainnet',
    icon: (
      <svg width="20" height="20" viewBox="0 0 784 784" fill="none">
        <circle cx="392" cy="392" r="392" fill="#627EEA" fillOpacity="0.1" />
        <path d="M392.07 92.5L387.9 105.667V525.477L392.07 529.647L586.477 413.42L392.07 92.5Z" fill="#627EEA" />
        <path d="M392.07 92.5L197.666 413.42L392.07 529.647V324.921V92.5Z" fill="#627EEA" />
        <path d="M392.07 572.834L389.706 575.668V726.831L392.07 733.5L586.607 456.679L392.07 572.834Z" fill="#627EEA" />
        <path d="M392.07 733.5V572.834L197.666 456.679L392.07 733.5Z" fill="#627EEA" />
        <path d="M392.07 529.647L586.477 413.42L392.07 324.921V529.647Z" fill="#627EEA" />
        <path d="M197.666 413.42L392.07 529.647V324.921L197.666 413.42Z" fill="#627EEA" />
      </svg>
    ),
    color: '#627EEA',
  },
  sepolia: {
    name: 'Sepolia',
    icon: '🐬',
    color: '#CFB5F0',
  },
  holesky: {
    name: 'Holesky',
    icon: '🐱',
    color: '#A4E887',
  },
} as const;

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
  return input.split('-').map((word) => (
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  )).join(' ');
}

function isNodeOffline(node: ContributorNode, updatedAt: number): boolean {
  return updatedAt - node.latest_slot_start_date_time > OFFLINE_THRESHOLD;
}

function ContributorDetail(): JSX.Element {
  const { name } = useParams<{ name: string }>();
  const { data: contributor, loading, error } = useDataFetch<ContributorData>(
    `xatu-public-contributors/user-summaries/users/${name}.json`,
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

      {/* Page Header */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-cyber-neon/20 to-transparent" />
        </div>
        <div className="relative flex justify-center">
          <div className="px-4 bg-cyber-darker">
            <h1 className="text-3xl md:text-4xl font-sans font-black bg-gradient-to-r from-cyber-neon via-cyber-blue to-cyber-pink bg-clip-text text-transparent animate-text-shine">
              {contributor.name}
            </h1>
          </div>
        </div>
      </div>

      {/* Contributor Overview */}
      <div className="backdrop-blur-sm rounded-lg border border-cyber-neon/10 hover:border-cyber-neon/20 p-6 transition-all">
        <div className="flex items-start gap-6">
          <div 
            className="w-20 h-20 rounded-lg flex items-center justify-center text-2xl font-mono font-bold text-cyber-darker shadow-neon transition-transform hover:scale-105"
            style={{ 
              backgroundColor: avatarColor,
              boxShadow: `0 0 20px ${avatarColor}33`,
            }}
          >
            {initials}
          </div>
          <div className="flex-1">
            <div className="text-sm font-mono text-cyber-neon/70 mb-4">
              Last updated{' '}
              <span 
                title={new Date(contributor.updated_at * 1000).toString()}
                className="text-cyber-neon cursor-help border-b border-cyber-neon/30"
              >
                {formatDistanceToNow(new Date(contributor.updated_at * 1000), { addSuffix: true })}
              </span>
            </div>
            <div className="flex flex-wrap gap-3">
              {sortedNetworks.map(([network, nodes]) => {
                const metadata = NETWORK_METADATA[network as keyof typeof NETWORK_METADATA] || {
                  name: network.charAt(0).toUpperCase() + network.slice(1),
                  icon: '🔥',
                };
                return (
                  <div 
                    key={network} 
                    className="flex items-center gap-2 backdrop-blur-sm rounded-lg border border-cyber-neon/10 px-3 py-1.5 text-sm font-mono hover:border-cyber-neon/20 transition-all"
                  >
                    <span className="w-5 h-5 flex items-center justify-center">
                      {metadata.icon}
                    </span>
                    <span className="text-cyber-neon/90">{metadata.name}</span>
                    <span className="text-cyber-blue font-medium">{nodes.length} nodes</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Network Sections */}
      <div className="space-y-8">
        {sortedNetworks.map(([network, nodes]) => {
          const metadata = NETWORK_METADATA[network as keyof typeof NETWORK_METADATA] || {
            name: network.charAt(0).toUpperCase() + network.slice(1),
            icon: '🔥',
          };
          return (
            <section key={network} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 flex items-center justify-center">
                  {metadata.icon}
                </div>
                <h2 className="text-xl font-sans font-bold text-cyber-neon">
                  {metadata.name}
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nodes.map((node) => {
                  const offline = isNodeOffline(node, contributor.updated_at);
                  const shortName = getShortNodeName(node.client_name);
                  return (
                    <div
                      key={node.client_name}
                      className={`backdrop-blur-sm rounded-lg border p-4 transition-all ${
                        offline 
                          ? 'border-cyber-pink/30 hover:border-cyber-pink/50' 
                          : 'border-cyber-neon/10 hover:border-cyber-neon/30 hover:bg-cyber-neon/5'
                      }`}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <img
                          src={`/clients/${node.consensus_client}.png`}
                          alt={`${node.consensus_client} logo`}
                          className="w-6 h-6 object-contain opacity-90"
                          onError={(e) => {
                            const target = e.currentTarget;
                            target.style.display = 'none';
                          }}
                        />
                        <div className="min-w-0">
                          <div className="font-mono font-medium text-cyber-neon truncate">
                            {shortName}
                          </div>
                          <div className="text-sm font-mono text-cyber-neon/70">
                            {capitalizeWords(node.consensus_client)}
                            {' '}
                            ({node.consensus_version})
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm font-mono">
                        <div className="flex justify-between">
                          <span className="text-cyber-neon/70">Status</span>
                          <span className={offline ? 'text-cyber-pink' : 'text-cyber-neon'}>
                            {offline ? 'Offline' : 'Online'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-cyber-neon/70">Location</span>
                          <span className="text-cyber-neon/90">
                            {[node.city, node.country, node.continent].filter(Boolean).join(', ')}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-cyber-neon/70">Implementation</span>
                          <span className="text-cyber-neon/90">
                            {node.client_implementation} ({node.client_version})
                          </span>
                        </div>
                      </div>
                    </div>
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