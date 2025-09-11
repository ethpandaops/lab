import { Link, Outlet, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useRef, useState, useEffect } from 'react';
import { GlobeViz } from '@/components/xatu/GlobeViz';
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
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';

const GLOBE_WIDTH = 500;
const MS_PER_SECOND = 1000;

const CLIENT_METADATA: Record<string, { name: string }> = {
  prysm: { name: 'Prysm' },
  teku: { name: 'Teku' },
  lighthouse: { name: 'Lighthouse' },
  lodestar: { name: 'Lodestar' },
  nimbus: { name: 'Nimbus' },
  caplin: { name: 'Caplin' },
  grandine: { name: 'Grandine' },
};

function XatuData() {
  const location = useLocation();
  const containerReference = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const { selectedNetwork, setSelectedNetwork } = useNetwork();

  // Fetch nodes data using REST API only - no conditionals!
  const {
    data: networkData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['xatu-data-nodes', selectedNetwork],
    queryFn: async () => {
      const client = await getRestApiClient();
      const response = await client.getNodes(selectedNetwork);
      const nodes = response.nodes;

      // Build aggregated data
      // Public nodes count comes from the API response (nodes with pub- prefix)
      const publicNodeCount = (response as any).publicNodeCount || 0;

      return {
        total_nodes: nodes.length,
        total_public_nodes: publicNodeCount,
        countries: aggregateNodesByCountry(nodes),
        cities: aggregateNodesByCity(nodes),
        continents: aggregateNodesByContinents(nodes),
        consensus_implementations: aggregateNodesByClient(nodes),
        updated_at: Date.now() / 1000,
      };
    },
    enabled: !!selectedNetwork,
    staleTime: 30000, // Consider data fresh for 30 seconds
    refetchInterval: 60000, // Refetch every minute
  });

  useEffect(() => {
    if (!containerReference.current) {
      return;
    }

    setContainerWidth(containerReference.current.offsetWidth);

    const observer = new ResizeObserver((entries: ResizeObserverEntry[]) => {
      setContainerWidth(entries[0].contentRect.width);
    });

    observer.observe(containerReference.current);
    return () => observer.disconnect();
  }, []);

  // If we're on a nested route, render the child route
  if (location.pathname !== '/xatu-data') {
    return (
      <div>
        <div>
          <Outlet />
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState message="Failed to load network data" />;
  }

  if (isLoading || !networkData) {
    return <LoadingState message="Loading..." />;
  }

  // Transform data for the globe visualization
  const globeData = [
    {
      time: Date.now() / MS_PER_SECOND,
      countries: Object.entries(networkData.countries || {}).map(([name, data]) => ({
        name,
        value: data.total_nodes,
      })),
    },
  ];

  // Calculate client distribution
  const clientDistribution = Object.entries(networkData.consensus_implementations || {})
    .map(([client, data]) => ({
      name: CLIENT_METADATA[client]?.name || client,
      value: data.total_nodes,
      publicValue: data.public_nodes,
    }))
    .sort((a, b) => b.value - a.value);

  const totalCities = Object.keys(networkData.cities || {}).length;
  const totalCountries = Object.keys(networkData.countries || {}).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto" ref={containerReference}>

      {/* Overview Header */}
      <div className="relative z-10 bg-surface/50 backdrop-blur-sm rounded-lg border border-subtle p-4 shadow-sm overflow-visible">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-xl font-sans font-bold text-primary">Xatu Network</h2>
            <p className="text-xs font-mono text-secondary mt-1">
              Last updated{' '}
              {formatDistanceToNow(new Date(networkData.updated_at * MS_PER_SECOND), {
                addSuffix: true,
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-surface/70 px-3 py-1.5 rounded border border-subtle/30">
              <span className="text-xs font-mono text-accent">
                {networkData.total_nodes.toLocaleString()} nodes • {selectedNetwork}
              </span>
            </div>
            <NetworkSelector
              selectedNetwork={selectedNetwork}
              onNetworkChange={network => setSelectedNetwork(network, 'ui')}
              className="w-48"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Globe and Key Stats */}
        <div className="lg:col-span-2 bg-surface/50 rounded-lg border border-subtle p-4 shadow-sm">
          <h3 className="text-sm font-sans font-medium text-primary mb-4">Global Distribution</h3>
          <div className="flex justify-center">
            <GlobeViz
              data={globeData}
              width={Math.min(containerWidth - 40, GLOBE_WIDTH)}
              height={300}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
            <div>
              <p className="text-xs font-mono text-tertiary">Total Nodes</p>
              <p className="text-lg font-mono font-medium text-primary">
                {networkData.total_nodes.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-mono text-tertiary">Public Nodes</p>
              <p className="text-lg font-mono font-medium text-accent">
                {networkData.total_public_nodes.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-mono text-tertiary">Countries</p>
              <p className="text-lg font-mono font-medium text-primary">{totalCountries}</p>
            </div>
            <div>
              <p className="text-xs font-mono text-tertiary">Cities</p>
              <p className="text-lg font-mono font-medium text-primary">{totalCities}</p>
            </div>
          </div>
        </div>

        {/* Client Distribution */}
        <div className="bg-surface/50 rounded-lg border border-subtle p-4 shadow-sm">
          <h3 className="text-sm font-sans font-medium text-primary mb-4">Client Distribution</h3>
          <div className="space-y-3">
            {clientDistribution.map(client => (
              <div key={client.name} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-surface/70 flex items-center justify-center">
                  <img
                    src={`/clients/${client.name.toLowerCase()}.png`}
                    alt={`${client.name} logo`}
                    className="w-3 h-3 object-contain"
                    onError={event => {
                      const target = event.currentTarget;
                      target.style.display = 'none';
                    }}
                  />
                </div>
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-xs font-mono text-primary">{client.name}</span>
                  <span className="text-xs font-mono text-accent">
                    {networkData.total_nodes > 0
                      ? ((client.value / networkData.total_nodes) * 100).toFixed(1)
                      : '0.0'}
                    %
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { to: 'contributors', emoji: '👥', title: 'Contributors' },
          { to: 'networks', emoji: '🌐', title: 'Network Details' },
          { to: 'geographical-checklist', emoji: '🗺️', title: 'Geography' },
          { to: 'fork-readiness', emoji: '🍴', title: 'Fork Readiness' },
        ].map(item => (
          <Link
            key={item.to}
            to={item.to}
            className="bg-surface/50 hover:bg-surface/70 border border-subtle hover:border-accent/20 rounded-lg p-3 transition-all duration-200 flex items-center gap-2 group"
          >
            <div className="w-8 h-8 rounded bg-surface/70 flex items-center justify-center">
              <span className="text-base">{item.emoji}</span>
            </div>
            <div className="flex-1">
              <span className="text-sm font-sans font-medium text-primary group-hover:text-accent transition-colors">
                {item.title}
              </span>
            </div>
            <ArrowRight className="w-4 h-4 text-tertiary group-hover:text-accent group-hover:translate-x-1 transition-all duration-300" />
          </Link>
        ))}
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

export default XatuData;
