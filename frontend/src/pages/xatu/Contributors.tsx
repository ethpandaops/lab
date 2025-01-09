import { useDataFetch } from '../../utils/data'
import { LoadingState } from '../../components/common/LoadingState'
import { ErrorState } from '../../components/common/ErrorState'
import { XatuCallToAction } from '../../components/xatu/XatuCallToAction'
import { NetworkSelector } from '../../components/common/NetworkSelector'
import { useState, useEffect, useMemo, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getConfig } from '../../utils/config'
import type { Config } from '../../types'
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import { GlobeViz } from '../../components/xatu/GlobeViz'

interface CountryData {
  time: number
  countries: {
    name: string
    value: number
  }[]
}

interface UserData {
  time: number
  users: {
    name: string
    nodes: number
  }[]
}

type TimeWindow = string

// Generate a deterministic color based on string
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = hash % 360;
  return `hsl(${hue}, 70%, 60%)`;
};

const SECTIONS = {
  'total-nodes': 'total-nodes',
  'nodes-by-country': 'nodes-by-country'
} as const

type SectionId = keyof typeof SECTIONS

export const Contributors = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [config, setConfig] = useState<Config | null>(null)
  const [isTimeWindowOpen, setIsTimeWindowOpen] = useState(false)
  const [hiddenCountries, setHiddenCountries] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  // Update container width on mount and resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth)
      }
    }

    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  const timeWindows = useMemo(() => 
    config?.notebooks['xatu-public-contributors'].time_windows || [
      { file: 'last_30_days', step: '1d', label: '30d', range: '-30d' },
      { file: 'last_1_day', step: '1h', label: '1d', range: '-1d' }
    ],
    [config]
  )

  const defaultTimeWindow = useMemo(() => timeWindows[0]?.file || 'last_30_days', [timeWindows])
  const defaultNetwork = useMemo(() => 
    config?.notebooks['xatu-public-contributors'].networks?.[0] || 'mainnet',
    [config]
  )

  const [timeWindow, setTimeWindow] = useState<TimeWindow>(() => 
    searchParams.get('timeWindow') || defaultTimeWindow
  )
  const [network, setNetwork] = useState<string>(() => 
    searchParams.get('network') || defaultNetwork
  )

  // Refs for section scrolling
  const totalNodesRef = useRef<HTMLDivElement>(null)
  const countriesRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getConfig().then(setConfig).catch(console.error)
  }, [])

  // Update URL when network/timeWindow changes
  useEffect(() => {
    const newParams = new URLSearchParams(searchParams)
    newParams.set('network', network)
    newParams.set('timeWindow', timeWindow)
    setSearchParams(newParams)
  }, [network, timeWindow, setSearchParams])

  // Handle section scrolling
  useEffect(() => {
    const hash = location.hash.slice(1)
    if (!hash) return

    const refs = {
      [SECTIONS['total-nodes']]: totalNodesRef,
      [SECTIONS['nodes-by-country']]: countriesRef
    }

    const ref = refs[hash as SectionId]
    if (ref?.current) {
      ref.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [location.hash])

  const handleSectionClick = (section: SectionId) => {
    navigate({ hash: section })
  }

  const { data: countriesData, loading: countriesLoading, error: countriesError } = useDataFetch<CountryData[]>(
    `xatu-public-contributors/countries/${network}/${timeWindow}.json`
  )

  const { data: usersData, loading: usersLoading, error: usersError } = useDataFetch<UserData[]>(
    `xatu-public-contributors/users/${network}/${timeWindow}.json`
  )

  const currentWindow = useMemo(() => 
    timeWindows.find(w => w.file === timeWindow),
    [timeWindows, timeWindow]
  )

  const formatTime = useMemo(() => (time: number) => {
    const date = new Date(time * 1000);
    return currentWindow?.step === '1h'
      ? date.toLocaleTimeString() 
      : date.toLocaleDateString();
  }, [currentWindow])

  const { chartData, totalNodesData, topCountries } = useMemo(() => {
    if (!countriesData) {
      return { chartData: [], totalNodesData: [], topCountries: [] }
    }

    // Convert the new format to chart data
    const chartData = countriesData.map(timePoint => {
      const dataPoint: Record<string, any> = { time: timePoint.time };
      timePoint.countries.forEach(country => {
        dataPoint[country.name] = country.value;
      });
      return dataPoint;
    }).sort((a, b) => a.time - b.time);

    // Calculate total nodes per time point
    const totalNodesData = chartData.map(timePoint => ({
      time: timePoint.time,
      total: Object.entries(timePoint)
        .filter(([key]) => key !== 'time')
        .reduce((sum, [, value]) => sum + (value as number), 0)
    }));

    // Get top 10 countries by total contributors
    const countryTotals = chartData.reduce((acc, timePoint) => {
      Object.entries(timePoint).forEach(([key, value]) => {
        if (key !== 'time') {
          acc[key] = (acc[key] || 0) + (value as number);
        }
      });
      return acc;
    }, {} as Record<string, number>);

    const topCountries = Object.entries(countryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([country]) => country);

    return { chartData, totalNodesData, topCountries }
  }, [countriesData])

  const { userChartData, topUsers } = useMemo(() => {
    if (!usersData) {
      return { userChartData: [], topUsers: [] }
    }

    // Convert the new format to chart data
    const chartData = usersData.map(timePoint => {
      const dataPoint: Record<string, any> = { time: timePoint.time };
      timePoint.users.forEach(user => {
        dataPoint[user.name] = user.nodes;
      });
      return dataPoint;
    }).sort((a, b) => a.time - b.time);

    // Get top 10 users by total nodes
    const userTotals = chartData.reduce((acc, timePoint) => {
      Object.entries(timePoint).forEach(([key, value]) => {
        if (key !== 'time') {
          acc[key] = (acc[key] || 0) + (value as number);
        }
      });
      return acc;
    }, {} as Record<string, number>);

    const topUsers = Object.entries(userTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([user]) => user);

    return { userChartData: chartData, topUsers }
  }, [usersData])

  const [hiddenUsers, setHiddenUsers] = useState<Set<string>>(new Set())

  if (countriesLoading || usersLoading) {
    return <LoadingState message="Loading data..." />
  }

  if (countriesError || usersError) {
    return <ErrorState message="Failed to load data" error={countriesError || usersError || new Error('Unknown error')} />
  }

  if (!countriesData || !usersData) {
    return <ErrorState message="No data available" />
  }

  return (
    <div className="space-y-8" ref={containerRef}>
      <XatuCallToAction />

      <div className="bg-gray-900/80 backdrop-blur-md rounded-lg p-6 border border-gray-800 shadow-xl mb-8">
        <h2 className="text-xl font-semibold text-cyan-400 mb-2">About This Data</h2>
        <p className="text-gray-300">
          This data represents nodes from the Ethereum community that have opted in to share their node information with us. 
          The data helps us understand the geographical distribution of nodes and monitor the health of the network.
          All data is anonymized and no personally identifiable information is collected.
        </p>
      </div>

      <div className="flex justify-end gap-4 mb-8">
        <NetworkSelector
          selectedNetwork={network}
          onNetworkChange={setNetwork}
        />
        <div className="relative">
          <button
            onClick={() => setIsTimeWindowOpen(!isTimeWindowOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 text-gray-300 border border-gray-700 hover:border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{currentWindow?.label || 'Select Time'}</span>
            <svg 
              className={`w-4 h-4 transition-transform ${isTimeWindowOpen ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isTimeWindowOpen && (
            <div className="absolute z-10 right-0 mt-2 w-48 rounded-lg bg-gray-800 border border-gray-700 shadow-xl">
              {timeWindows.map((window) => (
                <button
                  key={window.file}
                  onClick={() => {
                    setTimeWindow(window.file)
                    setIsTimeWindowOpen(false)
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg text-gray-300 ${
                    window.file === timeWindow ? 'bg-gray-700' : ''
                  }`}
                >
                  <span>{window.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-gray-900/80 backdrop-blur-md rounded-lg p-6 border border-gray-800 shadow-xl mb-8 overflow-hidden">
        <h2 className="text-2xl font-bold text-cyan-400 mb-6">Overview</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Globe visualization */}
          <div className="lg:col-span-2">
            <GlobeViz data={countriesData} width={Math.max(containerWidth * 0.66 - 48, 600)} height={400} />
          </div>

          {/* Summary stats */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-sm">Countries</div>
                <div className="text-2xl font-bold text-cyan-400 mt-1">
                  {topCountries.length}
                </div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-sm">Networks</div>
                <div className="text-2xl font-bold text-cyan-400 mt-1">
                  {config?.notebooks['xatu-public-contributors'].networks?.length || 1}
                </div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-sm">Total Nodes</div>
                <div className="text-2xl font-bold text-cyan-400 mt-1">
                  {totalNodesData[totalNodesData.length - 1]?.total || 0}
                </div>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="text-gray-400 text-sm">Community Members</div>
                <div className="text-2xl font-bold text-cyan-400 mt-1">
                  {topUsers.length}
                </div>
              </div>
            </div>

            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="text-gray-400 text-sm mb-2">Top Countries</div>
              <div className="space-y-2">
                {topCountries.slice(0, 5).map((country) => (
                  <div key={country} className="flex justify-between items-center">
                    <span className="text-gray-300">{country}</span>
                    <span className="text-cyan-400 font-medium">
                      {chartData[chartData.length - 1]?.[country] || 0} nodes
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {/* Total Nodes Chart */}
        <div ref={totalNodesRef}>
          <h2 
            className="text-2xl font-bold text-cyan-400 mb-4 cursor-pointer hover:text-cyan-300"
            onClick={() => handleSectionClick(SECTIONS['total-nodes'])}
          >
            Total Nodes
          </h2>
          <div className="bg-gray-900/80 backdrop-blur-md rounded-lg p-4 h-[400px] border border-gray-800 shadow-xl">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={totalNodesData}>
                <XAxis 
                  dataKey="time" 
                  stroke="#94a3b8"
                  tickFormatter={formatTime}
                />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    border: '1px solid rgba(75, 85, 99, 0.3)',
                    borderRadius: '0.5rem',
                    color: '#e2e8f0'
                  }}
                  labelFormatter={(time) => new Date(time * 1000).toLocaleString()}
                  formatter={(value) => [value, 'Nodes']}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Total Nodes"
                  stroke="#22d3ee"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Nodes by Country Chart */}
        <div className="bg-gray-900/80 backdrop-blur-md rounded-lg p-4 h-[500px] border border-gray-800 shadow-xl">
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis 
                  dataKey="time" 
                  stroke="#94a3b8"
                  tickFormatter={formatTime}
                />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    border: '1px solid rgba(75, 85, 99, 0.3)',
                    borderRadius: '0.5rem',
                    color: '#e2e8f0'
                  }}
                  labelFormatter={(time) => new Date(time * 1000).toLocaleString()}
                  formatter={(value, name) => [value, name]}
                />
                {topCountries
                  .filter(country => hiddenCountries.size === 0 || !hiddenCountries.has(country))
                  .map((country) => (
                    <Line
                      key={country}
                      type="monotone"
                      dataKey={country}
                      name={country}
                      stroke={stringToColor(country)}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {topCountries.map((country) => (
              <button
                key={country}
                onClick={() => {
                  setHiddenCountries(prev => {
                    const next = new Set(prev)
                    const isOnlyVisible = !next.has(country) && next.size === topCountries.length - 1
                    const isHidden = next.has(country)

                    // If this is the only visible country and we click it, show all
                    if (isOnlyVisible) {
                      next.clear()
                    }
                    // If the country is currently hidden, unhide it
                    else if (isHidden) {
                      next.delete(country)
                    }
                    // If we're showing all countries, hide all except this one
                    else if (next.size === 0) {
                      topCountries.forEach(c => {
                        if (c !== country) next.add(c)
                      })
                    }
                    // Otherwise, toggle this country's visibility
                    else {
                      next.add(country)
                    }
                    
                    return next
                  })
                }}
                className={`px-3 py-1 rounded-full text-sm flex items-center gap-2 transition-colors ${
                  hiddenCountries.has(country)
                    ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    : 'text-gray-200 hover:text-white'
                }`}
                style={{
                  backgroundColor: hiddenCountries.has(country) 
                    ? undefined 
                    : `${stringToColor(country)}33`,
                  borderColor: stringToColor(country),
                  borderWidth: 1
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: stringToColor(country) }}
                />
                {country}
              </button>
            ))}
          </div>
        </div>

        {/* Nodes by User Chart */}
        <div className="bg-gray-900/80 backdrop-blur-md rounded-lg p-4 border border-gray-800 shadow-xl flex flex-col">
          <h2 className="text-2xl font-bold text-cyan-400 mb-4">Nodes per User</h2>
          <div className="h-[400px] mb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userChartData}>
                <XAxis 
                  dataKey="time" 
                  stroke="#94a3b8"
                  tickFormatter={formatTime}
                />
                <YAxis stroke="#94a3b8" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    border: '1px solid rgba(75, 85, 99, 0.3)',
                    borderRadius: '0.5rem',
                    color: '#e2e8f0'
                  }}
                  labelFormatter={(time) => new Date(time * 1000).toLocaleString()}
                  formatter={(value, name) => [value, name]}
                />
                {topUsers
                  .filter(user => hiddenUsers.size === 0 || !hiddenUsers.has(user))
                  .map((user) => (
                    <Line
                      key={user}
                      type="monotone"
                      dataKey={user}
                      name={user}
                      stroke={stringToColor(user)}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: '6rem' }}>
            <div className="flex flex-wrap gap-2 pb-2 pr-2">
              {topUsers.map((user) => (
                <button
                  key={user}
                  onClick={() => {
                    setHiddenUsers(prev => {
                      const next = new Set(prev)
                      const isOnlyVisible = !next.has(user) && next.size === topUsers.length - 1
                      const isHidden = next.has(user)

                      // If this is the only visible user and we click it, show all
                      if (isOnlyVisible) {
                        next.clear()
                      }
                      // If the user is currently hidden, unhide it
                      else if (isHidden) {
                        next.delete(user)
                      }
                      // If we're showing all users, hide all except this one
                      else if (next.size === 0) {
                        topUsers.forEach(u => {
                          if (u !== user) next.add(u)
                        })
                      }
                      // Otherwise, toggle this user's visibility
                      else {
                        next.add(user)
                      }
                      
                      return next
                    })
                  }}
                  className={`px-3 py-1 rounded-full text-sm flex items-center gap-2 transition-colors shrink-0 ${
                    hiddenUsers.has(user)
                      ? 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      : 'text-gray-200 hover:text-white'
                  }`}
                  style={{
                    backgroundColor: hiddenUsers.has(user) 
                      ? undefined 
                      : `${stringToColor(user)}33`,
                    borderColor: stringToColor(user),
                    borderWidth: 1
                  }}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: stringToColor(user) }}
                  />
                  {user}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="text-sm text-gray-400">
        Last updated: {new Date(countriesData[0].time * 1000).toLocaleString()}
      </div>
    </div>
  )
} 