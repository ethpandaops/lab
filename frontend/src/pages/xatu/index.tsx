import { Link } from 'react-router-dom'
import { ArrowRight, Database, Github } from 'lucide-react'
import { XatuCallToAction } from '../../components/xatu/XatuCallToAction'
import { GlobeViz } from '../../components/xatu/GlobeViz'
import { useDataFetch } from '../../utils/data'
import { useRef, useState, useEffect } from 'react'

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
  [key: string]: NetworkData
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
    countries: Object.entries(summaryData.mainnet.countries).map(([name, data]) => ({
      name,
      value: data.total_nodes
    }))
  }]

  // Calculate total nodes across all networks
  const totalNodes = Object.values(summaryData).reduce((acc, network) => acc + network.total_nodes, 0)
  const totalPublicNodes = Object.values(summaryData).reduce((acc, network) => acc + network.total_public_nodes, 0)
  const totalEthPandaOpsNodes = totalNodes - totalPublicNodes

  return (
    <div className="space-y-8" ref={containerReference}>
      {/* About This Data */}
      <div className="bg-gray-900/80 backdrop-blur-md rounded-lg p-6 border border-gray-800 shadow-xl mb-8">
        <h2 className="text-xl font-semibold text-cyan-400 mb-2">About This Data</h2>
        <p className="text-gray-300">
          This data provides a sumamry of the nodes that are sending the ethPandaOps team data from their nodes.
          While the ethPandaOps team runs our own nodes, the data from community nodes is far more valuable.
        </p>
      </div>

      {/* Overview Section */}
      <div className="bg-gray-900/80 backdrop-blur-md rounded-lg p-6 border border-gray-800 shadow-xl mb-8">
        <div className="flex flex-col mb-6">
          <h2 className="text-2xl font-bold text-cyan-400">Overview</h2>
          <span className="text-gray-400 text-sm">Last 24h</span>
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
                  {Object.keys(summaryData).length}
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex flex-col h-28">
                <div className="text-gray-400 text-xs uppercase tracking-wider text-left">Consensus Clients</div>
                <div className="text-3xl font-bold text-cyan-400 mt-2 text-center flex-grow flex items-center justify-center">
                  {Object.keys(summaryData.mainnet.consensus_implementations).length}
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex flex-col h-28">
                <div className="text-gray-400 text-xs uppercase tracking-wider text-left">Countries</div>
                <div className="text-3xl font-bold text-cyan-400 mt-2 text-center flex-grow flex items-center justify-center">
                  {Object.keys(summaryData.mainnet.countries).length}
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex flex-col h-28">
                <div className="text-gray-400 text-xs uppercase tracking-wider text-left">Cities</div>
                <div className="text-3xl font-bold text-cyan-400 mt-2 text-center flex-grow flex items-center justify-center">
                  {Object.entries(summaryData.mainnet.cities).filter(([name]) => name !== '').length}
                </div>
              </div>

              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700 flex flex-col h-28">
                <div className="text-gray-400 text-xs uppercase tracking-wider text-left">Continents</div>
                <div className="text-3xl font-bold text-cyan-400 mt-2 text-center flex-grow flex items-center justify-center">
                  {Object.keys(summaryData.mainnet.continents).length}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-sm mb-2">Top Continents</div>
            <div className="space-y-2">
              {Object.entries(summaryData.mainnet.continents)
                .sort((a, b) => b[1].total_nodes - a[1].total_nodes)
                .slice(0, 3)
                .map(([code, data]) => {
                  const continentNames: { [key: string]: string } = {
                    'NA': 'North America',
                    'SA': 'South America',
                    'EU': 'Europe',
                    'AS': 'Asia',
                    'AF': 'Africa',
                    'OC': 'Oceania',
                    'AN': 'Antarctica'
                  }
                  return (
                    <div key={code} className="flex justify-between text-sm">
                      <span className="text-gray-300">{continentNames[code] || code}</span>
                      <span className="text-gray-400">
                        {data.total_nodes} nodes ({data.public_nodes} community)
                      </span>
                    </div>
                  )
                })}
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-sm mb-2">Top Cities</div>
            <div className="space-y-2">
              {Object.entries(summaryData.mainnet.cities)
                .filter(([name]) => name !== '') // Filter out empty city names
                .sort((a, b) => b[1].total_nodes - a[1].total_nodes)
                .slice(0, 3) // Show top 3 cities
                .map(([name, data]) => (
                  <div key={name} className="flex justify-between text-sm">
                    <span className="text-gray-300">{name}</span>
                    <span className="text-gray-400">
                      {data.total_nodes} nodes ({data.public_nodes} community)
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="text-gray-400 text-sm mb-2">Geographic Stats</div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Most Nodes</span>
                <span className="text-gray-400">Australia (10)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Most Community</span>
                <span className="text-gray-400">Canada (4)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-300">Top City</span>
                <span className="text-gray-400">Melbourne (6)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Network Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Object.entries(summaryData).map(([name, data]) => {
            const metadata = NETWORK_METADATA[name as keyof typeof NETWORK_METADATA] || {
              name: name.charAt(0).toUpperCase() + name.slice(1),
              icon: '🔥',
              color: '#627EEA'
            }

            const formatClientName = (name: string) => {
              const specialNames: { [key: string]: string } = {
                'prysm': 'Prysm',
                'teku': 'Teku',
                'lighthouse': 'Lighthouse',
                'lodestar': 'Lodestar',
                'nimbus': 'Nimbus'
              }
              return specialNames[name] || name.charAt(0).toUpperCase() + name.slice(1)
            }

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
                    <div>{data.total_nodes - data.total_public_nodes} EthPandaOps</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-gray-300 mb-2">Consensus Clients</div>
                  {Object.entries(data.consensus_implementations)
                    .sort((a, b) => b[1].total_nodes - a[1].total_nodes)
                    .map(([client, stats]) => {
                      const clientMeta = CLIENT_METADATA[client] || { name: client }
                      return (
                        <div key={client} className="bg-gray-900/50 rounded-lg p-2 border border-gray-700">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              <img 
                                src={`/clients/${client}.png`} 
                                alt={`${clientMeta.name} logo`}
                                className="w-5 h-5 object-contain"
                                onError={(e) => {
                                  // If image fails to load, remove it
                                  e.currentTarget.style.display = 'none'
                                }}
                              />
                              <span className="text-gray-300">{clientMeta.name}</span>
                            </div>
                            <span className="text-gray-400 text-sm">
                              {stats.total_nodes} nodes
                            </span>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {stats.public_nodes} community · {stats.total_nodes - stats.public_nodes} EthPandaOps
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
} 