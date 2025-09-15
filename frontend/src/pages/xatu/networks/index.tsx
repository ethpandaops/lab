import { useDataFetch } from '@/utils/data.ts';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useState } from 'react';
import useConfig from '@/contexts/config';
import { NETWORK_METADATA, type NetworkKey } from '@/constants/networks.tsx';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { Sparkles } from 'lucide-react';
import useApi from '@/contexts/api';

interface ConsensusImplementation {
  total_nodes: number;
  public_nodes: number;
}

interface Country {
  total_nodes: number;
  public_nodes: number;
}

interface NetworkData {
  total_nodes: number;
  total_public_nodes: number;
  countries: Record<string, Country>;
  continents: Record<string, Country>;
  cities: Record<string, Country>;
  consensus_implementations: Record<string, ConsensusImplementation>;
}

interface Summary {
  updated_at: number;
  networks: Record<string, NetworkData | undefined>;
}

const CLIENT_METADATA: Record<string, { name: string }> = {
  prysm: { name: 'Prysm' },
  teku: { name: 'Teku' },
  lighthouse: { name: 'Lighthouse' },
  lodestar: { name: 'Lodestar' },
  nimbus: { name: 'Nimbus' },
  caplin: { name: 'Caplin' },
  grandine: { name: 'Grandine' },
};

// Network order priority (lower index = higher priority)
const NETWORK_ORDER = ['mainnet', 'hoodi', 'sepolia'];

// Sort networks based on predefined order
const sortNetworks = (networks: string[]): string[] => {
  return [...networks].sort((a, b) => {
    const aIndex = NETWORK_ORDER.indexOf(a);
    const bIndex = NETWORK_ORDER.indexOf(b);

    // If both networks are in the priority list, sort by their index
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }

    // If only a is in the priority list, it comes first
    if (aIndex !== -1) {
      return -1;
    }

    // If only b is in the priority list, it comes first
    if (bIndex !== -1) {
      return 1;
    }

    // If neither is in the priority list, sort alphabetically
    return a.localeCompare(b);
  });
};

// Function to generate metadata for networks not defined in NETWORK_METADATA
const getNetworkMetadata = (network: string) => {
  if (network in NETWORK_METADATA) {
    return NETWORK_METADATA[network as NetworkKey];
  }

  // Generate metadata for unknown networks
  return {
    name: network.charAt(0).toUpperCase() + network.slice(1),
    icon: '🔥',
    color: '#627EEA',
  };
};

export default function Networks() {
  const { config } = useConfig();
  const { baseUrl } = useApi();
  const [availableNetworks, setAvailableNetworks] = useState<string[]>([]);

  // Get available networks from config
  useEffect(() => {
    if (config?.ethereum?.networks) {
      const networks = Object.keys(config.ethereum.networks);
      setAvailableNetworks(sortNetworks(networks));
    }
  }, [config]);

  const summaryPath = config?.modules?.['xatu_public_contributors']?.path_prefix
    ? `${config.modules['xatu_public_contributors'].path_prefix}/summary.json`
    : null;

  const { data: summaryData, loading, error } = useDataFetch<Summary>(baseUrl, summaryPath);

  if (loading) return <LoadingState message="Loading network data..." />;
  if (error) return <ErrorState message="Failed to load network data" error={error} />;
  if (!summaryData) return <LoadingState message="Processing network data..." />;

  // Ensure networks object exists
  if (!summaryData.networks || Object.keys(summaryData.networks).length === 0) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="text-center py-10 bg-surface/50 backdrop-blur-sm rounded-lg border border-subtle p-8 shadow-sm">
          <Sparkles className="h-12 w-12 mx-auto text-tertiary/50 mb-4" />
          <h3 className="text-xl font-sans font-bold text-primary mb-2">
            No network data available
          </h3>
          <p className="text-sm font-mono text-tertiary max-w-md mx-auto">
            There is currently no network data available to display. Check back later or configure
            the Xatu module.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="bg-surface/50 backdrop-blur-sm rounded-lg border border-subtle p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-xl font-sans font-bold text-primary">Networks</h2>
            <p className="text-xs font-mono text-secondary mt-1">
              Last updated{' '}
              {formatDistanceToNow(new Date(summaryData.updated_at * 1000), { addSuffix: true })}
            </p>
          </div>
          <div className="bg-surface/70 px-3 py-1.5 rounded border border-subtle/30">
            <span className="text-xs font-mono text-accent">
              {availableNetworks.length} Ethereum networks
            </span>
          </div>
        </div>
      </div>

      {/* Network Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {availableNetworks.map(networkName => {
          // Get data for this network from summaryData if available
          const data = summaryData.networks[networkName];

          // Generate metadata for this network
          const metadata = getNetworkMetadata(networkName);

          // If we don't have data for this network, show a placeholder card
          if (!data) {
            return (
              <div
                key={networkName}
                className="bg-surface/50 rounded-lg border border-subtle p-4 shadow-sm opacity-70"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded flex items-center justify-center text-lg"
                    style={{ backgroundColor: `${metadata.color}20` }}
                  >
                    {metadata.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-sans font-medium text-primary">
                      {metadata.name}
                    </h3>
                    <p className="text-xs font-mono text-tertiary mt-1">No data available</p>
                  </div>
                </div>
              </div>
            );
          }

          // Calculate client distribution for this network
          const clientDistribution = Object.entries(data.consensus_implementations || {})
            .map(([client, clientData]) => ({
              name: CLIENT_METADATA[client]?.name || client,
              value: clientData?.total_nodes || 0,
              publicValue: clientData?.public_nodes || 0,
            }))
            .sort((a, b) => b.value - a.value);

          const totalNodes = data.total_nodes || 0;
          const publicNodes = data.total_public_nodes || 0;
          const publicPercentage = totalNodes > 0 ? (publicNodes / totalNodes) * 100 : 0;

          // Always display all clients
          const displayedClients = clientDistribution;

          return (
            <div
              key={networkName}
              className="bg-surface/50 rounded-lg border border-subtle overflow-hidden shadow-sm hover:border-accent/20 transition-colors"
            >
              {/* Network Header */}
              <div className="p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded flex items-center justify-center text-lg"
                    style={{ backgroundColor: `${metadata.color}20` }}
                  >
                    {metadata.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-sans font-medium text-primary">
                      {metadata.name}
                    </h3>
                    <div className="text-xs font-mono text-tertiary flex items-center gap-2">
                      <span>{totalNodes.toLocaleString()} nodes</span>
                      <span className="text-accent">
                        ({publicPercentage.toFixed(1)}% community)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Network Stats */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-surface/70 rounded p-2 border border-subtle/30">
                    <p className="text-xs font-mono text-tertiary mb-1">Countries</p>
                    <p className="text-sm font-mono font-medium text-primary">
                      {Object.keys(data.countries || {}).length}
                    </p>
                  </div>
                  <div className="bg-surface/70 rounded p-2 border border-subtle/30">
                    <p className="text-xs font-mono text-tertiary mb-1">Cities</p>
                    <p className="text-sm font-mono font-medium text-primary">
                      {Object.keys(data.cities || {}).length}
                    </p>
                  </div>
                  <div className="bg-surface/70 rounded p-2 border border-subtle/30">
                    <p className="text-xs font-mono text-tertiary mb-1">Continents</p>
                    <p className="text-sm font-mono font-medium text-primary">
                      {Object.keys(data.continents || {}).length}
                    </p>
                  </div>
                </div>

                {/* Client Distribution - using proper HTML table with enhanced styling */}
                {clientDistribution.length > 0 && (
                  <div>
                    <p className="text-xs font-mono text-tertiary mb-2">Client Distribution</p>
                    <div className="overflow-x-auto rounded border border-subtle/30">
                      <table className="w-full text-xs font-mono border-collapse">
                        <thead className="bg-surface/70">
                          <tr className="text-2xs text-tertiary">
                            <th className="text-left font-normal p-2 pr-4 border-b border-subtle/30">
                              Client
                            </th>
                            <th className="text-left font-normal p-2 border-b border-subtle/30 w-full">
                              Distribution
                            </th>
                            <th className="text-right font-normal p-2 pl-4 border-b border-subtle/30">
                              Share
                            </th>
                            <th className="text-right font-normal p-2 pl-4 border-b border-subtle/30">
                              Total
                            </th>
                            <th className="text-right font-normal p-2 pl-4 border-b border-subtle/30">
                              Community
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedClients.map((client, index) => {
                            const percentage =
                              totalNodes > 0 ? (client.value / totalNodes) * 100 : 0;
                            const isLastRow = index === displayedClients.length - 1;

                            return (
                              <tr
                                key={client.name}
                                className={`align-middle hover:bg-surface/50 ${!isLastRow ? 'border-b border-subtle/20' : ''}`}
                              >
                                <td className="p-2 pr-4 font-medium text-primary">{client.name}</td>
                                <td className="p-2">
                                  <div className="w-full h-2 bg-surface/70 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-accent"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </td>
                                <td className="text-right p-2 pl-4 text-accent whitespace-nowrap">
                                  {percentage.toFixed(1)}%
                                </td>
                                <td className="text-right p-2 pl-4 text-tertiary whitespace-nowrap">
                                  {client.value.toLocaleString()}
                                </td>
                                <td className="text-right p-2 pl-4 text-secondary whitespace-nowrap">
                                  {client.publicValue.toLocaleString()}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="text-xs font-mono text-tertiary p-4 bg-surface/30 rounded-lg border border-subtle/30">
        Note: This data represents only nodes sending data to the Xatu project and is not
        representative of the total network.
      </div>
    </div>
  );
}
