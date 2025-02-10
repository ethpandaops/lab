import { useDataFetch } from '../../../utils/data'
import { LoadingState } from '../../../components/common/LoadingState'
import { ErrorState } from '../../../components/common/ErrorState'
import { NetworkSelector } from '../../../components/common/NetworkSelector'
import { useState, useEffect, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine, ScatterChart, Scatter, ZAxis } from 'recharts'
import { getConfig } from '../../../utils/config'
import type { Config } from '../../../types'
import { useSearchParams } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'

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

export const BlockTimings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [config, setConfig] = useState<Config | undefined>()
  const [configLoading, setConfigLoading] = useState(true)
  const [configError, setConfigError] = useState<Error | undefined>()
  const [isTimeWindowOpen, setIsTimeWindowOpen] = useState(false)
  const [hiddenLines, setHiddenLines] = useState<Set<string>>(new Set())

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
    <>
      <div className="backdrop-blur-md rounded-lg p-3 shadow-xl">
        <h2 className="text-lg md:text-xl font-semibold text-accent mb-1">About This Data</h2>
        <p className="text-sm md:text-base text-primary">
          This data shows timing data for blocks on the beacon chain. The data is updated hourly and aggregated in {timeWindows.map((w, i) => (
            <span key={w.file}>
              {w.step} intervals for the {w.label} view{i < timeWindows.length - 1 ? ', and ' : ''}
            </span>
          ))}.
        </p>
      </div>

      <div className="backdrop-blur-md rounded-lg p-3 shadow-xl space-y-4 mt-4">
        <div className="flex flex-col md:flex-row justify-between gap-3 mb-4">
          <NetworkSelector
            selectedNetwork={network}
            onNetworkChange={setNetwork}
            className="w-full md:w-auto"
          />
          <div className="w-full md:w-auto">
            <button
              type="button"
              onClick={() => setIsTimeWindowOpen(!isTimeWindowOpen)}
              className="w-full flex items-center justify-between gap-2 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{currentWindow?.label || 'Select Time'}</span>
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

            <div className={`${isTimeWindowOpen ? 'block' : 'hidden'} mt-2 w-full rounded-lg border`}>
              {timeWindows.map((window) => (
                <button
                  key={window.file}
                  type="button"
                  onClick={() => {
                    setTimeWindow(window.file)
                    setIsTimeWindowOpen(false)
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-2 border first:rounded-t-lg last:rounded-b-lg ${
                    window.file === timeWindow ? 'bg-gray-700' : ''
                  }`}
                >
                  <span>{window.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Block Arrival Timing Chart */}
        <div>
          <div className="mb-2">
            <h2 className="text-xl md:text-2xl font-bold text-accent">Block Arrival Time</h2>
            <div className="text-sm text-secondary mt-0.5">
              {/* Last updated: {timingData?.updated_at ? formatDistanceToNow(new Date(timingData.updated_at * TIMESTAMP_MULTIPLIER), { addSuffix: true }) : 'No data available'} */}
            </div>
          </div>
          <div className="flex-grow h-[250px] sm:h-[350px] md:h-[450px] pb-2">
            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
              <LineChart 
                data={chartData}
                margin={{ top: 20, right: 10, left: 10, bottom: 30 }}
              >
                <XAxis 
                  dataKey="time" 
                  stroke="#94a3b8"
                  tickFormatter={formatTime}
                  ticks={xAxisTicks}
                  angle={-45}
                  textAnchor="end"
                  height={40}
                  interval="preserveStartEnd"
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  stroke="#94a3b8" 
                  label={{ 
                    value: 'Slot time (s)', 
                    angle: -90, 
                    position: 'insideLeft',
                    offset: 10,
                    style: { fill: '#94a3b8', fontSize: 10 }
                  }}
                  domain={[0, 6]}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    border: '1px solid rgba(75, 85, 99, 0.3)',
                    borderRadius: '0.5rem',
                    color: '#e2e8f0',
                  }}
                  labelFormatter={(time) => new Date(time * TIMESTAMP_MULTIPLIER).toLocaleString()}
                  formatter={(value: number) => [`${value.toFixed(DECIMAL_PLACES)}s`, '']}
                />
                <Legend 
                  verticalAlign="bottom"
                  height={36}
                  content={({ payload }) => (
                    <div className="mt-4 overflow-y-auto max-h-24">
                      <div className="flex flex-wrap gap-2 justify-start items-center text-xs pb-1">
                        {/* Attestation Deadline */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div className="w-3 h-0.5 bg-orange-500" />
                          <span className="text-orange-500 font-semibold">Attestation Deadline (4s)</span>
                        </div>
                        {/* Regular legend items */}
                        {payload?.map((entry) => (
                          <button
                            key={entry.value}
                            type="button"
                            onClick={() => {
                              setHiddenLines(prev => {
                                const next = new Set(prev)
                                const allLines = ['95th Percentile', 'Median', '5th Percentile', 'Minimum']
                                const isOnlyVisible = !next.has(entry.value) && next.size === allLines.length - 1
                                const isHidden = next.has(entry.value)

                                // If this is the only visible line and we click it, show all
                                if (isOnlyVisible) {
                                  next.clear()
                                }
                                // If the line is currently hidden, unhide it
                                else if (isHidden) {
                                  next.delete(entry.value)
                                }
                                // If we're showing all lines, hide all except this one
                                else if (next.size === 0) {
                                  allLines.forEach(line => {
                                    if (line !== entry.value) next.add(line)
                                  })
                                }
                                // Otherwise, toggle this line's visibility
                                else {
                                  next.add(entry.value)
                                }
                                
                                return next
                              })
                            }}
                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs transition-colors ${
                              hiddenLines.has(entry.value)
                            }`}
                            style={{
                              backgroundColor: hiddenLines.has(entry.value) 
                                ? undefined 
                                : `${entry.color}33`,
                              borderColor: entry.color,
                              borderWidth: 1
                            }}
                          >
                            <div className="w-4 h-0.5" style={{ background: entry.color }} />
                            <span>{entry.value}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                />
                {/* Attestation Deadline Reference Line */}
                <ReferenceLine 
                  y={4} 
                  stroke="#f97316" 
                  strokeWidth={2}
                  strokeDasharray="5 2"
                />
                {!hiddenLines.has('95th Percentile') && (
                  <Line
                    type="monotone"
                    dataKey="p95"
                    name="95th Percentile"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                  />
                )}
                {!hiddenLines.has('Median') && (
                  <Line
                    type="monotone"
                    dataKey="p50"
                    name="Median"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    dot={false}
                  />
                )}
                {!hiddenLines.has('5th Percentile') && (
                  <Line
                    type="monotone"
                    dataKey="p05"
                    name="5th Percentile"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                  />
                )}
                {!hiddenLines.has('Minimum') && (
                  <Line
                    type="monotone"
                    dataKey="min"
                    name="Minimum"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Block Size vs Arrival Time */}
        <div>
          <div className="mb-2">
            <h2 className="text-xl md:text-2xl font-bold text-accent">Block Size vs Arrival Time</h2>
            <div className="text-sm text-secondary mt-0.5">
              {/* Last updated: {cdfData?.updated_at ? formatDistanceToNow(new Date(cdfData.updated_at * TIMESTAMP_MULTIPLIER), { addSuffix: true }) : 'No data available'} */}
            </div>
          </div>
          <div className="flex-grow h-[250px] sm:h-[350px] md:h-[450px] pb-2">
            <ResponsiveContainer width="100%" height="100%" minWidth={200} minHeight={200}>
              <LineChart
                margin={{ top: 20, right: 10, left: 10, bottom: 50 }}
              >
                <XAxis 
                  dataKey="size" 
                  stroke="#94a3b8"
                  label={{ 
                    value: 'Combined Block+Blob Size (KB)', 
                    position: 'insideBottom',
                    offset: -20,
                    style: { fill: '#94a3b8', fontSize: 10 }
                  }}
                  type="number"
                  domain={[0, 1536]}
                  tickFormatter={(value) => value.toFixed(0)}
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  dataKey="arrival_time"
                  stroke="#94a3b8" 
                  label={{ 
                    value: 'Arrival Time (s)', 
                    angle: -90, 
                    position: 'insideLeft',
                    offset: 10,
                    style: { fill: '#94a3b8', fontSize: 10 }
                  }}
                  domain={[0, 6]}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    border: '1px solid rgba(75, 85, 99, 0.3)',
                    borderRadius: '0.5rem',
                    color: '#e2e8f0',
                  }}
                  labelStyle={{
                    color: '#e2e8f0'
                  }}
                  itemStyle={{
                    color: '#e2e8f0'
                  }}
                  formatter={(value: number, key: string) => [
                    key === 'arrival_time' ? `${value.toFixed(DECIMAL_PLACES)}s` : `${value.toFixed(1)} KB (Block+Blob)`,
                    key === 'arrival_time' ? 'Arrival Time' : 'Combined Size'
                  ]}
                />
                {/* Attestation Deadline Reference Line */}
                <ReferenceLine 
                  y={4} 
                  stroke="#f97316" 
                  strokeWidth={2}
                  strokeDasharray="5 2"
                />
                {!hiddenLines.has('all') && (
                  <Line
                    type="monotone"
                    data={scatterData.filter(d => d.type === 'all')}
                    dataKey="arrival_time"
                    name="All Blocks"
                    stroke="#22d3ee"
                    strokeWidth={2}
                    dot={false}
                  />
                )}
                {!hiddenLines.has('mev') && (
                  <Line
                    type="monotone"
                    data={scatterData.filter(d => d.type === 'mev')}
                    dataKey="arrival_time"
                    name="MEV Blocks"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={false}
                  />
                )}
                {!hiddenLines.has('non_mev') && (
                  <Line
                    type="monotone"
                    data={scatterData.filter(d => d.type === 'non_mev')}
                    dataKey="arrival_time"
                    name="Non-MEV Blocks"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                  />
                )}
                {!hiddenLines.has('solo_mev') && (
                  <Line
                    type="monotone"
                    data={scatterData.filter(d => d.type === 'solo_mev')}
                    dataKey="arrival_time"
                    name="Solo MEV Blocks"
                    stroke="#f472b6"
                    strokeWidth={2}
                    dot={false}
                  />
                )}
                {!hiddenLines.has('solo_non_mev') && (
                  <Line
                    type="monotone"
                    data={scatterData.filter(d => d.type === 'solo_non_mev')}
                    dataKey="arrival_time"
                    name="Solo Non-MEV Blocks"
                    stroke="#fbbf24"
                    strokeWidth={2}
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-primary flex-shrink-0">
            <h3 className="text-lg font-semibold text-accent mb-2">Notes</h3>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li><span className="text-accent">All Blocks</span>: Shows the average arrival time for all blocks, regardless of their source.</li>
              <li><span className="text-red-400">MEV Blocks</span>: Blocks that were built by MEV-Boost relays, which may have different arrival characteristics due to their specialized construction.</li>
              <li><span className="text-green-400">Non-MEV Blocks</span>: Regular blocks built by validators without using MEV-Boost relays.</li>
              <li><span className="text-pink-400">Solo MEV</span>: Blocks built by solo stakers using MEV-Boost relays.</li>
              <li><span className="text-amber-400">Solo Non-MEV</span>: Blocks built by solo stakers without using MEV-Boost relays.</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  )
} 