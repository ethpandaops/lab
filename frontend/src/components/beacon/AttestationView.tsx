import { useMemo } from 'react'
import { Tooltip } from 'react-tooltip'
import { ChartWithStats } from '../charts/ChartWithStats'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, ReferenceLine } from 'recharts'

interface AttestationWindow {
  start_ms: number
  end_ms: number
  validator_indices: number[]
}

interface AttestationPoint {
  time: number
  totalValidators: number
}

interface AttestationViewProps {
  loading: boolean
  isMissing: boolean
  attestationWindows?: Array<{
    start_ms: number
    end_ms: number
    validator_indices: number[]
  }>
  attestationProgress: AttestationPoint[]
  TOTAL_VALIDATORS: number
  ATTESTATION_THRESHOLD: number
  currentTime: number
}

export function AttestationView({ 
  loading, 
  isMissing, 
  attestationWindows, 
  attestationProgress,
  TOTAL_VALIDATORS,
  ATTESTATION_THRESHOLD,
  currentTime
}: AttestationViewProps): JSX.Element {
  // Calculate current attestation count based on currentTime
  const currentAttestationCount = useMemo(() => {
    if (!attestationProgress?.length) return 0;
    
    // Find the last point that's before or at the current time
    for (let i = attestationProgress.length - 1; i >= 0; i--) {
      if (attestationProgress[i].time <= currentTime) {
        return attestationProgress[i].totalValidators;
      }
    }
    return 0;
  }, [attestationProgress, currentTime]);

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
        percentage: lastPoint ? (lastPoint.totalValidators / TOTAL_VALIDATORS) * 100 : 0
      }
    })
  }, [attestationProgress, loading, isMissing, TOTAL_VALIDATORS, Math.floor(currentTime / 100) * 100])

  // Stats for arrival count chart
  const arrivalStats = useMemo(() => {
    if (loading || isMissing || arrivalData.length === 0) return []
    const counts = arrivalData.map(d => d.count)
    return [{
      name: "Attestation Count",
      color: "rgb(236, 64, 122)",
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
      color: "rgb(236, 64, 122)",
      min: Math.min(...percentages),
      max: Math.max(...percentages),
      avg: percentages.reduce((a, b) => a + b, 0) / percentages.length,
      last: percentages[percentages.length - 1],
      unit: "%"
    }]
  }, [cdfData, loading, isMissing])

  return (
    <div className="lg:col-span-12 backdrop-blur-md rounded-lg border border-cyber-neon/20 p-6 bg-cyber-dark/80">
      <div className="flex flex-col space-y-6">
        <h3 className="text-lg font-sans font-bold text-cyber-neon">Attestations</h3>

        {/* Attestation Progress Bar */}
        <div className="relative h-8 bg-cyber-darker rounded-lg overflow-hidden">
          <div 
            className="absolute inset-y-0 left-0 bg-cyber-pink/20 transition-all duration-100"
            style={{ width: `${(currentAttestationCount / TOTAL_VALIDATORS) * 100}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-between px-4 text-xs font-mono">
            <span className="text-cyber-pink/70">0%</span>
            <div className="text-center">
              <span className="text-cyber-pink font-medium">{currentAttestationCount.toLocaleString()}</span>
              <span className="text-cyber-pink/70 ml-1">votes</span>
            </div>
            <span className="text-cyber-pink/70">100%</span>
          </div>
        </div>

        {/* Attestation info */}
        {!loading && !isMissing && attestationWindows && attestationWindows.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="text-xs font-mono text-cyber-neon/70 mb-1">First Attestation</h4>
              <p className="text-sm font-mono text-cyber-neon">
                {(attestationWindows[0].start_ms / 1000).toFixed(1)}s
                <span className="text-cyber-neon/70 ml-2">
                  by validator {attestationWindows[0].validator_indices[0]}
                </span>
              </p>
            </div>
            <div>
              <h4 className="text-xs font-mono text-cyber-neon/70 mb-1">66% Threshold Reached</h4>
              <p className="text-sm font-mono text-cyber-neon">
                {((attestationProgress.find(p => p.totalValidators >= ATTESTATION_THRESHOLD) || { time: 0 }).time / 1000).toFixed(2)}s
              </p>
            </div>
            <div>
              <h4 className="text-xs font-mono text-cyber-neon/70 mb-1">Total Attestations</h4>
              <p className="text-sm font-mono text-cyber-neon">
                {attestationProgress.slice(-1)[0]?.totalValidators.toLocaleString() || 0}
                <span className="text-cyber-neon/70 ml-2">
                  ({Math.round((attestationProgress.slice(-1)[0]?.totalValidators || 0) / TOTAL_VALIDATORS * 100)}% of target)
                </span>
              </p>
            </div>
          </div>
        )}

        {/* Distribution Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Arrival Count Chart */}
          <div className="w-full">
            <ChartWithStats
              title="Arrivals"
              headerSize="small"
              description='When an attestation was first seen'
              height={250}
              chart={
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart
                    data={arrivalData}
                    margin={{ top: 20, right: 20, left: 60, bottom: 40 }}
                  >
                    <XAxis
                      dataKey="time"
                      stroke="currentColor"
                      tick={{ fontSize: 12 }}
                      ticks={[0, 2, 4, 6, 8, 10, 12]}
                      label={{
                        value: "Time (s)",
                        position: "insideBottom",
                        offset: -10,
                        style: { fill: "currentColor", fontSize: 14 }
                      }}
                    />
                    <YAxis
                      stroke="currentColor"
                      tick={{ fontSize: 12 }}
                      label={{
                        value: "Count",
                        angle: -90,
                        position: "insideLeft",
                        style: { fill: "currentColor", fontSize: 14 }
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="rgb(236, 64, 122)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              }
              series={arrivalStats}
              showSeriesTable={false}
              xTicks={[0, 2, 4, 6, 8, 10, 12]}
            />
          </div>

          {/* CDF Chart */}
          <div className="w-full">
            <ChartWithStats
              title="Cumulative Distribution"
              headerSize="small"
              description='The percentage of attestations for the block at a given time'
              height={250}
              chart={
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart
                    data={cdfData}
                    margin={{ top: 20, right: 20, left: 60, bottom: 40 }}
                  >
                    <XAxis
                      dataKey="time"
                      stroke="currentColor"
                      tick={{ fontSize: 12 }}
                      ticks={[0, 2, 4, 6, 8, 10, 12]}
                      label={{
                        value: "Time (s)",
                        position: "insideBottom",
                        offset: -10,
                        style: { fill: "currentColor", fontSize: 14 }
                      }}
                    />
                    <YAxis
                      stroke="currentColor"
                      tick={{ fontSize: 12 }}
                      label={{
                        value: "Percentage",
                        angle: -90,
                        position: "insideLeft",
                        style: { fill: "currentColor", fontSize: 14 }
                      }}
                    />
                    <ReferenceLine
                      y={66}
                      stroke="rgb(236, 64, 122)"
                      strokeDasharray="3 3"
                      label={{
                        value: "66%",
                        position: "right",
                        fill: "rgb(236, 64, 122)",
                        fontSize: 12
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="percentage"
                      stroke="rgb(236, 64, 122)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              }
              series={cdfStats}
              showSeriesTable={false}
              xTicks={[0, 2, 4, 6, 8, 10, 12]}
            />
          </div>
        </div>
      </div>
    </div>
  )
} 