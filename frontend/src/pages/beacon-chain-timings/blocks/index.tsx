import { useDataFetch } from '../../../utils/data'
import { LoadingState } from '../../../components/common/LoadingState'
import { ErrorState } from '../../../components/common/ErrorState'
import { NetworkSelector } from '../../../components/common/NetworkSelector'
import { AboutThisData } from '../../../components/common/AboutThisData'
import { useState, useEffect, useMemo, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine, ScatterChart, Scatter, ZAxis } from 'recharts'
import { getConfig } from '../../../utils/config'
import type { Config } from '../../../types'
import { useSearchParams } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { PERCENTILE_COLORS, PERCENTILE_LABELS, PERCENTILE_KEYS, type PercentileKey } from '../../../constants/percentiles'
import { ChartWithStats } from '../../../components/charts/ChartWithStats'

interface TimingData {
  timestamps: number[]
  mins: number[]
  maxs: number[]
  p05s: number[]
  p50s: number[]
  p95s: number[]
  blocks: number[]
  updated_at: number
}

interface CDFData {
  sizes_kb: number[]
  arrival_times_ms: {
    all: number[]
    mev: number[]
    non_mev: number[]
    solo_mev: number[]
    solo_non_mev: number[]
  }
  updated_at: number
}

interface TimeWindowConfig {
  file: string
  step: string
  label: string
  range: string
}

const DEFAULT_TIME_WINDOWS: TimeWindowConfig[] = [
  { file: 'last_30_days', step: '1d', label: '30d', range: '-30d' },
  { file: 'last_1_day', step: '15m', label: '1d', range: '-1d' }
]

const TIMESTAMP_MULTIPLIER = 1000
const DECIMAL_PLACES = 3
const ATTESTATION_DEADLINE_COLOR = '#ef4444' // Using a red color

interface LegendItem {
  value: string
  color: string
  dataKey?: string
  type?: string
}

const BLOCK_TYPE_COLORS = {
  'All Blocks': '#00ffff', // cyber-blue
  'MEV Blocks': '#ff2b92', // cyber-pink
  'Non-MEV Blocks': '#00ff9f', // cyber-neon
  'Solo MEV Blocks': '#2563eb', // cyber-purple
  'Solo Non-MEV Blocks': '#ffff00', // cyber-yellow
} as const;

export const BlockTimings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [config, setConfig] = useState<Config | null>(null)
  const [configLoading, setConfigLoading] = useState(true)
  const [configError, setConfigError] = useState<Error | undefined>()
  const [isTimeWindowOpen, setIsTimeWindowOpen] = useState(false)
  const [hiddenArrivalLines, setHiddenArrivalLines] = useState<Set<string>>(new Set())
  const [hiddenSizeLines, setHiddenSizeLines] = useState<Set<string>>(new Set())
  const timeWindowRef = useRef<HTMLDivElement>(null)

  const timeWindows = useMemo<TimeWindowConfig[]>(() => {
    const notebookConfig = config?.notebooks?.['beacon-chain-timings']
    return notebookConfig?.time_windows || DEFAULT_TIME_WINDOWS
  }, [config])

  const defaultTimeWindow = useMemo(() => timeWindows[0]?.file || 'last_30_days', [timeWindows])
  const defaultNetwork = useMemo(() => {
    const notebookConfig = config?.notebooks?.['beacon-chain-timings']
    return notebookConfig?.networks?.[0] || 'mainnet'
  }, [config])

  const [timeWindow, setTimeWindow] = useState<string>(() => 
    searchParams.get('timeWindow') || defaultTimeWindow
  )
  const [network, setNetwork] = useState<string>(() => 
    searchParams.get('network') || defaultNetwork
  )

  useEffect(() => {
    setConfigLoading(true)
    getConfig()
      .then(setConfig)
      .catch(setConfigError)
      .finally(() => setConfigLoading(false))
  }, [])

  // Update URL when network/timeWindow changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams)
    params.set('network', network)
    params.set('timeWindow', timeWindow)
    setSearchParams(params)
  }, [network, timeWindow, setSearchParams, searchParams])

  const { data: timingData, loading, error } = useDataFetch<TimingData>(
    `beacon-chain-timings/block_timings/${network}/${timeWindow}.json`
  )

  const { data: cdfData, loading: cdfLoading, error: cdfError } = useDataFetch<CDFData>(
    `beacon-chain-timings/size_cdf/${network}/${timeWindow}.json`
  )

  const currentWindow = useMemo(() => 
    timeWindows.find((w: TimeWindowConfig) => w.file === timeWindow),
    [timeWindows, timeWindow]
  )

  const formatTime = useMemo(() => (time: number) => {
    const date = new Date(time * TIMESTAMP_MULTIPLIER)
    return currentWindow?.step === '15m'
      ? date.toLocaleTimeString() 
      : date.toLocaleDateString()
  }, [currentWindow])

  const chartData = useMemo(() => {
    if (!timingData?.timestamps) return []

    return timingData.timestamps.map((time, index) => ({
      time: time,
      min: timingData.mins[index] / 1000, // Convert to seconds
      p05: timingData.p05s[index] / 1000,
      p50: timingData.p50s[index] / 1000,
      p95: timingData.p95s[index] / 1000,
      blocks: timingData.blocks[index]
    }))
  }, [timingData])

  const xAxisTicks = useMemo(() => {
    if (!timingData?.timestamps.length) return []
    const timestamps = timingData.timestamps
    const count = 6 // Show 6 ticks
    const step = Math.floor(timestamps.length / (count - 1))
    return Array.from({ length: count }, (_, i) => 
      i === count - 1 ? timestamps[timestamps.length - 1] : timestamps[i * step]
    )
  }, [timingData])

  const scatterData = useMemo(() => {
    if (!cdfData?.arrival_times_ms || !cdfData?.sizes_kb) return []

    // Create separate datasets for each type
    const allData = cdfData.arrival_times_ms.all.map((time, index) => ({
      arrival_time: time / 1000,
      size: cdfData.sizes_kb[index],
      type: 'all'
    })).filter(d => d.size <= 1536)

    const mevData = cdfData.arrival_times_ms.mev.map((time, index) => ({
      arrival_time: time / 1000,
      size: cdfData.sizes_kb[index],
      type: 'mev'
    })).filter(d => d.size <= 1536)

    const nonMevData = cdfData.arrival_times_ms.non_mev.map((time, index) => ({
      arrival_time: time / 1000,
      size: cdfData.sizes_kb[index],
      type: 'non_mev'
    })).filter(d => d.size <= 1536)

    const soloMevData = cdfData.arrival_times_ms.solo_mev.map((time, index) => ({
      arrival_time: time / 1000,
      size: cdfData.sizes_kb[index],
      type: 'solo_mev'
    })).filter(d => d.size <= 1536)

    const soloNonMevData = cdfData.arrival_times_ms.solo_non_mev.map((time, index) => ({
      arrival_time: time / 1000,
      size: cdfData.sizes_kb[index],
      type: 'solo_non_mev'
    })).filter(d => d.size <= 1536)

    return [...allData, ...mevData, ...nonMevData, ...soloMevData, ...soloNonMevData].sort((a, b) => a.size - b.size)
  }, [cdfData])

  const handleLegendClick = (event: React.MouseEvent<HTMLButtonElement>, item: LegendItem) => {
    const setHiddenLines = item.type === 'arrival' ? setHiddenArrivalLines : setHiddenSizeLines
    const hiddenLines = item.type === 'arrival' ? hiddenArrivalLines : hiddenSizeLines
    const availableLines = getAvailableLines(item.type)

    setHiddenLines(prev => {
      const next = new Set(prev)
      
      if (event.shiftKey) {
        // Shift+click: Toggle this item while keeping others unchanged
        if (next.has(item.value)) {
          next.delete(item.value)
        } else {
          next.add(item.value)
        }
      } else {
        // Regular click: Toggle between showing only this item and showing all
        const isOnlyItemVisible = availableLines.every(line => 
          line === item.value ? !next.has(line) : next.has(line)
        )
        
        if (isOnlyItemVisible) {
          // If this is the only visible item, show all items
          next.clear()
        } else {
          // Hide all except this one
          next.clear()
          availableLines.forEach(line => {
            if (line !== item.value) next.add(line)
          })
        }
      }
      
      return next
    })
  }

  const getAvailableLines = (type?: string) => {
    if (type === 'arrival') {
      return Object.keys(dataKeyMap) as PercentileKey[]
    }
    return ['All Blocks', 'MEV Blocks', 'Non-MEV Blocks', 'Solo MEV Blocks', 'Solo Non-MEV Blocks']
  }

  const renderLegend = (props: any, type: string) => {
    const hiddenLines = type === 'arrival' ? hiddenArrivalLines : hiddenSizeLines
    const availableLines = getAvailableLines(type)

    return (
      <div className="absolute top-0 right-0 w-48 p-4 space-y-2">
        {availableLines.map((line) => {
          const color = getLineColor(line)
          const isHidden = hiddenLines.has(line)
          const isOnlyVisible = !isHidden && hiddenLines.size === availableLines.length - 1
          const label = type === 'arrival' ? PERCENTILE_LABELS[line as PercentileKey] : line

          return (
            <button
              key={line}
              onClick={(event) => handleLegendClick(event, { value: line, color, type })}
              className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs transition-all hover:bg-cyber-neon/5 ${
                isHidden ? 'opacity-50 hover:opacity-70' : isOnlyVisible ? 'ring-1 ring-cyber-neon' : ''
              }`}
            >
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
              <span className="flex-1 text-left truncate">{label}</span>
            </button>
          )
        })}
      </div>
    )
  }

  const getLineColor = (line: string) => {
    // For percentile lines
    if (line in PERCENTILE_LABELS) {
      const key = Object.entries(PERCENTILE_LABELS).find(([_, label]) => label === line)?.[0] as PercentileKey;
      return key ? PERCENTILE_COLORS[key] : '#00ff9f';
    }
    // For block type lines
    return BLOCK_TYPE_COLORS[line as keyof typeof BLOCK_TYPE_COLORS] || '#00ff9f';
  }

  const dataKeyMap: Record<string, string> = {
    [PERCENTILE_KEYS.p95]: 'p95',
    [PERCENTILE_KEYS.p50]: 'p50',
    [PERCENTILE_KEYS.p05]: 'p05',
    [PERCENTILE_KEYS.min]: 'min'
  }

  const lineNames = Object.keys(dataKeyMap) as PercentileKey[]

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (timeWindowRef.current && !timeWindowRef.current.contains(event.target as Node)) {
        setIsTimeWindowOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (configLoading || loading) {
    return <LoadingState message="Loading data..." />
  }

  if (configError) {
    return <ErrorState message="Failed to load configuration" error={configError} />
  }

  if (error) {
    return <ErrorState message="Failed to load data" error={error} />
  }

  if (!timingData) {
    return <ErrorState message="No data available" />
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="relative mb-12">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-cyber-neon/20 to-transparent" />
        </div>
        <div className="relative flex justify-center">
          <div className="px-4 bg-cyber-darker">
            <h1 className="text-3xl md:text-4xl font-sans font-black bg-gradient-to-r from-cyber-neon via-cyber-blue to-cyber-pink bg-clip-text text-transparent animate-text-shine">
              Block Timings
            </h1>
          </div>
        </div>
      </div>

      <AboutThisData>
        <p>
          This data shows timing data for blocks on the beacon chain. The data is updated hourly and aggregated in {timeWindows.map((w, i) => (
            <span key={w.file}>
              {w.step} intervals for the {w.label} view{i < timeWindows.length - 1 ? ', and ' : ''}
            </span>
          ))}.
        </p>
      </AboutThisData>

      {/* Controls Section */}
      <div className="backdrop-blur-md rounded-lg border border-cyber-neon/20 p-6 bg-cyber-dark/80">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <NetworkSelector
            selectedNetwork={network}
            onNetworkChange={setNetwork}
            className="w-full md:w-auto"
          />
          <div className="relative w-full md:w-auto" ref={timeWindowRef}>
            <button
              type="button"
              onClick={() => setIsTimeWindowOpen(!isTimeWindowOpen)}
              className="w-full flex items-center justify-between gap-2 px-4 py-2 rounded-lg bg-cyber-darker border border-cyber-neon/20 hover:border-cyber-neon/30 hover:bg-cyber-neon/5 transition-all duration-300"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-mono">{currentWindow?.label || 'Select Time'}</span>
              </div>
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
              <div className="absolute z-[9999] mt-2 w-full rounded-lg bg-cyber-darker border border-cyber-neon/20">
                <div className="py-1">
                  {timeWindows.map((window) => (
                    <button
                      key={window.file}
                      onClick={() => {
                        setTimeWindow(window.file)
                        setIsTimeWindowOpen(false)
                      }}
                      className="w-full px-4 py-2 text-left font-mono text-cyber-neon hover:text-cyber-neon hover:bg-cyber-neon/5 active:bg-cyber-neon/10 transition-colors"
                    >
                      {window.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart Separator */}
      <div className="relative my-12">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-cyber-neon/20 to-transparent" />
        </div>
      </div>

      {/* Charts Section */}
      <section className="space-y-12">
        {/* Block Arrival Times */}
        <ChartWithStats
          title="Block Arrival Time Distribution"
          description="This chart tracks block arrival times across the network, showing how quickly blocks propagate to nodes. The data is collected by nodes run by the ethPandaOps team and contributed by the community, showing aggregated results."
          chart={
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={chartData}
                margin={{ 
                  top: 20, 
                  right: 10, 
                  left: 25,
                  bottom: 40 
                }}
              >
                <XAxis 
                  dataKey="time" 
                  stroke="currentColor"
                  tickFormatter={formatTime}
                  ticks={xAxisTicks}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval="preserveStartEnd"
                  tick={{ fontSize: 10 }}
                  label={{ 
                    value: "Time",
                    position: "insideBottom",
                    offset: -10,
                    style: { fill: "currentColor", fontSize: 12 }
                  }}
                />
                <YAxis 
                  stroke="currentColor"
                  label={{ 
                    value: 'Slot time (s)', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fill: 'currentColor', fontSize: 12 },
                    offset: -10
                  }}
                  domain={[0, 6]}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => value.toFixed(1)}
                  width={35}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(10, 10, 15, 0.95)',
                    border: '1px solid rgba(0, 255, 159, 0.3)',
                    borderRadius: '0.5rem',
                    color: '#00ff9f',
                    fontSize: '12px'
                  }}
                  labelFormatter={(time) => new Date(time * TIMESTAMP_MULTIPLIER).toLocaleString()}
                  formatter={(value: number, name: string) => [
                    `${value.toFixed(DECIMAL_PLACES)}s`,
                    PERCENTILE_LABELS[name as PercentileKey] || name
                  ]}
                />
                <ReferenceLine 
                  y={4} 
                  stroke={ATTESTATION_DEADLINE_COLOR}
                  strokeWidth={2}
                  strokeDasharray="5 2"
                />
                {lineNames.map((name) => (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={dataKeyMap[name]}
                    name={PERCENTILE_LABELS[name]}
                    stroke={PERCENTILE_COLORS[name]}
                    strokeWidth={2}
                    dot={false}
                    opacity={hiddenArrivalLines.has(name) ? 0.2 : 1}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          }
          series={getAvailableLines('arrival').map((line) => {
            const isHidden = hiddenArrivalLines.has(line)
            const isOnlyVisible = !isHidden && hiddenArrivalLines.size === getAvailableLines('arrival').length - 1
            const color = PERCENTILE_COLORS[line as PercentileKey]
            const values = chartData.map(d => d[dataKeyMap[line as PercentileKey] as keyof typeof d]).filter(Boolean)
            const latestValue = values[values.length - 1] || 0
            const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
            const min = values.length ? Math.min(...values) : 0
            const max = values.length ? Math.max(...values) : 0

            return {
              name: PERCENTILE_LABELS[line as PercentileKey],
              color,
              min,
              avg,
              max,
              last: latestValue,
              isHidden,
              isHighlighted: isOnlyVisible,
              unit: 's',
              onClick: (e) => handleLegendClick(e, { value: line, color, type: 'arrival' })
            }
          })}
        />

        {/* Block Size vs Arrival Time */}
        <ChartWithStats
          title="Block Size vs Arrival Time"
          description="This chart analyzes the relationship between block size and network propagation time, helping identify how block size impacts network performance. The data is collected by nodes run by the ethPandaOps team and contributed by the community, showing aggregated results."
          chart={
            <ResponsiveContainer width="100%" height="100%">
              <LineChart margin={{ 
                top: 20, 
                right: 10, 
                left: 25,
                bottom: 40 
              }}>
                <XAxis 
                  dataKey="size" 
                  stroke="currentColor"
                  label={{ 
                    value: 'Block+Blob Size (KB)',
                    position: 'insideBottom',
                    offset: -10,
                    style: { fill: 'currentColor', fontSize: 12 }
                  }}
                  type="number"
                  domain={[0, 1536]}
                  tickFormatter={(value) => value.toFixed(0)}
                  tick={{ fontSize: 10 }}
                  width={35}
                />
                <YAxis 
                  dataKey="arrival_time"
                  stroke="currentColor"
                  label={{ 
                    value: 'Time (s)',
                    angle: -90, 
                    position: 'insideLeft',
                    style: { fill: 'currentColor', fontSize: 12 },
                    offset: -10
                  }}
                  domain={[0, 6]}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => Math.round(value).toString()}
                  width={35}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(10, 10, 15, 0.95)',
                    border: '1px solid rgba(0, 255, 159, 0.3)',
                    borderRadius: '0.5rem',
                    color: '#00ff9f',
                    fontSize: '12px'
                  }}
                  labelFormatter={(value) => `Block+Blob Size: ${value.toFixed(1)} KB`}
                  formatter={(value: number, name: string) => {
                    const blockType = name.replace('arrival_time', '').trim();
                    const label = blockType || 'Arrival Time';
                    return [`${value.toFixed(DECIMAL_PLACES)}s`, label];
                  }}
                  separator=": "
                />
                <ReferenceLine
                  y={4}
                  stroke={ATTESTATION_DEADLINE_COLOR}
                  strokeWidth={2}
                  strokeDasharray="5 2"
                  segment={[{ x: 0, y: 4 }, { x: '15%', y: 4 }, { x: '40%', y: 4 }, { x: '100%', y: 4 }]}
                />

                {/* Legend Box */}
                <g className="recharts-legend" transform="translate(500, 10)">
                  <g className="recharts-legend-item">
                    <rect
                      x="0"
                      y="0"
                      width="180"
                      height="24"
                      fill="rgba(10, 10, 15, 0.95)"
                      stroke="rgba(0, 255, 159, 0.3)"
                      strokeWidth="1"
                      rx="4"
                    />
                    <line 
                      x1="8" 
                      y1="12" 
                      x2="28" 
                      y2="12" 
                      stroke={ATTESTATION_DEADLINE_COLOR} 
                      strokeWidth={2} 
                      strokeDasharray="5 2" 
                    />
                    <text x="36" y="16" fill="currentColor" style={{ fontSize: '12px' }}>
                      Attestation Deadline
                    </text>
                  </g>
                </g>

                {getAvailableLines('size').map((name) => {
                  const typeMap: Record<string, string> = {
                    'All Blocks': 'all',
                    'MEV Blocks': 'mev',
                    'Non-MEV Blocks': 'non_mev',
                    'Solo MEV Blocks': 'solo_mev',
                    'Solo Non-MEV Blocks': 'solo_non_mev'
                  }
                  return (
                    <Line
                      key={name}
                      type="monotone"
                      data={scatterData.filter(d => d.type === typeMap[name])}
                      dataKey="arrival_time"
                      name={name}
                      stroke={BLOCK_TYPE_COLORS[name as keyof typeof BLOCK_TYPE_COLORS]}
                      strokeWidth={2}
                      dot={false}
                      opacity={hiddenSizeLines.has(name) ? 0.2 : 1}
                    />
                  )
                })}
              </LineChart>
            </ResponsiveContainer>
          }
          notes={
            <>
              <h3 className="text-xl font-sans font-bold text-cyber-neon mb-4">Notes</h3>
              <ul className="list-disc list-inside space-y-2">
                <li><span className="text-cyber-blue">All Blocks</span>: Shows the average arrival time for all blocks, regardless of their source.</li>
                <li><span className="text-cyber-pink">MEV Blocks</span>: Blocks that were built by MEV-Boost relays, which may have different arrival characteristics due to their specialized construction.</li>
                <li><span className="text-cyber-neon">Non-MEV Blocks</span>: Regular blocks built by validators without using MEV-Boost relays.</li>
                <li><span className="text-cyber-purple">Solo MEV</span>: Blocks built by solo stakers using MEV-Boost relays.</li>
                <li><span className="text-cyber-yellow">Solo Non-MEV</span>: Blocks built by solo stakers without using MEV-Boost relays.</li>
              </ul>
            </>
          }
          series={getAvailableLines('size').map((name) => {
            const typeMap: Record<string, string> = {
              'All Blocks': 'all',
              'MEV Blocks': 'mev',
              'Non-MEV Blocks': 'non_mev',
              'Solo MEV Blocks': 'solo_mev',
              'Solo Non-MEV Blocks': 'solo_non_mev'
            }
            const type = typeMap[name]
            const data = scatterData.filter(d => d.type === type).map(d => d.arrival_time)
            const isHidden = hiddenSizeLines.has(name)
            const isOnlyVisible = !isHidden && hiddenSizeLines.size === getAvailableLines('size').length - 1
            const color = BLOCK_TYPE_COLORS[name as keyof typeof BLOCK_TYPE_COLORS]
            const latestValue = data[data.length - 1] || 0
            const avg = data.length ? data.reduce((a, b) => a + b, 0) / data.length : 0
            const min = data.length ? Math.min(...data) : 0
            const max = data.length ? Math.max(...data) : 0

            return {
              name,
              color,
              min,
              avg,
              max,
              last: latestValue,
              isHidden,
              isHighlighted: isOnlyVisible,
              unit: 's',
              onClick: (e) => handleLegendClick(e, { value: name, color, type: 'size' })
            }
          })}
        />
      </section>
    </div>
  )
} 