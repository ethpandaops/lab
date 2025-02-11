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
import { AboutThisData } from '../../components/common/AboutThisData'

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

export const CommunityNodes = () => {
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
    <div className="space-y-6" ref={containerRef}>
      <XatuCallToAction />

      {/* Page Header */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-cyber-neon/20 to-transparent" />
        </div>
        <div className="relative flex justify-center">
          <div className="px-4 bg-cyber-darker">
            <h1 className="text-3xl md:text-4xl font-sans font-black bg-gradient-to-r from-cyber-neon via-cyber-blue to-cyber-pink bg-clip-text text-transparent animate-text-shine">
              Community Nodes
            </h1>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <AboutThisData>
          <p>
          This data represents nodes from the Ethereum community that have opted in to share their node information with us. 
          The data helps us understand the geographical distribution of nodes and monitor the health of the network.
          All data is anonymized and no personally identifiable information is collected.
          </p>
        </AboutThisData>

        {/* Total Nodes Chart */}
        <div ref={totalNodesRef} className="backdrop-blur-sm rounded-lg border border-cyber-neon/10 hover:border-cyber-neon/20 p-6">
          <h2 
            className="text-2xl font-sans font-bold text-primary mb-4 cursor-pointer hover:text-cyber-neon transition-colors"
            onClick={() => handleSectionClick(SECTIONS['total-nodes'])}
          >
            Total Nodes
          </h2>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={totalNodesData}>
                <XAxis 
                  dataKey="time" 
                  stroke="currentColor"
                  tickFormatter={formatTime}
                />
                <YAxis stroke="currentColor" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(10, 10, 15, 0.95)',
                    border: '1px solid rgba(0, 255, 159, 0.3)',
                    borderRadius: '0.5rem',
                    color: '#00ff9f'
                  }}
                  labelFormatter={(time) => new Date(time * 1000).toLocaleString()}
                  formatter={(value) => [value, 'Nodes']}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Total Nodes"
                  stroke="#00ffff"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Nodes by Country Chart */}
        <div className="backdrop-blur-sm rounded-lg border border-cyber-neon/10 hover:border-cyber-neon/20 p-6">
          <h2 
            className="text-2xl font-sans font-bold text-primary mb-4 cursor-pointer hover:text-cyber-neon transition-colors"
            onClick={() => handleSectionClick(SECTIONS['nodes-by-country'])}
          >
            Nodes by Country
          </h2>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <XAxis 
                  dataKey="time" 
                  stroke="currentColor"
                  tickFormatter={formatTime}
                />
                <YAxis stroke="currentColor" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(10, 10, 15, 0.95)',
                    border: '1px solid rgba(0, 255, 159, 0.3)',
                    borderRadius: '0.5rem',
                    color: '#00ff9f'
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
          <div className="mt-6 overflow-y-auto max-h-24">
            <div className="flex flex-wrap gap-2 pb-2 pr-2">
              {topCountries.map((country) => (
                <button
                  key={country}
                  onClick={() => {
                    setHiddenCountries(prev => {
                      const next = new Set(prev)
                      const isOnlyVisible = !next.has(country) && next.size === topCountries.length - 1
                      const isHidden = next.has(country)

                      if (isOnlyVisible) {
                        next.clear()
                      }
                      else if (isHidden) {
                        next.delete(country)
                      }
                      else if (next.size === 0) {
                        topCountries.forEach(c => {
                          if (c !== country) next.add(c)
                        })
                      }
                      else {
                        next.add(country)
                      }
                      
                      return next
                    })
                  }}
                  className={`px-3 py-1 rounded-full text-sm font-mono flex items-center gap-2 transition-colors ${
                    hiddenCountries.has(country)
                      ? 'bg-cyber-darker/50 opacity-50 hover:opacity-70'
                      : 'hover:opacity-80'
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
        </div>

        {/* Nodes by User Chart */}
        <div className="backdrop-blur-sm rounded-lg border border-cyber-neon/10 hover:border-cyber-neon/20 p-6">
          <h2 className="text-2xl font-sans font-bold text-primary mb-4">Nodes per User</h2>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={userChartData}>
                <XAxis 
                  dataKey="time" 
                  stroke="currentColor"
                  tickFormatter={formatTime}
                />
                <YAxis stroke="currentColor" />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(10, 10, 15, 0.95)',
                    border: '1px solid rgba(0, 255, 159, 0.3)',
                    borderRadius: '0.5rem',
                    color: '#00ff9f'
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
          <div className="mt-6 overflow-y-auto max-h-24">
            <div className="flex flex-wrap gap-2 pb-2 pr-2">
              {topUsers.map((user) => (
                <button
                  key={user}
                  onClick={() => {
                    setHiddenUsers(prev => {
                      const next = new Set(prev)
                      const isOnlyVisible = !next.has(user) && next.size === topUsers.length - 1
                      const isHidden = next.has(user)

                      if (isOnlyVisible) {
                        next.clear()
                      }
                      else if (isHidden) {
                        next.delete(user)
                      }
                      else if (next.size === 0) {
                        topUsers.forEach(u => {
                          if (u !== user) next.add(u)
                        })
                      }
                      else {
                        next.add(user)
                      }
                      
                      return next
                    })
                  }}
                  className={`px-3 py-1 rounded-full text-sm font-mono flex items-center gap-2 transition-colors ${
                    hiddenUsers.has(user)
                      ? 'bg-cyber-darker/50 opacity-50 hover:opacity-70'
                      : 'hover:opacity-80'
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
    </div>
  )
} 