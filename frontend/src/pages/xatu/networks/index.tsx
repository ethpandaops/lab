import { useDataFetch } from '../../../utils/data';
import { formatDistanceToNow } from 'date-fns';
import { XatuCallToAction } from '../../../components/xatu/XatuCallToAction';
import { AboutThisData } from '../../../components/common/AboutThisData';
import { useContext } from 'react';
import { ConfigContext } from '../../../App';

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
            className="text-primary cursor-help -b -prominent"
          >
            {formatDistanceToNow(new Date(summaryData.updated_at * 1000), { addSuffix: true })}
          </span>
        </p>
      </AboutThisData>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(summaryData.networks).map(([name, data]) => {
          const metadata = NETWORK_METADATA[name as keyof typeof NETWORK_METADATA] || {
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
            <div key={name} className="backdrop-blur-sm  p-6  -subtle hover:-default hover:bg-hover transition-all duration-300">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-start gap-3">
                  <span className="w-8 h-8 flex items-center justify-center text-2xl">
                    {metadata.icon}
                  </span>
                  <div>
                    <h3 className="text-xl font-sans font-bold text-primary mb-1">{metadata.name}</h3>
                    <div className="text-sm font-mono text-tertiary">
                      {data.total_nodes.toLocaleString()} total nodes
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-tertiary">
                    <div>{data.total_public_nodes.toLocaleString()} community</div>
                    <div>{(data.total_nodes - data.total_public_nodes).toLocaleString()} ethPandaOps</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm font-mono">
                  <span className="text-tertiary">Countries</span>
                  <span className="text-primary">{Object.keys(data.countries).length}</span>
                </div>
                <div className="flex justify-between text-sm font-mono">
                  <span className="text-tertiary">Cities</span>
                  <span className="text-primary">{Object.keys(data.cities).length}</span>
                </div>
                <div className="flex justify-between text-sm font-mono">
                  <span className="text-tertiary">Continents</span>
                  <span className="text-primary">{Object.keys(data.continents).length}</span>
                </div>
              </div>

              {/* Client Distribution */}
              <div className="pt-6 -t -subtle">
                <h4 className="text-sm font-sans font-bold text-primary/90 mb-4">Client Distribution</h4>
                <div className="space-y-3">
                  {clientDistribution.map((client) => (
                    <div key={client.name} className="flex items-center gap-3">
                      <img
                        src={`/clients/${client.name.toLowerCase()}.png`}
                        alt={`${client.name} logo`}
                        className="w-6 h-6 object-contain opacity-90"
                        onError={(event) => {
                          const target = event.currentTarget;
                          target.style.display = 'none';
                        }}
                      />
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-sm font-mono text-primary/90">{client.name}</span>
                        <div className="text-right">
                          <span className="text-sm font-mono font-medium text-primary">
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
