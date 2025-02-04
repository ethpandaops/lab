import { useDataFetch } from '../../../utils/data';
import { formatDistanceToNow } from 'date-fns';
import { XatuCallToAction } from '../../../components/xatu/XatuCallToAction';

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
  const { data: summaryData } = useDataFetch<Summary>(
    'xatu-public-contributors/summary.json',
  );

  if (!summaryData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-8">

      <XatuCallToAction />
      <div className="flex flex-col mb-6">
        <h2 className="text-2xl font-bold text-cyan-400">Networks</h2>
        <span className="text-gray-400 text-sm">
          Last 24h · Updated{' '}
          <span 
            title={new Date(summaryData.updated_at * 1000).toString()}
            className="cursor-help border-b border-dotted border-gray-500"
          >
            {formatDistanceToNow(new Date(summaryData.updated_at * 1000), { addSuffix: true })}
          </span>
        </span>
        <div className="mt-4 p-4 bg-gray-800/50 rounded-lg border border-yellow-700/50 shadow-[0_0_15px_rgba(234,179,8,0.15)]">
          <div className="space-y-2">
            <p className="text-yellow-500 font-medium">Important Notice</p>
            <p className="text-gray-300">
              This data represents only the nodes that are actively sending data to the Xatu project. 
              It is not representative of the total number of nodes in each network or the overall client diversity.
            </p>
          </div>
        </div>
      </div>

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
            <div key={name} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 flex items-center justify-center">
                    {metadata.icon}
                  </span>
                  <div>
                    <div className="text-xl font-bold text-cyan-400">{metadata.name}</div>
                    <div className="text-sm text-gray-400">
                      {data.total_nodes} total nodes
                    </div>
                  </div>
                </div>
                <div className="text-right text-sm text-gray-400">
                  <div>{data.total_public_nodes} community</div>
                  <div>{data.total_nodes - data.total_public_nodes} ethPandaOps</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Countries</span>
                  <span className="text-gray-300">{Object.keys(data.countries).length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Cities</span>
                  <span className="text-gray-300">{Object.keys(data.cities).length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Continents</span>
                  <span className="text-gray-300">{Object.keys(data.continents).length}</span>
                </div>
              </div>

              {/* Client Distribution */}
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Client Distribution</h4>
                <div className="space-y-2">
                  {clientDistribution.map((client) => (
                    <div key={client.name} className="flex items-center gap-3">
                      <img
                        src={`/clients/${client.name.toLowerCase()}.png`}
                        alt={`${client.name} logo`}
                        className="w-5 h-5 object-contain"
                        onError={(event) => {
                          const target = event.currentTarget;
                          target.style.display = 'none';
                        }}
                      />
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-gray-200 text-sm">{client.name}</span>
                        <div className="text-right">
                          <span className="text-cyan-400 text-sm font-medium">
                            {((client.value / data.total_nodes) * 100).toFixed(1)}%
                          </span>
                          <div className="text-xs text-gray-400">
                            {client.value} nodes ({client.publicValue} public)
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