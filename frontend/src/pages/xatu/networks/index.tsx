import { useDataFetch } from '../../../utils/data';
import { formatDistanceToNow } from 'date-fns';
import { XatuCallToAction } from '../../../components/xatu/XatuCallToAction';
import { AboutThisData } from '../../../components/common/AboutThisData';
import { useContext, useEffect, useState } from 'react';
import { ConfigContext } from '../../../App';
import { NETWORK_METADATA, type NetworkKey } from '../../../constants/networks';
import { Card, CardHeader, CardBody } from '../../../components/common/Card';

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
const NETWORK_ORDER = ['mainnet', 'sepolia', 'holesky', 'hoodi'];

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
    color: '#627EEA'
  };
};

export default function Networks(): JSX.Element {
  const config = useContext(ConfigContext);
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

  const { data: summaryData } = useDataFetch<Summary>(summaryPath);

  if (!summaryData) {
    return <div>Loading...</div>;
  }

  // Ensure networks object exists
  if (!summaryData.networks || Object.keys(summaryData.networks).length === 0) {
    return (
      <div className="space-y-6">
        <XatuCallToAction />
        <div className="text-center py-10">
          <h3 className="text-xl font-sans font-bold text-primary mb-2">No network data available</h3>
          <p className="text-sm font-mono text-tertiary">
            There is currently no network data available to display.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <XatuCallToAction />

      <AboutThisData>
        <p className="text-sm font-mono text-tertiary">
          This data represents only the nodes that are actively sending data to the Xatu project. 
          It is not representative of the total number of nodes in each network or the overall client diversity.
          Last updated{' '}
          <span 
            title={new Date(summaryData.updated_at * 1000).toString()}
            className="text-primary cursor-help border-b border-prominent"
          >
            {formatDistanceToNow(new Date(summaryData.updated_at * 1000), { addSuffix: true })}
          </span>
        </p>
      </AboutThisData>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableNetworks.map((networkName) => {
          // Get data for this network from summaryData if available
          const data = summaryData.networks[networkName];
          
          // Generate metadata for this network
          const metadata = getNetworkMetadata(networkName);
          
          // If we don't have data for this network, show a placeholder card
          if (!data) {
            return (
              <Card 
                key={networkName} 
                isPrimary
                className="border border-subtle hover:border-accent transition-all duration-300 shadow-lg opacity-70"
              >
                <CardHeader className="border-b border-subtle bg-gradient-to-r from-accent/5 via-transparent to-transparent">
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-2xl">
                        {metadata.icon}
                      </div>
                      <div>
                        <h3 className="text-xl font-sans font-bold text-primary mb-1">{metadata.name}</h3>
                        <div className="text-sm font-mono text-tertiary">
                          No data available
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardBody className="flex items-center justify-center py-12 text-tertiary text-sm font-mono">
                  No Xatu data available for this network
                </CardBody>
              </Card>
            );
          }
          
          // Calculate client distribution for this network - safely handle empty/undefined implementations
          const clientDistribution = Object.entries(data.consensus_implementations || {})
            .map(([client, clientData]) => ({
              name: CLIENT_METADATA[client]?.name || client,
              value: clientData?.total_nodes || 0,
              publicValue: clientData?.public_nodes || 0,
            }))
            .sort((a, b) => b.value - a.value);

          const totalNodes = data.total_nodes || 0;
          const publicNodes = data.total_public_nodes || 0;

          return (
            <Card 
              key={networkName} 
              isPrimary
              className="border border-subtle hover:border-accent transition-all duration-300 shadow-lg"
            >
              {/* Network Header */}
              <CardHeader className="border-b border-subtle bg-gradient-to-r from-accent/5 via-transparent to-transparent">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-2xl">
                      {metadata.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-sans font-bold text-primary mb-1">{metadata.name}</h3>
                      <div className="text-sm font-mono text-tertiary">
                        {totalNodes.toLocaleString()} total nodes
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono text-tertiary">
                      <div className="text-accent font-medium">{publicNodes.toLocaleString()} community</div>
                      <div>{(totalNodes - publicNodes).toLocaleString()} ethPandaOps</div>
                    </div>
                  </div>
                </div>
              </CardHeader>

              {/* Network Stats */}
              <CardBody className="space-y-3">
                <div className="flex justify-between text-sm font-mono">
                  <span className="text-tertiary">Countries</span>
                  <span className="text-primary font-medium">{Object.keys(data.countries || {}).length}</span>
                </div>
                <div className="flex justify-between text-sm font-mono">
                  <span className="text-tertiary">Cities</span>
                  <span className="text-primary font-medium">{Object.keys(data.cities || {}).length}</span>
                </div>
                <div className="flex justify-between text-sm font-mono">
                  <span className="text-tertiary">Continents</span>
                  <span className="text-primary font-medium">{Object.keys(data.continents || {}).length}</span>
                </div>
              </CardBody>

              {/* Client Distribution */}
              <CardBody className="border-t border-subtle bg-gradient-to-b from-accent/5 via-transparent to-transparent">
                <h4 className="text-sm font-sans font-bold text-primary mb-4">Client Distribution</h4>
                <div className="space-y-4">
                  {clientDistribution.map((client) => (
                    <div key={client.name} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-surface/60 flex items-center justify-center p-1">
                        <img
                          src={`/clients/${client.name.toLowerCase()}.png`}
                          alt={`${client.name} logo`}
                          className="w-6 h-6 object-contain"
                          onError={(event) => {
                            const target = event.currentTarget;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-sm font-mono text-primary">{client.name}</span>
                        <div className="text-right">
                          <span className="text-sm font-mono font-medium text-accent">
                            {totalNodes > 0 ? ((client.value / totalNodes) * 100).toFixed(1) : '0.0'}%
                          </span>
                          <div className="text-xs font-mono text-tertiary">
                            {client.value.toLocaleString()} nodes ({client.publicValue.toLocaleString()} public)
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
} 
