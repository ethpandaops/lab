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
  
  // Calculate additional stats
  const totalCities = Object.keys(summaryData.networks.mainnet.cities).length;
  const totalContinents = Object.keys(summaryData.networks.mainnet.continents).length;

  return (
    <div className="space-y-6" ref={containerReference}>
      <XatuCallToAction />

      {/* Overview Section */}
      <div className="backdrop-blur-md bg-surface/80 rounded-lg overflow-hidden shadow-md">
        <div className="p-6">
          <h2 className="text-2xl font-sans font-bold text-primary mb-2">Overview</h2>
          <span className="text-sm font-mono text-secondary">
            Last 24h · Updated{' '}
            <span 
              title={new Date(summaryData.updated_at * MS_PER_SECOND).toString()}
              className="cursor-help text-accent hover:underline"
            >
              {formatDistanceToNow(new Date(summaryData.updated_at * MS_PER_SECOND), { addSuffix: true })}
            </span>
          </span>
          <p className="text-base font-mono text-secondary mt-2 max-w-3xl">
            This data shows nodes sending data to ethPandaOps. While we run our own nodes, community-contributed data is most valuable.
          </p>
        </div>
        
        {/* Globe and Summary Stats */}
        <div className="px-6 pb-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Globe */}
            <div className="lg:col-span-2 bg-surface/60 rounded-lg overflow-hidden">
              <div className="p-4">
                <GlobeViz 
                  data={globeData} 
                  width={Math.max((containerWidth * GLOBE_WIDTH_SCALE) - GLOBE_PADDING, GLOBE_MIN_WIDTH)} 
                  height={350} 
                />
              </div>
            </div>

            {/* Summary Stats */}
            <div className="flex items-center justify-center">
              <div className="grid grid-cols-2 gap-4 w-full">
                <div className="bg-surface/60 rounded-lg overflow-hidden">
                  <div className="p-3 border-b border-subtle">
                    <div className="text-tertiary text-xs font-mono uppercase tracking-wider">Total Nodes</div>
                  </div>
                  <div className="p-3 flex items-center justify-center">
                    <div className="text-2xl font-mono font-bold text-primary">
                      {totalNodes.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="bg-surface/60 rounded-lg overflow-hidden">
                  <div className="p-3 border-b border-subtle">
                    <div className="text-tertiary text-xs font-mono uppercase tracking-wider">Public Nodes</div>
                  </div>
                  <div className="p-3 flex items-center justify-center">
                    <div className="text-2xl font-mono font-bold text-accent">
                      {totalPublicNodes.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="bg-surface/60 rounded-lg overflow-hidden">
                  <div className="p-3 border-b border-subtle">
                    <div className="text-tertiary text-xs font-mono uppercase tracking-wider">Networks</div>
                  </div>
                  <div className="p-3 flex items-center justify-center">
                    <div className="text-2xl font-mono font-bold text-primary">
                      {Object.keys(summaryData.networks).length}
                    </div>
                  </div>
                </div>

                <div className="bg-surface/60 rounded-lg overflow-hidden">
                  <div className="p-3 border-b border-subtle">
                    <div className="text-tertiary text-xs font-mono uppercase tracking-wider">Countries</div>
                  </div>
                  <div className="p-3 flex items-center justify-center">
                    <div className="text-2xl font-mono font-bold text-primary">
                      {Object.keys(summaryData.networks.mainnet.countries).length}
                    </div>
                  </div>
                </div>

                <div className="bg-surface/60 rounded-lg overflow-hidden">
                  <div className="p-3 border-b border-subtle">
                    <div className="text-tertiary text-xs font-mono uppercase tracking-wider">Cities</div>
                  </div>
                  <div className="p-3 flex items-center justify-center">
                    <div className="text-2xl font-mono font-bold text-primary">
                      {totalCities}
                    </div>
                  </div>
                </div>

                <div className="bg-surface/60 rounded-lg overflow-hidden">
                  <div className="p-3 border-b border-subtle">
                    <div className="text-tertiary text-xs font-mono uppercase tracking-wider">Continents</div>
                  </div>
                  <div className="p-3 flex items-center justify-center">
                    <div className="text-2xl font-mono font-bold text-primary">
                      {totalContinents}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link 
              to="contributors" 
              className="group bg-surface/60 rounded-lg overflow-hidden hover:bg-surface/80 transition-colors duration-300"
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">👥</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-sans font-bold text-primary group-hover:text-accent transition-colors mb-1">
                      Contributors
                    </h3>
                    <p className="text-sm font-mono text-tertiary truncate">
                      View contributor information
                    </p>
                  </div>

                  <ArrowRight className="w-5 h-5 text-accent/50 group-hover:text-accent group-hover:translate-x-1 transition-all duration-300" />
                </div>

                <p className="text-sm font-mono text-secondary group-hover:text-primary/90 transition-colors mt-3">
                  Explore detailed information about individual contributors and their nodes
                </p>
              </div>
            </Link>

            <Link 
              to="networks" 
              className="group bg-surface/60 rounded-lg overflow-hidden hover:bg-surface/80 transition-colors duration-300"
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">🌐</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-sans font-bold text-primary group-hover:text-accent transition-colors mb-1">
                      Networks
                    </h3>
                    <p className="text-sm font-mono text-tertiary truncate">
                      Network statistics
                    </p>
                  </div>

                  <ArrowRight className="w-5 h-5 text-accent/50 group-hover:text-accent group-hover:translate-x-1 transition-all duration-300" />
                </div>

                <p className="text-sm font-mono text-secondary group-hover:text-primary/90 transition-colors mt-3">
                  Explore metrics and data across different Ethereum networks
                </p>
              </div>
            </Link>

            <Link 
              to="community-nodes" 
              className="group bg-surface/60 rounded-lg overflow-hidden hover:bg-surface/80 transition-colors duration-300"
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">🖥️</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-sans font-bold text-primary group-hover:text-accent transition-colors mb-1">
                      Community Nodes
                    </h3>
                    <p className="text-sm font-mono text-tertiary truncate">
                      Node distribution data
                    </p>
                  </div>

                  <ArrowRight className="w-5 h-5 text-accent/50 group-hover:text-accent group-hover:translate-x-1 transition-all duration-300" />
                </div>

                <p className="text-sm font-mono text-secondary group-hover:text-primary/90 transition-colors mt-3">
                  View detailed information about community-contributed nodes
                </p>
              </div>
            </Link>

            <Link 
              to="fork-readiness" 
              className="group bg-surface/60 rounded-lg overflow-hidden hover:bg-surface/80 transition-colors duration-300"
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">🔄</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-sans font-bold text-primary group-hover:text-accent transition-colors mb-1">
                      Fork Readiness
                    </h3>
                    <p className="text-sm font-mono text-tertiary truncate">
                      Client version readiness
                    </p>
                  </div>

                  <ArrowRight className="w-5 h-5 text-accent/50 group-hover:text-accent group-hover:translate-x-1 transition-all duration-300" />
                </div>

                <p className="text-sm font-mono text-secondary group-hover:text-primary/90 transition-colors mt-3">
                  Track client version readiness for upcoming network forks
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Xatu; 