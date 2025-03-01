import { useDataFetch } from '../../../utils/data';
import { formatDistanceToNow } from 'date-fns';
import { XatuCallToAction } from '../../../components/xatu/XatuCallToAction';
import { AboutThisData } from '../../../components/common/AboutThisData';
import { useContext } from 'react';
import { ConfigContext } from '../../../App';
import { NETWORK_METADATA, type NetworkKey } from '../../../constants/networks';

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

const CLIENT_METADATA: Record<string, { name: string }> = {
  prysm: { name: 'Prysm' },
  teku: { name: 'Teku' },
  lighthouse: { name: 'Lighthouse' },
  lodestar: { name: 'Lodestar' },
  nimbus: { name: 'Nimbus' },
};

export default function Networks(): JSX.Element {
  const config = useContext(ConfigContext)
  const summaryPath = config?.modules?.['xatu_public_contributors']?.path_prefix 
    ? `${config.modules['xatu_public_contributors'].path_prefix}/summary.json`
    : null;

  const { data: summaryData, loading, error } = useDataFetch<Summary>(summaryPath)

  if (!summaryData) {
    return <div>Loading...</div>;
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
        {Object.entries(summaryData.networks).map(([name, data]) => {
          const metadata = NETWORK_METADATA[name as NetworkKey] || {
            name: name.charAt(0).toUpperCase() + name.slice(1),
            icon: '🔥',
            color: '#627EEA',
          };

          // Calculate client distribution for this network
          const clientDistribution = Object.entries(data.consensus_implementations)
            .map(([client, clientData]) => ({
              name: CLIENT_METADATA[client]?.name || client,
              value: clientData.total_nodes,
              publicValue: clientData.public_nodes,
            }))
            .sort((a, b) => b.value - a.value);

          return (
            <div 
              key={name} 
              className="backdrop-blur-md bg-surface/80 border border-subtle hover:border-accent rounded-lg overflow-hidden transition-all duration-300"
              style={{
                background: `linear-gradient(135deg, rgba(var(--bg-surface)/0.8) 0%, rgba(var(--bg-surface)/0.9) 100%)`,
                boxShadow: `0 0 20px 0 rgba(0, 0, 0, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.05)`
              }}
            >
              {/* Network Header */}
              <div className="p-6 border-b border-subtle bg-gradient-to-r from-accent/5 via-transparent to-transparent">
                <div className="flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-2xl">
                      {metadata.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-sans font-bold text-primary mb-1">{metadata.name}</h3>
                      <div className="text-sm font-mono text-tertiary">
                        {data.total_nodes.toLocaleString()} total nodes
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono text-tertiary">
                      <div className="text-accent font-medium">{data.total_public_nodes.toLocaleString()} community</div>
                      <div>{(data.total_nodes - data.total_public_nodes).toLocaleString()} ethPandaOps</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Network Stats */}
              <div className="p-6 space-y-3">
                <div className="flex justify-between text-sm font-mono">
                  <span className="text-tertiary">Countries</span>
                  <span className="text-primary font-medium">{Object.keys(data.countries).length}</span>
                </div>
                <div className="flex justify-between text-sm font-mono">
                  <span className="text-tertiary">Cities</span>
                  <span className="text-primary font-medium">{Object.keys(data.cities).length}</span>
                </div>
                <div className="flex justify-between text-sm font-mono">
                  <span className="text-tertiary">Continents</span>
                  <span className="text-primary font-medium">{Object.keys(data.continents).length}</span>
                </div>
              </div>

              {/* Client Distribution */}
              <div className="p-6 border-t border-subtle bg-gradient-to-b from-accent/5 via-transparent to-transparent">
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
                            {((client.value / data.total_nodes) * 100).toFixed(1)}%
                          </span>
                          <div className="text-xs font-mono text-tertiary">
                            {client.value.toLocaleString()} nodes ({client.publicValue.toLocaleString()} public)
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} 
