import { useMemo } from 'react'
import { ChartWithStats, NivoLineChart } from '@/components/charts'


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
    if (!attestationWindows?.length) return 0;
    
    // Group attestations into 50ms bins
    const bins = new Map<number, number>();
    attestationWindows.forEach(window => {
      const binIndex = Math.floor(window.start_ms / 50);
      bins.set(binIndex, (bins.get(binIndex) || 0) + window.validator_indices.length);
    });
    
    // Get max bin size and add 20% buffer
    const maxBin = Math.max(...bins.values());
    return Math.ceil(maxBin * 1.2);
  }, [attestationWindows]);

  return (
    <div className="lg:col-span-12 backdrop-blur-md default p-2 bg-surface/80">
      <div className="flex flex-col space-y-6">
        <h3 className="text-lg font-sans font-bold text-primary">Attestations</h3>

        {/* Attestation Progress Bar */}
        <div className="flex flex-col space-y-2">
          {/* Progress stats */}
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-medium text-success">{currentAttestationCount.toLocaleString()}</span>
              <span className="text-tertiary">of {TOTAL_VALIDATORS.toLocaleString()} validators</span>
            </div>
            <div className="text-tertiary">
              {Math.round((currentAttestationCount / TOTAL_VALIDATORS) * 100)}%
            </div>
          </div>

          {/* Bar container */}
          <div className="relative h-1.5 rounded-full overflow-hidden bg-base">
            {/* Progress fill */}
            <div 
              className={`absolute inset-y-0 left-0 transition-all duration-100 ${
                currentAttestationCount >= ATTESTATION_THRESHOLD 
                  ? 'bg-success' 
                  : 'bg-success/40'
              }`}
              style={{ width: `${(currentAttestationCount / TOTAL_VALIDATORS) * 100}%` }}
            >
              {/* Subtle shine effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12 animate-[shine_3s_ease-in-out_infinite]" />
            </div>
          </div>

          {/* Simple indicators */}
          <div className="flex justify-between items-center text-[10px] font-mono text-tertiary/50">
            <span></span>
            <span>Maximum</span>
          </div>
        </div>

        {/* Attestation info */}
        {!loading && !isMissing && attestationWindows && attestationWindows.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="text-xs font-mono text-tertiary mb-1">First Attestation</h4>
              <p className="text-sm font-mono text-primary">
                {(attestationWindows[0].start_ms / 1000).toFixed(1)}s
                <span className="text-tertiary ml-2">
                  by validator{' '}
                  <a
                    href={`https://beaconcha.in/validator/${attestationWindows[0].validator_indices[0]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:opacity-80 transition-opacity"
                  >
                    {attestationWindows[0].validator_indices[0]}
                  </a>
                </span>
              </p>
            </div>
            <div>
              <h4 className="text-xs font-mono text-tertiary mb-1">66% Threshold Reached</h4>
              <p className="text-sm font-mono text-primary">
                {((attestationProgress.find(p => p.totalValidators >= ATTESTATION_THRESHOLD) || { time: 0 }).time / 1000).toFixed(2)}s
              </p>
            </div>
            <div>
              <h4 className="text-xs font-mono text-tertiary mb-1">Total Attestations</h4>
              <p className="text-sm font-mono text-primary">
                {attestationProgress.slice(-1)[0]?.totalValidators.toLocaleString() || 0}
                <span className="text-tertiary ml-2">
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
                <NivoLineChart
                  data={[
                    {
                      id: 'count',
                      data: arrivalData.map(d => ({ x: d.time, y: d.count }))
                    }
                  ]}
                  margin={{ top: 20, right: 20, left: 60, bottom: 40 }}
                  xScale={{
                    type: 'linear',
                    min: 0,
                    max: 12
                  }}
                  yScale={{
                    type: 'linear',
                    min: 0,
                    max: maxArrivalsPerBin
                  }}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    tickValues: [0, 2, 4, 6, 8, 10, 12],
                    legend: "Time (s)",
                    legendOffset: 36,
                    legendPosition: "middle"
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    tickValues: Array.from({ length: 6 }, (_, i) => Math.floor(maxArrivalsPerBin * i / 5)),
                    legend: "Count",
                    legendOffset: -40,
                    legendPosition: "middle"
                  }}
                  colors={['currentColor']}
                  pointSize={0}
                  enableSlices="x"
                />
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
                <NivoLineChart
                  data={[
                    {
                      id: 'percentage',
                      data: cdfData.map(d => ({ x: d.time, y: d.percentage }))
                    }
                  ]}
                  margin={{ top: 20, right: 20, left: 60, bottom: 40 }}
                  xScale={{
                    type: 'linear',
                    min: 0,
                    max: 12
                  }}
                  yScale={{
                    type: 'linear',
                    min: 0,
                    max: 100
                  }}
                  axisBottom={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    tickValues: [0, 2, 4, 6, 8, 10, 12],
                    legend: "Time (s)",
                    legendOffset: 36,
                    legendPosition: "middle"
                  }}
                  axisLeft={{
                    tickSize: 5,
                    tickPadding: 5,
                    tickRotation: 0,
                    tickValues: [0, 20, 40, 60, 80, 100],
                    legend: "Percentage",
                    legendOffset: -40,
                    legendPosition: "middle"
                  }}
                  colors={['currentColor']}
                  pointSize={0}
                  enableSlices="x"
                  markers={[
                    {
                      axis: 'y',
                      value: 66,
                      lineStyle: { stroke: 'currentColor', strokeDasharray: '3 3' },
                      legend: '66%',
                      legendPosition: 'right',
                      legendOrientation: 'vertical',
                      textStyle: { fill: 'currentColor', fontSize: 12 }
                    }
                  ]}
                />
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