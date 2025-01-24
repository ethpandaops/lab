import { Link, Outlet, useLocation } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useDataFetch } from '../../utils/data'
import { formatDistanceToNow } from 'date-fns'
import { useRef, useState, useEffect } from 'react'
import { GlobeViz } from '../../components/xatu/GlobeViz'
import { XatuCallToAction } from '../../components/xatu/XatuCallToAction'

interface ConsensusImplementation {
  total_nodes: number
  public_nodes: number
}

interface Country {
  total_nodes: number
  public_nodes: number
}

interface NetworkData {
  total_nodes: number
  total_public_nodes: number
  countries: Record<string, Country>
  continents: Record<string, Country>
  cities: Record<string, Country>
  consensus_implementations: Record<string, ConsensusImplementation>
}

interface Summary {
  updated_at: number
  networks: {
    mainnet: NetworkData
    sepolia: NetworkData
    holesky: NetworkData
  }
}

const GLOBE_MIN_WIDTH = 600
const GLOBE_PADDING = 48
const GLOBE_WIDTH_SCALE = 0.66
const MS_PER_SECOND = 1000

const CLIENT_METADATA: Record<string, { name: string }> = {
  prysm: { name: 'Prysm' },
  teku: { name: 'Teku' },
  lighthouse: { name: 'Lighthouse' },
  lodestar: { name: 'Lodestar' },
  nimbus: { name: 'Nimbus' },
};

function Xatu(): JSX.Element {
  const location = useLocation()
  const containerReference = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const { data: summaryData } = useDataFetch<Summary>('xatu-public-contributors/summary.json')

  useEffect(() => {
    if (!containerReference.current) {
      return
    }

    setContainerWidth(containerReference.current.offsetWidth)

    const observer = new ResizeObserver((entries: ResizeObserverEntry[]) => {
      setContainerWidth(entries[0].contentRect.width)
    })

    observer.observe(containerReference.current)
    return () => observer.disconnect()
  }, [])

  // If we're on a nested route, render the child route
  if (location.pathname !== '/xatu') {
    return (
      <div>
        <div className="bg-gray-900/80 backdrop-blur-md rounded-lg p-6 border border-gray-800 shadow-xl">
          <Outlet />
        </div>
      </div>
    )
  }

  if (!summaryData) {
    return <div>Loading...</div>
  }

  // Transform summary data for the globe - use mainnet data for the globe
  const globeData = [{
    time: Date.now() / MS_PER_SECOND,
    countries: Object.entries(summaryData.networks.mainnet.countries).map(([name, data]) => ({
      name,
      value: data.total_nodes
    })),
  }]

  // Calculate total nodes across all networks
  const totalNodes = Object.values(summaryData.networks).reduce((accumulator, network) => accumulator + network.total_nodes, 0)
  const totalPublicNodes = Object.values(summaryData.networks).reduce((accumulator, network) => accumulator + network.total_public_nodes, 0)

  // Calculate client distribution for mainnet
  const clientDistribution = Object.entries(summaryData.networks.mainnet.consensus_implementations)
    .map(([client, data]) => ({
      name: CLIENT_METADATA[client]?.name || client,
      value: data.total_nodes,
      publicValue: data.public_nodes,
    }))
    .sort((a, b) => b.value - a.value);

  const totalMainnetNodes = summaryData.networks.mainnet.total_nodes;

  return (
    <div className="space-y-8" ref={containerReference}>
      <div className="mt-8">
        <XatuCallToAction />
      </div>
      {/* Overview Section */}
      <div className="bg-gray-900/80 backdrop-blur-md rounded-lg p-6 border border-gray-800 shadow-xl mb-8">
        <div className="flex flex-col mb-6">
          <h2 className="text-2xl font-bold text-cyan-400">Overview</h2>
          <span className="text-gray-400 text-sm">
            Last 24h · Updated{' '}
            <span 
              title={new Date(summaryData.updated_at * MS_PER_SECOND).toString()}
              className="cursor-help border-b border-dotted border-gray-500"
            >
              {formatDistanceToNow(new Date(summaryData.updated_at * MS_PER_SECOND), { addSuffix: true })}
            </span>
          </span>
          <p className="text-gray-300 mt-4">
            This data shows nodes sending data to ethPandaOps. While we run our own nodes, community-contributed data is most valuable.
          </p>
        </div>
        
        {/* Globe and Summary Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Globe */}
          <div className="lg:col-span-2">
            <GlobeViz 
              data={globeData} 
              width={Math.max((containerWidth * GLOBE_WIDTH_SCALE) - GLOBE_PADDING, GLOBE_MIN_WIDTH)} 
              height={400} 
            />
          </div>

          {/* Summary Stats */}
          <div className="flex items-center justify-center">
            <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex flex-col h-28">
                <div className="text-gray-400 text-xs uppercase tracking-wider text-left">Total Nodes</div>
                <div className="text-3xl font-bold text-cyan-400 mt-2 text-center flex-grow flex items-center justify-center">
                  {totalNodes.toLocaleString()}
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex flex-col h-28">
                <div className="text-gray-400 text-xs uppercase tracking-wider text-left">Networks</div>
                <div className="text-3xl font-bold text-cyan-400 mt-2 text-center flex-grow flex items-center justify-center">
                  {Object.keys(summaryData.networks).length}
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex flex-col h-28">
                <div className="text-gray-400 text-xs uppercase tracking-wider text-left">Public Nodes</div>
                <div className="text-3xl font-bold text-cyan-400 mt-2 text-center flex-grow flex items-center justify-center">
                  {totalPublicNodes.toLocaleString()}
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex flex-col h-28">
                <div className="text-gray-400 text-xs uppercase tracking-wider text-left">Countries</div>
                <div className="text-3xl font-bold text-cyan-400 mt-2 text-center flex-grow flex items-center justify-center">
                  {Object.keys(summaryData.networks.mainnet.countries).length}
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link to="contributors" className="group bg-gray-800/50 rounded-lg p-6 border border-gray-700 hover:bg-gray-700/50 hover:border-cyan-500/50 transition-all">
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 text-4xl text-gray-200 mt-0.5">👥</div>
              <div className="flex flex-col flex-grow">
                <h3 className="text-xl font-semibold text-cyan-400 mb-2">Contributors</h3>
                <p className="text-gray-300 text-sm">View information about the individual contributors</p>
              </div>
            </div>
            <button type="button" className="mt-6 w-full py-3 px-4 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-500/30 rounded-lg text-cyan-400 font-medium transition-all flex items-center justify-center gap-2 group-hover:bg-cyan-500/20">
              View Details
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>

          <Link to="networks" className="group bg-gray-800/50 rounded-lg p-6 border border-gray-700 hover:bg-gray-700/50 hover:border-cyan-500/50 transition-all">
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 text-4xl text-gray-200 mt-0.5">🌐</div>
              <div className="flex flex-col flex-grow">
                <h3 className="text-xl font-semibold text-cyan-400 mb-2">Networks</h3>
                <p className="text-gray-300 text-sm">Explore the networks in the Xatu dataset</p>
              </div>
            </div>
            <button type="button" className="mt-6 w-full py-3 px-4 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-500/30 rounded-lg text-cyan-400 font-medium transition-all flex items-center justify-center gap-2 group-hover:bg-cyan-500/20">
              View Details
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>

          <Link to="community-nodes" className="group bg-gray-800/50 rounded-lg p-6 border border-gray-700 hover:bg-gray-700/50 hover:border-cyan-500/50 transition-all">
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 text-4xl text-gray-200 mt-0.5">🖥️</div>
              <div className="flex flex-col flex-grow">
                <h3 className="text-xl font-semibold text-cyan-400 mb-2">Community Nodes</h3>
                <p className="text-gray-300 text-sm">Explore the community nodes in the dataset</p>
              </div>
            </div>
            <button type="button" className="mt-6 w-full py-3 px-4 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 hover:border-cyan-500/30 rounded-lg text-cyan-400 font-medium transition-all flex items-center justify-center gap-2 group-hover:bg-cyan-500/20">
              View Details
              <ArrowRight className="w-5 h-5" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Xatu; 