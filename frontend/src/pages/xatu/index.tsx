import { Link, Outlet, useLocation } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useDataFetch } from '../../utils/data'
import { formatDistanceToNow } from 'date-fns'
import { useRef, useState, useEffect, useContext } from 'react'
import { GlobeViz } from '../../components/xatu/GlobeViz'
import { XatuCallToAction } from '../../components/xatu/XatuCallToAction'
import { ConfigContext } from '../../App'
import type { Config } from '../../types'

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
  const config = useContext(ConfigContext)

  // Skip data fetching if config isn't loaded
  const summaryPath = config?.modules?.['xatu_public_contributors']?.path_prefix 
    ? `${config.modules['xatu_public_contributors'].path_prefix}/summary.json`
    : null;

  const { data: summaryData } = useDataFetch<Summary>(summaryPath)

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
        <div>
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
    <div className="space-y-6" ref={containerReference}>
      <XatuCallToAction />

      {/* Page Header */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-cyber-neon/20 to-transparent" />
        </div>
        <div className="relative flex justify-center">
          <div className="px-4 bg-cyber-darker">
            <h1 className="text-3xl md:text-4xl font-sans font-black bg-gradient-to-r from-cyber-neon via-cyber-blue to-cyber-pink bg-clip-text text-transparent animate-text-shine">
              Xatu
            </h1>
          </div>
        </div>
      </div>

      {/* Overview Section */}
      <div className="backdrop-blur-md rounded-lg border border-cyber-neon/20 p-6 bg-cyber-dark/80">
        <div className="flex flex-col mb-6">
          <h2 className="text-2xl font-sans font-bold text-cyber-neon mb-2">Overview</h2>
          <span className="text-sm font-mono text-cyber-neon/85">
            Last 24h · Updated{' '}
            <span 
              title={new Date(summaryData.updated_at * MS_PER_SECOND).toString()}
              className="cursor-help border-b border-dotted border-cyber-neon/50 hover:border-cyber-neon/70 transition-colors"
            >
              {formatDistanceToNow(new Date(summaryData.updated_at * MS_PER_SECOND), { addSuffix: true })}
            </span>
          </span>
          <p className="text-base font-mono text-cyber-neon/85 mt-4">
            This data shows nodes sending data to ethPandaOps. While we run our own nodes, community-contributed data is most valuable.
          </p>
        </div>
        
        {/* Globe and Summary Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Globe */}
          <div className="lg:col-span-2 backdrop-blur-md rounded-lg border border-cyber-neon/20 bg-cyber-dark/90 p-4">
            <GlobeViz 
              data={globeData} 
              width={Math.max((containerWidth * GLOBE_WIDTH_SCALE) - GLOBE_PADDING, GLOBE_MIN_WIDTH)} 
              height={400} 
            />
          </div>

          {/* Summary Stats */}
          <div className="flex items-center justify-center">
            <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
              <div className="backdrop-blur-md rounded-lg border border-cyber-neon/20 bg-cyber-dark/90 hover:border-cyber-neon/30 hover:bg-cyber-neon/5 p-4 flex flex-col h-28 transition-all duration-300">
                <div className="text-cyber-neon/70 text-xs font-mono uppercase tracking-wider text-left">Total Nodes</div>
                <div className="text-3xl font-mono font-bold text-cyber-neon mt-2 text-center flex-grow flex items-center justify-center">
                  {totalNodes.toLocaleString()}
                </div>
              </div>

              <div className="backdrop-blur-md rounded-lg border border-cyber-neon/20 bg-cyber-dark/90 hover:border-cyber-neon/30 hover:bg-cyber-neon/5 p-4 flex flex-col h-28 transition-all duration-300">
                <div className="text-cyber-neon/70 text-xs font-mono uppercase tracking-wider text-left">Networks</div>
                <div className="text-3xl font-mono font-bold text-cyber-neon mt-2 text-center flex-grow flex items-center justify-center">
                  {Object.keys(summaryData.networks).length}
                </div>
              </div>

              <div className="backdrop-blur-md rounded-lg border border-cyber-neon/20 bg-cyber-dark/90 hover:border-cyber-neon/30 hover:bg-cyber-neon/5 p-4 flex flex-col h-28 transition-all duration-300">
                <div className="text-cyber-neon/70 text-xs font-mono uppercase tracking-wider text-left">Public Nodes</div>
                <div className="text-3xl font-mono font-bold text-cyber-neon mt-2 text-center flex-grow flex items-center justify-center">
                  {totalPublicNodes.toLocaleString()}
                </div>
              </div>

              <div className="backdrop-blur-md rounded-lg border border-cyber-neon/20 bg-cyber-dark/90 hover:border-cyber-neon/30 hover:bg-cyber-neon/5 p-4 flex flex-col h-28 transition-all duration-300">
                <div className="text-cyber-neon/70 text-xs font-mono uppercase tracking-wider text-left">Countries</div>
                <div className="text-3xl font-mono font-bold text-cyber-neon mt-2 text-center flex-grow flex items-center justify-center">
                  {Object.keys(summaryData.networks.mainnet.countries).length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Link 
            to="contributors" 
            className="group backdrop-blur-md rounded-lg border border-cyber-neon/20 bg-cyber-dark/90 hover:border-cyber-neon/30 hover:bg-cyber-neon/5 p-6 transition-all duration-300"
          >
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 text-4xl mt-0.5">👥</div>
              <div className="flex flex-col flex-grow">
                <h3 className="text-xl font-sans font-bold text-cyber-neon group-hover:text-cyber-blue transition-colors">Contributors</h3>
                <p className="text-sm font-mono text-cyber-neon/85">View information about the individual contributors</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <ArrowRight className="w-6 h-6 text-cyber-neon/50 group-hover:text-cyber-blue group-hover:translate-x-1 transition-all duration-300" />
            </div>
          </Link>

          <Link 
            to="networks" 
            className="group backdrop-blur-md rounded-lg border border-cyber-neon/20 bg-cyber-dark/90 hover:border-cyber-neon/30 hover:bg-cyber-neon/5 p-6 transition-all duration-300"
          >
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 text-4xl mt-0.5">🌐</div>
              <div className="flex flex-col flex-grow">
                <h3 className="text-xl font-sans font-bold text-cyber-neon group-hover:text-cyber-blue transition-colors">Networks</h3>
                <p className="text-sm font-mono text-cyber-neon/85">Explore the networks in the Xatu dataset</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <ArrowRight className="w-6 h-6 text-cyber-neon/50 group-hover:text-cyber-blue group-hover:translate-x-1 transition-all duration-300" />
            </div>
          </Link>

          <Link 
            to="community-nodes" 
            className="group backdrop-blur-md rounded-lg border border-cyber-neon/20 bg-cyber-dark/90 hover:border-cyber-neon/30 hover:bg-cyber-neon/5 p-6 transition-all duration-300"
          >
            <div className="flex gap-6 items-start">
              <div className="flex-shrink-0 text-4xl mt-0.5">🖥️</div>
              <div className="flex flex-col flex-grow">
                <h3 className="text-xl font-sans font-bold text-cyber-neon group-hover:text-cyber-blue transition-colors">Community Nodes</h3>
                <p className="text-sm font-mono text-cyber-neon/85">Explore the community nodes in the dataset</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <ArrowRight className="w-6 h-6 text-cyber-neon/50 group-hover:text-cyber-blue group-hover:translate-x-1 transition-all duration-300" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Xatu; 