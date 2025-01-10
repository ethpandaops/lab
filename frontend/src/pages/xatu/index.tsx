import { Link } from 'react-router-dom'
import { ArrowRight, Database, Github } from 'lucide-react'
import { XatuCallToAction } from '../../components/xatu/XatuCallToAction'
import { GlobeViz } from '../../components/xatu/GlobeViz'
import { useDataFetch } from '../../utils/data'
import { useRef, useState, useEffect } from 'react'
import { formatDistanceToNow } from 'date-fns'

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
  countries: {
    [key: string]: Country
  }
  continents: {
    [key: string]: Country
  }
  cities: {
    [key: string]: Country
  }
  consensus_implementations: {
    [key: string]: ConsensusImplementation
  }
}

interface Summary {
  updated_at: number
  networks: {
    mainnet: NetworkData
    sepolia: NetworkData
    holesky: NetworkData
  }
}

const GLOBE_WIDTH_RATIO = 0.66
const GLOBE_PADDING = 48
const MIN_GLOBE_WIDTH = 600

const NETWORK_METADATA = {
  mainnet: {
    name: 'Mainnet',
    icon: (
      <svg width="20" height="20" viewBox="0 0 784 784" fill="none">
        <circle cx="392" cy="392" r="392" fill="#627EEA" fillOpacity="0.1"/>
        <path d="M392.07 92.5L387.9 105.667V525.477L392.07 529.647L586.477 413.42L392.07 92.5Z" fill="#627EEA"/>
        <path d="M392.07 92.5L197.666 413.42L392.07 529.647V324.921V92.5Z" fill="#627EEA"/>
        <path d="M392.07 572.834L389.706 575.668V726.831L392.07 733.5L586.607 456.679L392.07 572.834Z" fill="#627EEA"/>
        <path d="M392.07 733.5V572.834L197.666 456.679L392.07 733.5Z" fill="#627EEA"/>
        <path d="M392.07 529.647L586.477 413.42L392.07 324.921V529.647Z" fill="#627EEA"/>
        <path d="M197.666 413.42L392.07 529.647V324.921L197.666 413.42Z" fill="#627EEA"/>
      </svg>
    ),
    color: '#627EEA'
  },
  sepolia: {
    name: 'Sepolia',
    icon: '🐬',
    color: '#CFB5F0'
  },
  holesky: {
    name: 'Holesky',
    icon: '🐱',
    color: '#A4E887'
  }
} as const

const CLIENT_METADATA: { [key: string]: { name: string } } = {
  prysm: { name: 'Prysm' },
  teku: { name: 'Teku' },
  lighthouse: { name: 'Lighthouse' },
  lodestar: { name: 'Lodestar' },
  nimbus: { name: 'Nimbus' }
}

export const Xatu = (): JSX.Element => {
  const containerReference = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    if (!containerReference.current) return

    setContainerWidth(containerReference.current.offsetWidth)

    const observer = new ResizeObserver((entries: ResizeObserverEntry[]) => {
      setContainerWidth(entries[0].contentRect.width)
    })

    observer.observe(containerReference.current)
    return () => observer.disconnect()
  }, [])

  const { data: summaryData } = useDataFetch<Summary>(
    'xatu-public-contributors/summary.json'
  )

  if (!summaryData) {
    return <div>Loading...</div>
  }

  // Transform summary data for the globe - use mainnet data for the globe
  const globeData = [{
    time: Date.now() / 1000,
    countries: Object.entries(summaryData.networks.mainnet.countries).map(([name, data]) => ({
      name,
      value: data.total_nodes
    }))
  }]

  // Calculate total nodes across all networks
  const totalNodes = Object.values(summaryData.networks).reduce((acc, network) => acc + network.total_nodes, 0)
  const totalPublicNodes = Object.values(summaryData.networks).reduce((acc, network) => acc + network.total_public_nodes, 0)
  const totalethPandaOpsNodes = totalNodes - totalPublicNodes

  return (
    <div className="space-y-8" ref={containerReference}>
      {/* Overview Section */}
      <div className="bg-gray-900/80 backdrop-blur-md rounded-lg p-6 border border-gray-800 shadow-xl mb-8">
        <div className="flex flex-col mb-6">
          <h2 className="text-2xl font-bold text-cyan-400">Overview</h2>
          <span className="text-gray-400 text-sm">
            Last 24h · Updated{' '}
            <span 
              title={new Date(summaryData.updated_at * 1000).toString()}
              className="cursor-help border-b border-dotted border-gray-500"
            >
              {formatDistanceToNow(new Date(summaryData.updated_at * 1000), { addSuffix: true })}
            </span>
          </span>
          <p className="text-gray-300 mt-4">
            This data provides a summary of the nodes that are sending the ethPandaOps team data from their nodes.
            While the ethPandaOps team runs our own nodes, the data from community nodes is far more valuable.
          </p>
        </div>
        
        {/* Globe and Summary Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Globe */}
          <div className="lg:col-span-2">
            <GlobeViz 
              data={globeData} 
              width={Math.max((containerWidth * 0.66) - GLOBE_PADDING, MIN_GLOBE_WIDTH)} 
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
                <div className="text-gray-400 text-xs uppercase tracking-wider text-left">Consensus Clients</div>
                <div className="text-3xl font-bold text-cyan-400 mt-2 text-center flex-grow flex items-center justify-center">
                  {Object.keys(summaryData.networks.mainnet.consensus_implementations).length}
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex flex-col h-28">
                <div className="text-gray-400 text-xs uppercase tracking-wider text-left">Countries</div>
                <div className="text-3xl font-bold text-cyan-400 mt-2 text-center flex-grow flex items-center justify-center">
                  {Object.keys(summaryData.networks.mainnet.countries).length}
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex flex-col h-28">
                <div className="text-gray-400 text-xs uppercase tracking-wider text-left">Cities</div>
                <div className="text-3xl font-bold text-cyan-400 mt-2 text-center flex-grow flex items-center justify-center">
                  {Object.entries(summaryData.networks.mainnet.cities).filter(([name]) => name !== '').length}
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex flex-col h-28">
                <div className="text-gray-400 text-xs uppercase tracking-wider text-left">Continents</div>
                <div className="text-3xl font-bold text-cyan-400 mt-2 text-center flex-grow flex items-center justify-center">
                  {Object.keys(summaryData.networks.mainnet.continents).length}
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
                <p className="text-gray-300 text-sm">View information about the individual contributors to the Xatu dataset</p>
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
                <p className="text-gray-300 text-sm">Explore the networks that are in the Xatu dataset</p>
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
                <p className="text-gray-300 text-sm">Explore the community nodes contributing to the Xatu dataset</p>
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
  )
} 