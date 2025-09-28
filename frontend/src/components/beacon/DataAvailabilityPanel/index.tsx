import { useMemo, memo, useRef, useEffect } from 'react';
import { ChartWithStats, NivoLineChart, NivoScatterChart } from '@/components/charts';
import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react';
import { useModal } from '@/contexts/ModalContext.tsx';

// Interface for DataAvailabilityPanelProps
interface DataAvailabilityPanelProps {
  blobTimings: {
    blobSeen?: Record<string, Record<string, number>>;
    blobFirstSeenP2p?: Record<string, Record<string, number>>;
    blockSeen?: Record<string, number>;
    blockFirstSeenP2p?: Record<string, number>;
  };
  currentTime: number;
  nodes?: Record<string, { geo?: { continent?: string } }>;
}

// Add continent name mapping at the top
const CONTINENT_NAMES: Record<string, string> = {
  NA: 'North America',
  SA: 'South America',
  EU: 'Europe',
  AF: 'Africa',
  AS: 'Asia',
  OC: 'Oceania',
  AN: 'Antarctica',
};

// Add consistent color mapping for continents
const CONTINENT_COLORS: Record<string, string> = {
  NA: 'rgb(0, 255, 255)', // Cyan
  SA: 'rgb(255, 0, 255)', // Pink
  EU: 'rgb(0, 255, 128)', // Neon green
  AS: 'rgb(0, 128, 255)', // Blue
  AF: 'rgb(255, 255, 0)', // Yellow
  OC: 'rgb(var(--accent))', // Accent (bright cyan)
  AN: 'rgb(var(--text-muted))', // Muted for Antarctica
};

// Add blob color mapping at the top
const BLOB_COLORS = [
  'rgb(255, 0, 255)', // Neon pink
  'rgb(0, 255, 128)', // Neon green
  'rgb(255, 255, 0)', // Neon yellow
  'rgb(255, 128, 0)', // Neon orange
  'rgb(128, 0, 255)', // Neon purple
  'rgb(0, 255, 255)', // Neon cyan
  'rgb(255, 0, 128)', // Hot pink
  'rgb(128, 255, 0)', // Lime
];

// Custom component for labeled scatter plot
const LabeledScatterPlot = ({
  data,
  blockTime,
  blobCount,
}: {
  data: { index: number; time: number }[];
  blockTime: number | null;
  blobCount: number;
}) => {
  // Calculate appropriate tick values based on blob count
  const getYAxisTicks = () => {
    if (blobCount <= 10) {
      return [-0.5, ...Array.from({ length: Math.min(blobCount, 5) }, (_, i) => i)];
    } else if (blobCount <= 20) {
      return [-0.5, 0, 5, 10, 15, blobCount - 1];
    } else {
      // For large numbers of blobs (up to 72)
      const step = Math.ceil(blobCount / 5);
      return [-0.5, 0, step, 2 * step, 3 * step, 4 * step, blobCount - 1].filter(
        (v, i, a) => a.indexOf(v) === i && v < blobCount,
      );
    }
  };

  return (
    <div className="w-full h-full">
      <NivoScatterChart
        data={[
          // Create a separate series for each blob index
          ...data.map(d => ({
            id: `blob-${d.index}`,
            data: [{ x: d.time, y: d.index }],
          })),
          ...(blockTime !== null
            ? [
                {
                  id: 'block',
                  data: [{ x: blockTime, y: -0.5 }],
                },
              ]
            : []),
        ]}
        margin={{ top: 16, right: 8, left: 30, bottom: 24 }}
        xScale={{
          type: 'linear',
          min: 0,
          max: 12,
        }}
        yScale={{
          type: 'linear',
          min: -1,
          max: Math.max(blobCount - 1, 0) + 1, // Add some padding
        }}
        axisBottom={{
          tickSize: 2,
          tickPadding: 5,
          tickRotation: 0,
          tickValues: [0, 4, 8, 12],
          format: value => value.toString(),
          legend: 'Time (s)',
          legendOffset: 20,
          legendPosition: 'middle',
        }}
        axisLeft={{
          tickSize: 2,
          tickPadding: 5,
          tickRotation: 0,
          tickValues: getYAxisTicks(),
          format: value => (value === -0.5 ? 'B' : value.toString()),
          legend: '',
          legendOffset: -20,
          legendPosition: 'middle',
        }}
        colors={({ serieId }) => {
          // For block series, use blue
          if (serieId === 'block') return 'rgb(0, 128, 255)';

          // For blob series, extract the index from the series ID and use it for coloring
          if (serieId.toString().startsWith('blob-')) {
            const index = parseInt(serieId.toString().replace('blob-', ''));
            return BLOB_COLORS[index % BLOB_COLORS.length];
          }

          // Default fallback
          return BLOB_COLORS[0];
        }}
        nodeSize={4}
        enableGridX={true}
        enableGridY={true}
      />
    </div>
  );
};

export const DataAvailabilityPanel = memo(function DataAvailabilityPanel({
  blobTimings,
  currentTime,
  nodes,
}: DataAvailabilityPanelProps) {
  const { showModal } = useModal();

  const handleInfoClick = () => {
    showModal(
      <div className="p-6 space-y-4">
        <h3 className="text-lg font-sans font-bold text-primary">Data Availability Charts</h3>
        <div className="space-y-4 font-sans text-sm text-tertiary">
          <div>
            <h4 className="font-sans font-medium text-primary mb-1">First Seen</h4>
            <p>
              Shows when the block and each blob was first seen by any node in the network, helping
              track the initial propagation of the block and blobs.
            </p>
          </div>
          <div>
            <h4 className="font-sans font-medium text-primary mb-1">Data Is Available Rate</h4>
            <p>
              Shows the rate at which nodes have received all required data (both block and all
              blobs). Each point represents the number of nodes that have received the complete
              dataset at that time.
            </p>
          </div>
          <div>
            <h4 className="font-sans font-medium text-primary mb-1">Continental Progress</h4>
            <p>
              Shows how quickly each continent receives all the data, helping identify any
              geographical patterns in data propagation across the network.
            </p>
          </div>
        </div>
      </div>,
    );
  };

  // Process blob timing data
  const {
    firstSeenData,
    isAllDataAvailable,
    blobCount,
    continentalData,
    timeWindow,
    arrivalData,
    blockTime,
  } = useMemo(() => {
    // Early return only if we have no blob data at all
    if (!blobTimings?.blobSeen && !blobTimings?.blobFirstSeenP2p) {
      return {
        firstSeenData: [],
        isAllDataAvailable: true,
        blobCount: 0,
        continentalData: [],
        timeWindow: { min: 0, max: 12, ticks: [] },
        arrivalData: [],
        blockTime: 0,
      };
    }

    const seenBlobs = new Set<string>();
    const firstSeenTimes: Record<string, number> = {};
    // Track when each continent sees each blob
    const continentBlobTimes: Record<string, Record<string, number>> = {};

    // Process API timings
    Object.entries(blobTimings.blobSeen || {}).forEach(([node, blobs]) => {
      Object.entries(blobs).forEach(([index, time]) => {
        seenBlobs.add(index);
        if (!firstSeenTimes[index] || time < firstSeenTimes[index]) {
          firstSeenTimes[index] = time;
        }

        // Only track continental data if we have node info
        if (nodes?.[node]?.geo?.continent) {
          const continent = nodes[node].geo.continent;
          if (!continentBlobTimes[continent]) {
            continentBlobTimes[continent] = {};
          }
          if (
            !continentBlobTimes[continent][index] ||
            time < continentBlobTimes[continent][index]
          ) {
            continentBlobTimes[continent][index] = time;
          }
        }
      });
    });

    // Process P2P timings
    Object.entries(blobTimings.blobFirstSeenP2p || {}).forEach(([node, blobs]) => {
      Object.entries(blobs).forEach(([index, time]) => {
        seenBlobs.add(index);
        if (!firstSeenTimes[index] || time < firstSeenTimes[index]) {
          firstSeenTimes[index] = time;
        }

        // Only track continental data if we have node info
        if (nodes?.[node]?.geo?.continent) {
          const continent = nodes[node].geo.continent;
          if (!continentBlobTimes[continent]) {
            continentBlobTimes[continent] = {};
          }
          if (
            !continentBlobTimes[continent][index] ||
            time < continentBlobTimes[continent][index]
          ) {
            continentBlobTimes[continent][index] = time;
          }
        }
      });
    });

    // Convert to chart data format for first seen times
    const data = Object.entries(firstSeenTimes)
      .map(([index, time]) => ({
        index: parseInt(index),
        time: time / 1000, // Convert to seconds
      }))
      .sort((a, b) => a.index - b.index);

    // Find earliest block time
    const blockTimes = [
      ...Object.values(blobTimings.blockSeen || {}).filter(t => t !== undefined),
      ...Object.values(blobTimings.blockFirstSeenP2p || {}).filter(t => t !== undefined),
    ];
    const blockTime = blockTimes.length > 0 ? Math.min(...blockTimes) / 1000 : null; // Convert to seconds if we have times

    // Process data for each continent
    const continentalData = Object.entries(continentBlobTimes).map(([continent, blobs]) => {
      // Create points for this continent's progress
      const points: Array<{ time: number; percentage: number }> = [];

      // Add initial point
      points.push({ time: 0, percentage: 0 });

      // Calculate and sort blob times for this continent
      const blobTimes = Object.entries(blobs).sort((a, b) => a[1] - b[1]);

      // Track how many unique blob indices we've seen for this continent
      const seenIndices = new Set<string>();

      // Add a point for each blob seen
      blobTimes.forEach(([index, time]) => {
        seenIndices.add(index);
        points.push({
          time: time / 1000,
          percentage: (seenIndices.size / Number(seenBlobs.size)) * 100,
        });
      });

      // Add final point at 12s to maintain the last percentage
      points.push({
        time: 12,
        percentage: points[points.length - 1].percentage,
      });

      return {
        continent,
        points,
      };
    });

    // Calculate the interesting time window
    const allPoints = continentalData.flatMap(c => c.points);
    const timePoints = allPoints
      .map(p => p.time)
      .filter(t => t > 0 && t < 12) // Filter out 0 and final points
      .sort((a, b) => a - b);

    // Find the main cluster by looking for gaps larger than 1 second
    let clusterEnd = timePoints[timePoints.length - 1];
    for (let i = 1; i < timePoints.length; i++) {
      if (timePoints[i] - timePoints[i - 1] > 1) {
        // If gap is more than 1s
        clusterEnd = timePoints[i - 1];
        break;
      }
    }

    // If we have points, create a window around them with 0.5s padding
    // If no points, default to 0-12s
    const minTime = timePoints.length ? Math.max(0, Math.min(...timePoints) - 0.5) : 0;
    const maxTime = timePoints.length ? Math.min(12, clusterEnd + 0.5) : 12;

    // Generate 5 evenly spaced ticks within our interesting window
    const tickCount = 5;
    const timeWindow = maxTime - minTime;
    const tickInterval = timeWindow / (tickCount - 1);
    const ticks = Array.from(
      { length: tickCount },
      (_, i) => Math.round((minTime + i * tickInterval) * 10) / 10,
    );

    // Process arrival data - track block and blob arrivals separately
    const blockBins = new Array(240).fill(0);
    const blobBins = new Array(240).fill(0);

    // For each node, track block and blob arrivals independently
    const allNodes = new Set([
      ...Object.keys(blobTimings.blockSeen || {}),
      ...Object.keys(blobTimings.blockFirstSeenP2p || {}),
      ...Object.keys(blobTimings.blobSeen || {}),
      ...Object.keys(blobTimings.blobFirstSeenP2p || {}),
    ]);

    allNodes.forEach(node => {
      // Process block arrivals
      const blockTime = Math.min(
        blobTimings.blockSeen?.[node] ?? Infinity,
        blobTimings.blockFirstSeenP2p?.[node] ?? Infinity,
      );

      // Process blob arrivals
      const blobTimes = [
        ...Object.values(blobTimings.blobSeen?.[node] || {}),
        ...Object.values(blobTimings.blobFirstSeenP2p?.[node] || {}),
      ];

      // Add block arrival to bins
      if (blockTime !== Infinity && blockTime <= currentTime) {
        const binIndex = Math.floor(blockTime / 50);
        if (binIndex >= 0 && binIndex < blockBins.length) {
          blockBins[binIndex]++;

          // If there are no blobs, also increment blob bins at the same time
          // since the block is all that's needed for data availability
          if (Number(seenBlobs.size) === 0) {
            blobBins[binIndex]++;
          }
        }
      }

      // Only process blob arrivals if there are blobs to track
      if (Number(seenBlobs.size) > 0 && blobTimes.length > 0) {
        // A node has complete data availability only when it has seen all blobs
        // Check if this node has seen all blobs by comparing the count of unique blob indices seen
        const seenBlobIndices = new Set([
          ...Object.keys(blobTimings.blobSeen?.[node] || {}),
          ...Object.keys(blobTimings.blobFirstSeenP2p?.[node] || {}),
        ]);

        // Only count a node as having data available when it has all blobs
        if (seenBlobIndices.size === Number(seenBlobs.size)) {
          const lastBlobTime = Math.max(...blobTimes);
          if (lastBlobTime <= currentTime) {
            const binIndex = Math.floor(lastBlobTime / 50);
            if (binIndex >= 0 && binIndex < blobBins.length) {
              blobBins[binIndex]++;
            }
          }
        }
      }
    });

    // Convert to chart data format - only up to current time
    const currentBinIndex = Math.floor(currentTime / 50);

    const arrivalData = Array.from({ length: currentBinIndex + 1 }, (_, i) => ({
      time: i * 0.05, // Convert bin index to seconds
      blocks: blockBins[i] ?? 0,
      blobs: blobBins[i] ?? 0,
    }));

    return {
      firstSeenData: data,
      isAllDataAvailable: data.length === Number(seenBlobs.size),
      blobCount: Number(seenBlobs.size),
      continentalData,
      timeWindow: {
        min: minTime,
        max: maxTime,
        ticks,
      },
      arrivalData,
      blockTime,
    };
  }, [blobTimings, currentTime, nodes]);

  // Remove loading state and show empty charts instead
  return (
    <div className="w-full h-full">
      <div className="flex flex-col h-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-sans font-bold text-primary">Data Availability</h3>
            <button
              onClick={handleInfoClick}
              className="text-tertiary/50 hover:text-tertiary transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>

          {/* Stats Row */}
          <div className="flex items-center gap-4 mt-2 md:mt-0">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-tertiary">Blobs:</span>
              <span className="font-mono text-primary">{Number(blobCount)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-tertiary">Data is available:</span>
              {isAllDataAvailable ? (
                <div className="flex items-center gap-1 text-success">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Yes</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-error">
                  <XCircle className="w-4 h-4" />
                  <span>No</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-1 flex-1 min-h-0">
          {/* Blob First Seen Chart */}
          <div className="w-full h-full">
            <ChartWithStats
              title={
                <div className="text-[8px] font-medium text-primary/50 uppercase tracking-wider pt-3">
                  First Seen
                </div>
              }
              height={140}
              titlePlacement="inside"
              valueHeader="Time"
              chart={
                <LabeledScatterPlot
                  data={firstSeenData}
                  blockTime={blockTime}
                  blobCount={blobCount}
                />
              }
              series={[
                {
                  name: 'Block',
                  color: 'rgb(0, 128, 255)',
                  min: 0,
                  max: 0,
                  avg: 0,
                  last: blockTime !== null ? blockTime.toFixed(2) : '-',
                  unit: 's',
                },
                ...firstSeenData.map((d, i) => ({
                  name: `Blob ${d.index}`,
                  color: BLOB_COLORS[i % BLOB_COLORS.length],
                  min: 0,
                  max: 0,
                  avg: 0,
                  last: d.time.toFixed(2),
                  unit: 's',
                })),
              ]}
              showSeriesTable={true}
            />
          </div>

          {/* Arrival Rate Chart */}
          <div className="w-full h-full">
            <ChartWithStats
              title={
                <div className="text-[8px] font-medium text-primary/50 uppercase tracking-wider pt-3">
                  Data Is Available Rate
                </div>
              }
              height={140}
              titlePlacement="inside"
              valueHeader="Count"
              chart={
                <NivoLineChart
                  data={[
                    {
                      id: 'Block Arrivals',
                      data: arrivalData
                        .filter(d => d.time != null && d.blocks != null)
                        .map(d => ({ x: d.time, y: d.blocks })),
                    },
                    {
                      id: 'Blob Arrivals',
                      data: arrivalData
                        .filter(d => d.time != null && d.blobs != null)
                        .map(d => ({ x: d.time, y: d.blobs })),
                    },
                  ]}
                  margin={{ top: 16, right: 8, left: 36, bottom: 24 }}
                  xScale={{
                    type: 'linear',
                    min: 0,
                    max: 12,
                  }}
                  yScale={{
                    type: 'linear',
                    min: 0,
                    max: 'auto',
                  }}
                  axisBottom={{
                    tickSize: 2,
                    tickPadding: 5,
                    tickRotation: 0,
                    tickValues: [0, 4, 8, 12],
                    format: (value: number) => value.toString(),
                    legend: 'Time (s)',
                    legendOffset: 20,
                    legendPosition: 'middle',
                  }}
                  axisLeft={{
                    tickSize: 2,
                    tickPadding: 5,
                    tickRotation: 0,
                    legend: 'Nodes',
                    legendOffset: -30,
                    legendPosition: 'middle',
                  }}
                  colors={['rgb(var(--cyber-cyan))', 'rgb(var(--success))']}
                  pointSize={0}
                  enableGridX={true}
                  enableGridY={true}
                  lineWidth={1}
                />
              }
              series={[
                {
                  name: 'Block Arrivals',
                  color: 'rgb(var(--cyber-cyan))',
                  min: arrivalData.length ? Math.min(...arrivalData.map(d => d.blocks)) : 0,
                  max: arrivalData.length ? Math.max(...arrivalData.map(d => d.blocks)) : 0,
                  avg: arrivalData.length
                    ? arrivalData.reduce((a, b) => a + b.blocks, 0) / arrivalData.length
                    : 0,
                  last: arrivalData.length ? arrivalData[arrivalData.length - 1].blocks : 0,
                  unit: '',
                },
                {
                  name: 'Blob Arrivals',
                  color: 'rgb(var(--success))',
                  min: arrivalData.length ? Math.min(...arrivalData.map(d => d.blobs)) : 0,
                  max: arrivalData.length ? Math.max(...arrivalData.map(d => d.blobs)) : 0,
                  avg: arrivalData.length
                    ? arrivalData.reduce((a, b) => a + b.blobs, 0) / arrivalData.length
                    : 0,
                  last: arrivalData.length ? arrivalData[arrivalData.length - 1].blobs : 0,
                  unit: '',
                },
              ]}
              showSeriesTable={false}
            />
          </div>

          {/* Continental Progress Chart */}
          <div className="w-full h-full">
            <ChartWithStats
              title={
                <div className="text-[8px] font-medium text-primary/50 uppercase tracking-wider pt-3">
                  Continental Propagation
                </div>
              }
              height={140}
              titlePlacement="inside"
              showHeader={true}
              compactSeries={true}
              valueHeader="Time"
              chart={
                <NivoLineChart
                  data={continentalData.map(continent => ({
                    id: CONTINENT_NAMES[continent.continent] || continent.continent,
                    data: continent.points
                      .filter(p => p.time != null && p.percentage != null)
                      .map(p => ({ x: p.time, y: p.percentage })),
                  }))}
                  margin={{ top: 16, right: 8, left: 36, bottom: 24 }}
                  xScale={{
                    type: 'linear',
                    min: timeWindow.min,
                    max: timeWindow.max,
                  }}
                  yScale={{
                    type: 'linear',
                    min: 0,
                    max: 120,
                  }}
                  axisBottom={{
                    tickSize: 2,
                    tickPadding: 5,
                    tickRotation: 0,
                    tickValues: timeWindow.ticks,
                    format: (value: number) => value.toString(),
                    legend: 'Time (s)',
                    legendOffset: 20,
                    legendPosition: 'middle',
                  }}
                  axisLeft={{
                    tickSize: 2,
                    tickPadding: 5,
                    tickRotation: 0,
                    tickValues: [0, 25, 50, 75, 100],
                    format: (value: number) => `${value}%`,
                    legend: 'Complete',
                    legendOffset: -30,
                    legendPosition: 'middle',
                  }}
                  colors={(d: { id: string }) => CONTINENT_COLORS[d.id] || 'rgb(var(--success))'}
                  pointSize={0}
                  enableGridX={true}
                  enableGridY={true}
                  lineWidth={1}
                  curve="stepAfter"
                />
              }
              series={continentalData.map(continent => {
                // Find the time when this continent saw all blobs
                const completionTime = continent.points.find(p => p.percentage === 100)?.time || 12;
                return {
                  name: CONTINENT_NAMES[continent.continent] || continent.continent,
                  color: CONTINENT_COLORS[continent.continent] || 'rgb(var(--success))',
                  min: 0,
                  max: 100,
                  avg: continent.points[continent.points.length - 1].percentage,
                  last: completionTime,
                  unit: 's',
                };
              })}
              showSeriesTable={true}
            />
          </div>
        </div>
      </div>
    </div>
  );
});
