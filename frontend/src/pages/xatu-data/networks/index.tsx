import { formatDistanceToNow } from 'date-fns';
import { NETWORK_METADATA, type NetworkKey } from '@/constants/networks.tsx';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { Card } from '@/components/common/Card';
import useNetwork from '@/contexts/network';
import { getRestApiClient } from '@/api';
import { useQuery } from '@tanstack/react-query';
import {
  aggregateNodesByCountry,
  aggregateNodesByCity,
  aggregateNodesByContinents,
  aggregateNodesByClient,
} from '@/utils/transformers';
import { NetworkSelector } from '@/components/common/NetworkSelector';
import { BarChart3, Globe, MapPin, Users } from 'lucide-react';

const CLIENT_METADATA: Record<string, { name: string }> = {
  prysm: { name: 'Prysm' },
  teku: { name: 'Teku' },
  lighthouse: { name: 'Lighthouse' },
  lodestar: { name: 'Lodestar' },
  nimbus: { name: 'Nimbus' },
  caplin: { name: 'Caplin' },
  grandine: { name: 'Grandine' },
};

export default function Networks() {
  const { selectedNetwork, setSelectedNetwork } = useNetwork();

  // Fetch network data using REST API
  const {
    data: networkData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['xatu-data-network-details', selectedNetwork],
    queryFn: async () => {
      const client = await getRestApiClient();
      const response = await client.getNodes(selectedNetwork);
      const nodes = response.nodes;

      // Get public node count from response
      const publicNodeCount = (response as any).publicNodeCount || 0;

      // Build aggregated data
      return {
        total_nodes: nodes.length,
        total_public_nodes: publicNodeCount,
        countries: aggregateNodesByCountry(nodes),
        cities: aggregateNodesByCity(nodes),
        continents: aggregateNodesByContinents(nodes),
        consensus_implementations: aggregateNodesByClient(nodes),
        updated_at: Date.now() / 1000,
        nodes: nodes,
      };
    },
    enabled: !!selectedNetwork,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  if (error) return <ErrorState message="Failed to load network data" />;
  if (isLoading) return <LoadingState message="Loading..." />;
  if (!networkData) return <LoadingState message="Loading..." />;

  const metadata = NETWORK_METADATA[selectedNetwork as NetworkKey] || {
    name: selectedNetwork,
    icon: '🧪',
    color: '#627EEA',
  };

  // Calculate statistics
  const publicPercentage =
    networkData.total_nodes > 0
      ? (networkData.total_public_nodes / networkData.total_nodes) * 100
      : 0;

  // Get client distribution
  const clientDistribution = Object.entries(networkData.consensus_implementations || {})
    .map(([client, data]) => ({
      name: CLIENT_METADATA[client]?.name || client,
      value: data.total_nodes,
      percentage:
        networkData.total_nodes > 0 ? (data.total_nodes / networkData.total_nodes) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  // Get top countries
  const topCountries = Object.entries(networkData.countries || {})
    .map(([country, data]) => ({
      name: country,
      nodes: data.total_nodes,
    }))
    .sort((a, b) => b.nodes - a.nodes)
    .slice(0, 10);

  // Get top cities
  const topCities = Object.entries(networkData.cities || {})
    .map(([city, data]) => ({
      name: city,
      nodes: data.total_nodes,
    }))
    .sort((a, b) => b.nodes - a.nodes)
    .slice(0, 10);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <div className="relative z-10 bg-surface/50 backdrop-blur-sm rounded-lg border border-subtle p-4 shadow-sm overflow-visible">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center text-xl"
              style={{ backgroundColor: `${metadata.color}20` }}
            >
              {metadata.icon}
            </div>
            <div>
              <h2 className="text-xl font-sans font-bold text-primary">{metadata.name} Network</h2>
              <p className="text-xs font-mono text-secondary mt-1">
                Last updated{' '}
                {formatDistanceToNow(new Date(networkData.updated_at * 1000), { addSuffix: true })}
              </p>
            </div>
          </div>
          <NetworkSelector
            selectedNetwork={selectedNetwork}
            onNetworkChange={network => setSelectedNetwork(network, 'ui')}
            expandToFit={true}
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="card-secondary">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-accent" />
              <p className="text-xs font-mono text-tertiary">Total Nodes</p>
            </div>
            <p className="text-2xl font-mono font-bold text-primary">
              {networkData.total_nodes.toLocaleString()}
            </p>
            <p className="text-xs font-mono text-accent mt-1">
              {publicPercentage.toFixed(1)}% community
            </p>
          </div>
        </Card>

        <Card className="card-secondary">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-2">
              <Globe className="w-5 h-5 text-accent" />
              <p className="text-xs font-mono text-tertiary">Countries</p>
            </div>
            <p className="text-2xl font-mono font-bold text-primary">
              {Object.keys(networkData.countries || {}).length}
            </p>
            <p className="text-xs font-mono text-tertiary mt-1">
              across {Object.keys(networkData.continents || {}).length} continents
            </p>
          </div>
        </Card>

        <Card className="card-secondary">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="w-5 h-5 text-accent" />
              <p className="text-xs font-mono text-tertiary">Cities</p>
            </div>
            <p className="text-2xl font-mono font-bold text-primary">
              {Object.keys(networkData.cities || {}).length}
            </p>
          </div>
        </Card>

        <Card className="card-secondary">
          <div className="card-body">
            <div className="flex items-center gap-3 mb-2">
              <BarChart3 className="w-5 h-5 text-accent" />
              <p className="text-xs font-mono text-tertiary">Clients</p>
            </div>
            <p className="text-2xl font-mono font-bold text-primary">{clientDistribution.length}</p>
            <p className="text-xs font-mono text-tertiary mt-1">implementations</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Client Distribution */}
        <Card className="card-primary">
          <div className="card-header">
            <h3 className="text-lg font-sans font-bold text-primary">Client Distribution</h3>
          </div>
          <div className="card-body">
            <div className="space-y-3">
              {clientDistribution.map(client => (
                <div key={client.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src={`/clients/${client.name.toLowerCase()}.png`}
                        alt={`${client.name} logo`}
                        className="w-4 h-4 object-contain"
                        onError={e => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                        }}
                      />
                      <span className="text-sm font-mono text-primary">{client.name}</span>
                    </div>
                    <span className="text-sm font-mono text-accent">
                      {client.value} ({client.percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-surface/50 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-accent/70 rounded-full transition-all duration-500"
                      style={{ width: `${client.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Geographic Distribution */}
        <Card className="card-primary">
          <div className="card-header">
            <h3 className="text-lg font-sans font-bold text-primary">Top Locations</h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-mono text-tertiary mb-2">Countries</p>
                <div className="space-y-2">
                  {topCountries.slice(0, 5).map((country, index) => (
                    <div key={country.name} className="flex items-center justify-between">
                      <span className="text-sm font-mono text-primary">
                        {index + 1}. {country.name}
                      </span>
                      <span className="text-sm font-mono text-accent">
                        {country.nodes} {country.nodes === 1 ? 'node' : 'nodes'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-mono text-tertiary mb-2">Cities</p>
                <div className="space-y-2">
                  {topCities.slice(0, 5).map((city, index) => (
                    <div key={city.name} className="flex items-center justify-between">
                      <span className="text-sm font-mono text-primary">
                        {index + 1}. {city.name}
                      </span>
                      <span className="text-sm font-mono text-accent">
                        {city.nodes} {city.nodes === 1 ? 'node' : 'nodes'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Network Health */}
      <Card className="card-primary">
        <div className="card-header">
          <h3 className="text-lg font-sans font-bold text-primary">Network Statistics</h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs font-mono text-tertiary mb-1">Community Nodes</p>
              <p className="text-lg font-mono font-bold text-accent">
                {networkData.total_public_nodes.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-mono text-tertiary mb-1">EthPandaOps Nodes</p>
              <p className="text-lg font-mono font-bold text-primary">
                {(networkData.total_nodes - networkData.total_public_nodes).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-mono text-tertiary mb-1">Geographic Diversity</p>
              <p className="text-lg font-mono font-bold text-primary">
                {Object.keys(networkData.countries || {}).length} countries
              </p>
            </div>
            <div>
              <p className="text-xs font-mono text-tertiary mb-1">Client Diversity</p>
              <p className="text-lg font-mono font-bold text-primary">
                {clientDistribution.length} clients
              </p>
            </div>
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
}
