import { Link, Outlet, useLocation } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useDataFetch, useHybridDataFetch } from '@/utils/data.ts';
import { formatDistanceToNow } from 'date-fns';
import { useRef, useState, useEffect } from 'react';
import { GlobeViz } from '@/components/xatu/GlobeViz';
import { XatuCallToAction } from '@/components/xatu/XatuCallToAction';
import useConfig from '@/contexts/config';
import useApi from '@/contexts/api';
import useNetwork from '@/contexts/network';
import { getRestApiClient } from '@/api';
import { FEATURE_FLAGS } from '@/config/features';
import {
  aggregateNodesByCountry,
  aggregateNodesByCity,
  aggregateNodesByContinents,
  aggregateNodesByClient,
} from '@/utils/transformers';

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
  networks: {
    mainnet: NetworkData;
    sepolia: NetworkData;
    holesky: NetworkData;
  };
}

const GLOBE_WIDTH = 500;
const MS_PER_SECOND = 1000;

const CLIENT_METADATA: Record<string, { name: string }> = {
  prysm: { name: 'Prysm' },
  teku: { name: 'Teku' },
  lighthouse: { name: 'Lighthouse' },
  lodestar: { name: 'Lodestar' },
  nimbus: { name: 'Nimbus' },
};

function Xatu() {
  const location = useLocation();
  const containerReference = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const { config } = useConfig();
  const { baseUrl } = useApi();
  const { availableNetworks } = useNetwork();

  // Skip data fetching if config isn't loaded
  const summaryPath = config?.modules?.['xatuPublicContributors']?.pathPrefix
    ? `${config.modules['xatuPublicContributors'].pathPrefix}/summary.json`
    : null;

  const { selectedNetwork } = useNetwork();

  const { data: summaryData } = useHybridDataFetch<Summary>(
    `${baseUrl}${summaryPath}`,
    async () => {
      // When using REST API, only fetch nodes for the selected network (performance optimization)
      const client = await getRestApiClient();
      const nodeResponse = await client.getNodes(selectedNetwork);
      const nodes = nodeResponse.nodes;

      // Build summary structure for selected network only
      const networkSummary = {
        total_nodes: nodes.length,
        total_public_nodes: nodes.length, // All nodes from API are public
        countries: aggregateNodesByCountry(nodes),
        cities: aggregateNodesByCity(nodes),
        continents: aggregateNodesByContinents(nodes),
        consensus_implementations: aggregateNodesByClient(nodes),
      };

      // Create summary matching existing format but only for selected network
      return {
        updated_at: Date.now() / 1000,
        networks: {
          [selectedNetwork]: networkSummary,
          // Add empty data for other networks to maintain UI compatibility
          ...availableNetworks.reduce(
            (acc, network) => {
              if (network !== selectedNetwork) {
                acc[network] = {
                  total_nodes: 0,
                  total_public_nodes: 0,
                  countries: {},
                  cities: {},
                  continents: {},
                  consensus_implementations: {},
                };
              }
              return acc;
            },
            {} as Record<string, NetworkData>,
          ),
        } as any,
      };
    },
    FEATURE_FLAGS.useRestApiForXatu,
    {
      enabled: !!summaryPath || (FEATURE_FLAGS.useRestApiForXatu && !!selectedNetwork),
      // Re-fetch when selected network changes
      queryKey: ['xatu-summary', selectedNetwork, FEATURE_FLAGS.useRestApiForXatu],
    },
  );

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
  if (location.pathname !== '/xatu') {
    return (
      <div>
        <div>
          <Outlet />
        </div>
      </div>
    );
  }

  if (!summaryData) {
    return <div>Loading...</div>;
  }

  // Get current network data (when using REST API, this is the selected network)
  const currentNetworkData = FEATURE_FLAGS.useRestApiForXatu
    ? summaryData.networks[selectedNetwork]
    : summaryData.networks.mainnet;

  // Transform summary data for the globe - use current network data
  const globeData = [
    {
      time: Date.now() / MS_PER_SECOND,
      countries: Object.entries(currentNetworkData?.countries || {}).map(([name, data]) => ({
        name,
        value: data.total_nodes,
      })),
    },
  ];

  // Calculate total nodes (when using REST API, this is just the selected network)
  const totalNodes = FEATURE_FLAGS.useRestApiForXatu
    ? currentNetworkData?.total_nodes || 0
    : Object.values(summaryData.networks).reduce(
        (accumulator, network) => accumulator + network.total_nodes,
        0,
      );
  const totalPublicNodes = FEATURE_FLAGS.useRestApiForXatu
    ? currentNetworkData?.total_public_nodes || 0
    : Object.values(summaryData.networks).reduce(
        (accumulator, network) => accumulator + network.total_public_nodes,
        0,
      );

  // Calculate client distribution for current network
  const clientDistribution = Object.entries(currentNetworkData?.consensus_implementations || {})
    .map(([client, data]) => ({
      name: CLIENT_METADATA[client]?.name || client,
      value: data.total_nodes,
      publicValue: data.public_nodes,
    }))
    .sort((a, b) => b.value - a.value);

  const totalCurrentNetworkNodes = currentNetworkData?.total_nodes || 0;

  // Calculate additional stats
  const totalCities = Object.keys(currentNetworkData?.cities || {}).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto" ref={containerReference}>
      <XatuCallToAction />

      {/* Overview Header */}
      <div className="bg-surface/50 backdrop-blur-sm rounded-lg border border-subtle p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-xl font-sans font-bold text-primary">
              Xatu Network {FEATURE_FLAGS.useRestApiForXatu && `- ${selectedNetwork}`}
            </h2>
            <p className="text-xs font-mono text-secondary mt-1">
              Last updated{' '}
              {formatDistanceToNow(new Date(summaryData.updated_at * MS_PER_SECOND), {
                addSuffix: true,
              })}
            </p>
          </div>
          <div className="bg-surface/70 px-3 py-1.5 rounded border border-subtle/30">
            <span className="text-xs font-mono text-accent">
              {totalNodes.toLocaleString()} nodes
              {FEATURE_FLAGS.useRestApiForXatu
                ? ` • ${selectedNetwork}`
                : ` • ${Object.keys(summaryData.networks).length} networks`}
            </span>
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
                {totalNodes.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-mono text-tertiary">Public Nodes</p>
              <p className="text-lg font-mono font-medium text-accent">
                {totalPublicNodes.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs font-mono text-tertiary">Countries</p>
              <p className="text-lg font-mono font-medium text-primary">
                {Object.keys(summaryData.networks.mainnet.countries).length}
              </p>
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
            {clientDistribution.slice(0, 5).map(client => (
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
                    {totalCurrentNetworkNodes > 0
                      ? ((client.value / totalCurrentNetworkNodes) * 100).toFixed(1)
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
          { to: 'networks', emoji: '🌐', title: 'Networks' },
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
    </div>
  );
}

export default Xatu;
