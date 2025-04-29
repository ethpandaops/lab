import { useDataFetch } from '../../../../utils/data'
import { LoadingState } from '../../../../components/common/LoadingState'
import { ErrorState } from '../../../../components/common/ErrorState'
import { AboutThisData } from '../../../../components/common/AboutThisData'
import { useState, useEffect, useMemo, useRef } from 'react'
import { PERCENTILE_COLORS, PERCENTILE_LABELS, PERCENTILE_KEYS, type PercentileKey } from '../../../../constants/percentiles'
import { NivoLineChart } from '../../../../components/charts'
import { useSearchParams } from 'react-router-dom'
import { getConfig } from '../../../../config'
import type { Config } from '../../../../types'

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
    all: { values: number[] }
    mev: { values: number[] }
    non_mev: { values: number[] }
    solo_mev: { values: number[] }
    solo_non_mev: { values: number[] }
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

// Add this new constant for block type descriptions
const BLOCK_TYPE_DESCRIPTIONS = {
  'All Blocks': 'Shows the average arrival time for all blocks, regardless of their source.',
  'MEV Blocks': 'Blocks that were built by MEV-Boost relays, which may have different arrival characteristics due to their specialized construction.',
  'Non-MEV Blocks': 'Regular blocks built by validators without using MEV-Boost relays.',
  'Solo MEV Blocks': 'Blocks built by solo stakers using MEV-Boost relays.',
  'Solo Non-MEV Blocks': 'Blocks built by solo stakers without using MEV-Boost relays.'
};

export const BlockTimings: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [config, setConfig] = useState<Config | null>(null)
  const [configLoading, setConfigLoading] = useState(true)
  const [configError, setConfigError] = useState<Error | undefined>()
  const [isTimeWindowOpen, setIsTimeWindowOpen] = useState(false)
  const [hiddenArrivalLines, setHiddenArrivalLines] = useState<Set<string>>(new Set())
  const [hiddenSizeLines, setHiddenSizeLines] = useState<Set<string>>(new Set())
  const timeWindowRef = useRef<HTMLDivElement>(null)
  const [currentWindow, setCurrentWindow] = useState<TimeWindowConfig | null>(null)

  const timeWindows = useMemo<TimeWindowConfig[]>(() => {
    const moduleConfig = config?.modules?.['beacon_chain_timings']
    return moduleConfig?.time_windows || DEFAULT_TIME_WINDOWS
  }, [config])

  const defaultTimeWindow = useMemo(() => timeWindows[0]?.file || 'last_30_days', [timeWindows])
  const defaultNetwork = useMemo(() => {
    const moduleConfig = config?.modules?.['beacon_chain_timings']
    return moduleConfig?.networks && Array.isArray(moduleConfig.networks) && moduleConfig.networks.length > 0
      ? moduleConfig.networks[0]
      : 'mainnet'
  }, [config])

  const [timeWindow, setTimeWindow] = useState<string>(() => 
    searchParams.get('timeWindow') || defaultTimeWindow
  )
  const [network] = useState<string>(() => 
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

  // Set current window when time windows are loaded
  useEffect(() => {
    const window = timeWindows.find(w => w.file === timeWindow)
    if (window) {
      setCurrentWindow(window)
    } else if (timeWindows.length > 0) {
      setCurrentWindow(timeWindows[0])
      setTimeWindow(timeWindows[0].file)
    }
  }, [timeWindows, timeWindow])

  // Skip data fetching if config isn't loaded
  const timingsPath = config?.modules?.['beacon_chain_timings']?.path_prefix 
    ? `${config.modules['beacon_chain_timings'].path_prefix}/block_timings/${network}/${timeWindow}`
    : null;

  const cdfPath = config?.modules?.['beacon_chain_timings']?.path_prefix
    ? `${config.modules['beacon_chain_timings'].path_prefix}/size_cdf/${network}/${timeWindow}`
    : null;

  const { data: timingData, loading, error } = useDataFetch<TimingData>(
    timingsPath
  )

  const { data: cdfData } = useDataFetch<CDFData>(
    cdfPath
  )

  const formatTime = useMemo(() => (time: number) => {
    const date = new Date(time * TIMESTAMP_MULTIPLIER)
    return currentWindow?.step === '15m'
      ? date.toLocaleTimeString() 
      : date.toLocaleDateString()
  }, [currentWindow])

  const chartData = useMemo(() => {
    if (!timingData?.timestamps || !Array.isArray(timingData.timestamps)) return []

    return timingData.timestamps.map((time, index) => ({
      time: time,
      min: (timingData.mins && timingData.mins[index]) ? timingData.mins[index] / 1000 : 0, // Convert to seconds
      p05: (timingData.p05s && timingData.p05s[index]) ? timingData.p05s[index] / 1000 : 0,
      p50: (timingData.p50s && timingData.p50s[index]) ? timingData.p50s[index] / 1000 : 0,
      p95: (timingData.p95s && timingData.p95s[index]) ? timingData.p95s[index] / 1000 : 0,
      blocks: (timingData.blocks && timingData.blocks[index]) ? timingData.blocks[index] : 0
    }))
  }, [timingData])

  const scatterData = useMemo(() => {
    if (!cdfData?.arrival_times_ms || !cdfData?.sizes_kb) return []

    // Add optional chaining and default empty arrays for all values
    // Create separate datasets for each type
    const allData = ((cdfData.arrival_times_ms.all?.values) || []).map((time: number, index: number) => ({
      arrival_time: time / 1000,
      size: cdfData.sizes_kb[index],
      type: 'all'
    })).filter((d: { size: number }) => d.size <= 1536)

    const mevData = ((cdfData.arrival_times_ms.mev?.values) || []).map((time: number, index: number) => ({
      arrival_time: time / 1000,
      size: cdfData.sizes_kb[index],
      type: 'mev'
    })).filter((d: { size: number }) => d.size <= 1536)

    const nonMevData = ((cdfData.arrival_times_ms.non_mev?.values) || []).map((time: number, index: number) => ({
      arrival_time: time / 1000,
      size: cdfData.sizes_kb[index],
      type: 'non_mev'
    })).filter((d: { size: number }) => d.size <= 1536)

    const soloMevData = ((cdfData.arrival_times_ms.solo_mev?.values) || []).map((time: number, index: number) => ({
      arrival_time: time / 1000,
      size: cdfData.sizes_kb[index],
      type: 'solo_mev'
    })).filter((d: { size: number }) => d.size <= 1536)

    const soloNonMevData = ((cdfData.arrival_times_ms.solo_non_mev?.values) || []).map((time: number, index: number) => ({
      arrival_time: time / 1000,
      size: cdfData.sizes_kb[index],
      type: 'solo_non_mev'
    })).filter((d: { size: number }) => d.size <= 1536)

    return [...allData, ...mevData, ...nonMevData, ...soloMevData, ...soloNonMevData].sort((a, b) => a.size - b.size)
  }, [cdfData])

  const handleLegendClick = (event: React.MouseEvent<HTMLButtonElement>, item: LegendItem) => {
    const setHiddenLines = item.type === 'arrival' ? setHiddenArrivalLines : setHiddenSizeLines
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

  // Transform chart data for Nivo format
  const nivoChartData = useMemo(() => {
    if (!chartData.length) return []

    // Create a data series for each percentile
    return lineNames.map(name => {
      const dataKey = dataKeyMap[name]
      return {
        id: PERCENTILE_LABELS[name],
        data: chartData.map(d => ({
          x: d.time,
          y: d[dataKey as keyof typeof d] as number
        })),
        color: PERCENTILE_COLORS[name]
      }
    }).filter(series => {
      const key = Object.entries(PERCENTILE_LABELS).find(([, label]) => label === series.id)?.[0] as PercentileKey;
      return key ? !hiddenArrivalLines.has(key) : true;
    })
  }, [chartData, lineNames, dataKeyMap, hiddenArrivalLines])

  // Transform scatter data for Nivo format
  const nivoScatterData = useMemo(() => {
    if (!scatterData.length) return []

    // Group by block type
    const blockTypes = ['All Blocks', 'MEV Blocks', 'Non-MEV Blocks', 'Solo MEV Blocks', 'Solo Non-MEV Blocks']
    const typeMap: Record<string, string> = {
      'All Blocks': 'all',
      'MEV Blocks': 'mev',
      'Non-MEV Blocks': 'non_mev',
      'Solo MEV Blocks': 'solo_mev',
      'Solo Non-MEV Blocks': 'solo_non_mev'
    }

    return blockTypes
      .filter(type => !hiddenSizeLines.has(type))
      .map(type => {
        const typeKey = typeMap[type]
        return {
          id: type,
          data: scatterData
            .filter(d => d.type === typeKey)
            .map(d => ({
              x: d.size,
              y: d.arrival_time
            })),
          color: BLOCK_TYPE_COLORS[type as keyof typeof BLOCK_TYPE_COLORS]
        }
      })
  }, [scatterData, hiddenSizeLines])

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
      <AboutThisData>
        <p>
          View block propagation timing metrics across the network. This data helps us understand how quickly blocks are propagating through the network and identify potential bottlenecks.
        </p>
      </AboutThisData>

      {/* Controls Section */}
      <div className="backdrop-blur-md border-default p-6 bg-surface/80">
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <div className="relative w-full md:w-auto" ref={timeWindowRef}>
            <button
              type="button"
              onClick={() => setIsTimeWindowOpen(!isTimeWindowOpen)}
              className="w-full flex items-center justify-between gap-2 px-4 py-2 border border-default hover:border-prominent hover:bg-hover transition-all duration-300"
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
              <div className="absolute z-[9999] mt-2 w-full border border-default bg-surface">
                <div className="py-1">
                  {timeWindows.map((window) => (
                    <button
                      key={window.file}
                      onClick={() => {
                        setTimeWindow(window.file)
                        setCurrentWindow(window)
                        setIsTimeWindowOpen(false)
                      }}
                      className={`w-full px-4 py-2 text-left font-mono transition-colors ${
                        window.file === timeWindow 
                          ? 'text-primary bg-active'
                          : 'text-primary hover:text-primary hover:bg-hover active:bg-active'
                      }`}
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
          <div className="w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        </div>
      </div>

      {/* Charts Section */}
      <section className="space-y-12">
        {/* Block Arrival Times */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-sans font-bold text-primary">Block Arrival Time Distribution</h2>
            <p className="text-sm font-mono text-tertiary mt-1">
              This chart tracks block arrival times across the network, showing how quickly blocks propagate to nodes. The data is collected by nodes run by the ethPandaOps team and contributed by the community, showing aggregated results.
            </p>
          </div>
          
          <div className="h-[500px] w-full">
            <NivoLineChart
              data={nivoChartData}
              height="100%"
              width="100%"
              margin={{ top: 30, right: 140, left: 70, bottom: 120 }}
              xScale={{
                type: 'linear',
                min: 'auto',
                max: 'auto'
              }}
              yScale={{
                type: 'linear',
                min: 0,
                max: 6
              }}
              axisBottom={{
                tickSize: 5,
                tickPadding: 20,
                tickRotation: -65,
                format: (value) => formatTime(value),
                legend: 'Time',
                legendOffset: 90,
                legendPosition: 'middle'
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                format: (value) => value.toFixed(1),
                legend: 'Slot time (s)',
                legendOffset: -50,
                legendPosition: 'middle'
              }}
              colors={({ id }) => {
                const key = Object.entries(PERCENTILE_LABELS).find(([, label]) => label === id)?.[0] as PercentileKey
                return key ? PERCENTILE_COLORS[key] : '#00ff9f'
              }}
              lineWidth={2}
              pointSize={0}
              enableSlices="x"
              enableGridX={true}
              enableGridY={true}
              markers={[
                {
                  axis: 'y',
                  value: 4,
                  lineStyle: { stroke: ATTESTATION_DEADLINE_COLOR, strokeWidth: 2, strokeDasharray: '5,2' },
                  legend: 'Attestation Deadline',
                  legendPosition: 'top-right'
                }
              ]}
              tooltip={({ point }) => {
                const xValue = typeof point.data.x === 'number' ? point.data.x : parseFloat(point.data.x as string);
                const yValue = typeof point.data.y === 'number' ? point.data.y : parseFloat(point.data.y as string);
                
                return (
                  <div style={{ 
                    background: '#0a0a0f', 
                    color: '#00ff9f', 
                    padding: '9px 12px', 
                    border: '1px solid rgba(0, 255, 159, 0.3)', 
                    borderRadius: '0.5rem',
                    fontSize: '12px'
                  }}>
                    <div>{new Date(xValue * TIMESTAMP_MULTIPLIER).toLocaleString()}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '12px', height: '12px', backgroundColor: point.serieColor, borderRadius: '2px' }}></div>
                      <strong>{point.serieId}:</strong> {yValue.toFixed(3)}s
                    </div>
                  </div>
                );
              }}
              legends={[
                {
                  anchor: 'right',
                  direction: 'column',
                  justify: false,
                  translateX: 120,
                  translateY: 0,
                  itemsSpacing: 0,
                  itemDirection: 'left-to-right',
                  itemWidth: 80,
                  itemHeight: 20,
                  itemOpacity: 0.75,
                  symbolSize: 12,
                  symbolShape: 'square',
                  symbolBorderColor: 'rgba(0, 0, 0, .5)',
                  effects: [
                    {
                      on: 'hover',
                      style: {
                        itemBackground: 'rgba(0, 0, 0, .03)',
                        itemOpacity: 1
                      }
                    }
                  ],
                  onClick: (data, event) => {
                    const key = Object.entries(PERCENTILE_LABELS).find(([, label]) => label === data.id)?.[0] as PercentileKey;
                    if (key) {
                      handleLegendClick(
                        event as unknown as React.MouseEvent<HTMLButtonElement>, 
                        { value: key, color: data.color as string, type: 'arrival' }
                      );
                    }
                  }
                }
              ]}
            />
          </div>
          
          {/* Custom Stats Display */}
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-default">
                  <th className="py-2 px-3 text-left">Percentile</th>
                  <th className="py-2 px-3 text-right">Min</th>
                  <th className="py-2 px-3 text-right">Avg</th>
                  <th className="py-2 px-3 text-right">Max</th>
                  <th className="py-2 px-3 text-right">Last</th>
                </tr>
              </thead>
              <tbody>
                {getAvailableLines('arrival').map((line) => {
                  const isHidden = hiddenArrivalLines.has(line);
                  if (isHidden) return null;
                  
                  const values = chartData.map(d => d[dataKeyMap[line as PercentileKey] as keyof typeof d]).filter(Boolean) as number[];
                  const latestValue = values[values.length - 1] || 0;
                  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
                  const min = values.length ? Math.min(...values) : 0;
                  const max = values.length ? Math.max(...values) : 0;
                  
                  return (
                    <tr key={line} className="border-b border-default hover:bg-hover">
                      <td className="py-2 px-3 flex items-center gap-2">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: PERCENTILE_COLORS[line as PercentileKey] }} />
                        <span>{PERCENTILE_LABELS[line as PercentileKey]}</span>
                      </td>
                      <td className="py-2 px-3 text-right">{min.toFixed(3)}s</td>
                      <td className="py-2 px-3 text-right">{avg.toFixed(3)}s</td>
                      <td className="py-2 px-3 text-right">{max.toFixed(3)}s</td>
                      <td className="py-2 px-3 text-right">{latestValue.toFixed(3)}s</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Block Size vs Arrival Time */}
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-sans font-bold text-primary">Block Size vs Arrival Time</h2>
            <p className="text-sm font-mono text-tertiary mt-1">
              This chart analyzes the relationship between block size and network propagation time, helping identify how block size impacts network performance. The data is collected by nodes run by the ethPandaOps team and contributed by the community, showing aggregated results.
            </p>
          </div>
          
          <div className="h-[500px] w-full" style={{ cursor: 'pointer' }}>
            <NivoLineChart
              data={nivoScatterData}
              height="100%"
              width="100%"
              margin={{ top: 30, right: 140, left: 70, bottom: 80 }}
              xScale={{
                type: 'linear',
                min: 0,
                max: 1536
              }}
              yScale={{
                type: 'linear',
                min: 0,
                max: 6
              }}
              axisBottom={{
                tickSize: 5,
                tickPadding: 15,
                tickRotation: 0,
                format: (value) => value.toFixed(0),
                legend: 'Block+Blob Size (KB)',
                legendOffset: 60,
                legendPosition: 'middle'
              }}
              axisLeft={{
                tickSize: 5,
                tickPadding: 5,
                tickRotation: 0,
                format: (value) => Math.round(value).toString(),
                legend: 'Time (s)',
                legendOffset: -50,
                legendPosition: 'middle'
              }}
              colors={({ id }) => BLOCK_TYPE_COLORS[id as keyof typeof BLOCK_TYPE_COLORS] || '#00ff9f'}
              lineWidth={2}
              pointSize={0}
              enableSlices="x"
              enableGridX={true}
              enableGridY={true}
              markers={[
                {
                  axis: 'y',
                  value: 4,
                  lineStyle: { stroke: ATTESTATION_DEADLINE_COLOR, strokeWidth: 2, strokeDasharray: '5,2' },
                  legend: 'Attestation Deadline',
                  legendPosition: 'top-right'
                }
              ]}
              tooltip={({ point }) => {
                const xValue = typeof point.data.x === 'number' ? point.data.x : parseFloat(point.data.x as string);
                const yValue = typeof point.data.y === 'number' ? point.data.y : parseFloat(point.data.y as string);
                const blockType = point.serieId as keyof typeof BLOCK_TYPE_DESCRIPTIONS;
                const description = BLOCK_TYPE_DESCRIPTIONS[blockType];
                
                return (
                  <div style={{ 
                    background: '#0a0a0f', 
                    color: '#00ff9f', 
                    padding: '9px 12px', 
                    border: '1px solid rgba(0, 255, 159, 0.3)', 
                    borderRadius: '0.5rem',
                    fontSize: '12px',
                    maxWidth: '300px'
                  }}>
                    <div>Block+Blob Size: {xValue.toFixed(1)} KB</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <div style={{ width: '12px', height: '12px', backgroundColor: point.serieColor, borderRadius: '2px' }}></div>
                      <strong>{point.serieId}:</strong> {yValue.toFixed(3)}s
                    </div>
                    <div style={{ borderTop: '1px solid rgba(0, 255, 159, 0.2)', paddingTop: '6px', fontSize: '11px', opacity: 0.9 }}>
                      {description}
                    </div>
                  </div>
                );
              }}
              legends={[
                {
                  anchor: 'right',
                  direction: 'column',
                  justify: false,
                  translateX: 120,
                  translateY: 0,
                  itemsSpacing: 2,
                  itemDirection: 'left-to-right',
                  itemWidth: 100,
                  itemHeight: 20,
                  itemOpacity: 0.75,
                  symbolSize: 12,
                  symbolShape: 'square',
                  symbolBorderColor: 'rgba(0, 0, 0, .5)',
                  effects: [
                    {
                      on: 'hover',
                      style: {
                        itemBackground: 'rgba(0, 0, 0, .03)',
                        itemOpacity: 1
                      }
                    }
                  ],
                  onClick: (data, event) => {
                    handleLegendClick(
                      event as unknown as React.MouseEvent<HTMLButtonElement>, 
                      { value: data.id as string, color: data.color as string, type: 'size' }
                    );
                  }
                }
              ]}
            />
          </div>
          
          {/* Block Type Descriptions Table */}
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-default">
                  <th className="py-2 px-3 text-left">Block Type</th>
                  <th className="py-2 px-3 text-left">Description</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(BLOCK_TYPE_COLORS).map(([type, color]) => (
                  <tr key={type} className="border-b border-default hover:bg-hover">
                    <td className="py-2 px-3 flex items-center gap-2 whitespace-nowrap">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />
                      <span>{type}</span>
                    </td>
                    <td className="py-2 px-3">
                      {BLOCK_TYPE_DESCRIPTIONS[type as keyof typeof BLOCK_TYPE_DESCRIPTIONS]}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  )
} 