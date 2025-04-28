import { useMemo } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, ReferenceLine } from 'recharts'
import { ChartWithStats } from '../../charts/ChartWithStats'
import { HelpCircle } from 'lucide-react'
import { useModal } from '../../../contexts/ModalContext'

interface AttestationPoint {
  time: number
  totalValidators: number
}

interface BottomPanelProps {
  attestationProgress: AttestationPoint[]
  totalValidators: number
  attestationThreshold: number
  currentTime: number
  loading: boolean
  isMissing: boolean
  maxPossibleValidators: number
  attestationWindows?: Array<{
    start_ms: number
    end_ms: number
    validator_indices: number[]
  }>
}

export function BottomPanel({
  attestationProgress,
  totalValidators,
  attestationThreshold,
  currentTime,
  loading,
  isMissing,
  maxPossibleValidators,
  attestationWindows
}: BottomPanelProps): JSX.Element {
  const { showModal } = useModal()

  // Calculate current attestation count based on currentTime
  const currentAttestationCount = useMemo(() => {
    if (!attestationProgress?.length) return 0
    
    // Find the last point that's before or at the current time
    for (let i = attestationProgress.length - 1; i >= 0; i--) {
      if (attestationProgress[i].time <= currentTime) {
        return attestationProgress[i].totalValidators
      }
    }
    return 0
  }, [attestationProgress, currentTime])

  // Process data for arrival count chart
  const arrivalData = useMemo(() => {
    if (!attestationWindows || loading || isMissing) return []
    
    const bins = new Array(240).fill(0)
    attestationWindows.forEach(window => {
      if (window.start_ms <= currentTime) {
        const binIndex = Math.floor(window.start_ms / 50)
        if (binIndex >= 0 && binIndex < bins.length) {
          bins[binIndex] += window.validator_indices.length
        }
      }
    })

    // Only return points up to currentTime
    const currentBinIndex = Math.floor(currentTime / 50)
    return bins.slice(0, currentBinIndex + 1).map((count, i) => ({
      time: i * 0.05,
      count
    }))
  }, [attestationWindows, loading, isMissing, Math.floor(currentTime / 100) * 100])

  // Process data for CDF chart
  const cdfData = useMemo(() => {
    if (loading || isMissing || attestationProgress.length === 0) return []

    // Find the last valid point at or before currentTime
    const validPoints = attestationProgress.filter(p => p.time <= currentTime)
    if (validPoints.length === 0) return []

    // Create points from 0 to currentTime
    const currentTimeInSeconds = currentTime / 1000
    const timePoints = Array.from(
      { length: Math.floor(currentTimeInSeconds * 10) + 1 }, 
      (_, i) => i / 10
    )
    
    return timePoints.map(timePoint => {
      // Find the last progress point before or at this time
      const relevantPoints = validPoints.filter(p => p.time <= timePoint * 1000)
      const lastPoint = relevantPoints[relevantPoints.length - 1]
      
      return {
        time: timePoint,
        percentage: lastPoint ? (lastPoint.totalValidators / maxPossibleValidators) * 100 : 0
      }
    })
  }, [attestationProgress, loading, isMissing, maxPossibleValidators, Math.floor(currentTime / 100) * 100])

  // Stats for arrival count chart
  const arrivalStats = useMemo(() => {
    if (loading || isMissing || arrivalData.length === 0) return []
    const counts = arrivalData.map(d => d.count)
    return [{
      name: "Attestation Count",
      color: "currentColor",
      min: Math.min(...counts),
      max: Math.max(...counts),
      avg: counts.reduce((a, b) => a + b, 0) / counts.length,
      last: counts[counts.length - 1],
      unit: ""
    }]
  }, [arrivalData, loading, isMissing])

  // Stats for CDF chart
  const cdfStats = useMemo(() => {
    if (loading || isMissing || cdfData.length === 0) return []
    const percentages = cdfData.map(d => d.percentage)
    return [{
      name: "Cumulative %",
      color: "currentColor",
      min: Math.min(...percentages),
      max: Math.max(...percentages),
      avg: percentages.reduce((a, b) => a + b, 0) / percentages.length,
      last: percentages[percentages.length - 1],
      unit: "%"
    }]
  }, [cdfData, loading, isMissing])

  // Calculate max Y value for arrivals chart based on bin size
  const maxArrivalsPerBin = useMemo(() => {
    if (!attestationWindows?.length) return 0
    
    // Group attestations into 50ms bins
    const bins = new Map<number, number>()
    attestationWindows.forEach(window => {
      const binIndex = Math.floor(window.start_ms / 50)
      bins.set(binIndex, (bins.get(binIndex) || 0) + window.validator_indices.length)
    })
    
    // Get max bin size and add 20% buffer
    const maxBin = Math.max(...bins.values())
    return Math.ceil(maxBin * 1.2)
  }, [attestationWindows])

  const handleInfoClick = () => {
    showModal(
      <div className="p-6 space-y-4">
        <h3 className="text-lg font-sans font-bold text-primary">Attestation Charts</h3>
        <div className="space-y-4 font-sans text-sm text-tertiary">
          <div>
            <h4 className="font-sans font-medium text-primary mb-1">Arrivals</h4>
            <p>Shows when attestations are first observed across the network. Each point represents the number of unique validators whose attestation for this block was first seen by any of our monitoring nodes in that time window.</p>
          </div>
          <div>
            <h4 className="font-sans font-medium text-primary mb-1">Cumulative Distribution</h4>
            <p>Shows the total percentage of attestations received over time. The dashed line at 66% represents the target threshold for consensus.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full h-full">
      <div className="flex flex-col h-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-sans font-bold text-primary">Attestations</h3>
            <button 
              onClick={handleInfoClick}
              className="text-tertiary/50 hover:text-tertiary transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
          
          {/* Attestation Progress */}
          {loading ? (
            <div className="flex items-center gap-4 mt-2 md:mt-0">
              <div className="flex items-baseline gap-1 font-mono">
                <div className="h-4 w-16 bg-surface/50 rounded" />
                <div className="h-3 w-24 bg-surface/50 rounded" />
              </div>
              <div className="h-1 w-32 bg-surface/50 rounded-full" />
            </div>
          ) : (
            <div className="flex items-center gap-4 mt-2 md:mt-0">
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-sm font-medium text-success">{currentAttestationCount.toLocaleString()}</span>
                <span className="text-tertiary/70 text-[9px]">/ {maxPossibleValidators.toLocaleString()}</span>
                <span className="text-tertiary/70 text-[9px] ml-1">
                  ({Math.round((currentAttestationCount / maxPossibleValidators) * 100)}%)
                </span>
              </div>

              {/* Progress bar */}
              <div className="relative h-1 w-32 rounded-full overflow-hidden bg-base/20 ring-1 ring-inset ring-white/5">
                {/* Progress fill */}
                <div 
                  className={`absolute inset-y-0 left-0 transition-all duration-100 ${
                    currentAttestationCount >= attestationThreshold 
                      ? 'bg-success' 
                      : 'bg-success/40'
                  }`}
                  style={{ width: `${(currentAttestationCount / maxPossibleValidators) * 100}%` }}
                >
                  {/* Subtle shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 animate-[shine_3s_ease-in-out_infinite]" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Distribution Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-1 flex-1 min-h-0">
          {/* Arrival Count Chart */}
          <div className="w-full h-full">
            <ChartWithStats
              title={<div className="text-[8px] font-medium text-primary/50 uppercase tracking-wider">Arrivals</div>}
              height={140}
              titlePlacement="inside"
              chart={loading ? (
                <div className="w-full h-[140px] bg-surface/50 rounded animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart
                    data={arrivalData}
                    margin={{ top: 16, right: 8, left: 0, bottom: 4 }}
                  >
                    <XAxis
                      dataKey="time"
                      stroke="currentColor"
                      tick={{ fontSize: 8 }}
                      ticks={[0, 4, 8, 12]}
                      domain={[0, 12]}
                      type="number"
                      allowDataOverflow
                      tickSize={2}
                      strokeWidth={1}
                    />
                    <YAxis
                      stroke="currentColor"
                      tick={{ fontSize: 8 }}
                      domain={[0, maxArrivalsPerBin]}
                      ticks={[0, Math.floor(maxArrivalsPerBin / 2), maxArrivalsPerBin]}
                      allowDataOverflow
                      tickSize={2}
                      width={25}
                      strokeWidth={1}
                      tickFormatter={(value) => Math.floor(value).toString()}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      className="text-success"
                      stroke="currentColor"
                      strokeWidth={1}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
              series={arrivalStats}
              showSeriesTable={false}
            />
          </div>

          {/* CDF Chart */}
          <div className="w-full h-full">
            <ChartWithStats
              title={<div className="text-[8px] font-medium text-primary/50 uppercase tracking-wider">Cumulative Distribution</div>}
              height={140}
              titlePlacement="inside"
              chart={loading ? (
                <div className="w-full h-[140px] bg-surface/50 rounded animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart
                    data={cdfData}
                    margin={{ top: 16, right: 8, left: 0, bottom: 4 }}
                  >
                    <XAxis
                      dataKey="time"
                      stroke="currentColor"
                      tick={{ fontSize: 8 }}
                      ticks={[0, 4, 8, 12]}
                      domain={[0, 12]}
                      type="number"
                      allowDataOverflow
                      tickSize={2}
                      strokeWidth={1}
                    />
                    <YAxis
                      stroke="currentColor"
                      tick={{ fontSize: 8 }}
                      domain={[0, 100]}
                      ticks={[0, 33, 66, 100]}
                      allowDataOverflow
                      tickSize={2}
                      width={25}
                      strokeWidth={1}
                    />
                    <ReferenceLine
                      y={66}
                      stroke="currentColor"
                      strokeDasharray="3 3"
                      strokeOpacity={0.3}
                    />
                    <Line
                      type="monotone"
                      dataKey="percentage"
                      className="text-success"
                      stroke="currentColor"
                      strokeWidth={1}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
              series={cdfStats}
              showSeriesTable={false}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default BottomPanel