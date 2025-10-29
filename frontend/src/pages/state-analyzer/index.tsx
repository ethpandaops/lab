import { useState, useEffect } from 'react';
import { FaEthereum } from 'react-icons/fa';
import { Card, CardBody, CardHeader } from '@/components/common/Card';
import useContext from '@/contexts/api';
import { useNetwork } from '@/stores/appStore';
import type {
  LatestBlockDeltaResponse,
  TopStateAddersResponse,
  TopStateRemoversResponse,
  StateGrowthChartResponse,
  StatePeriod,
  StateGranularity,
} from '@/types/state-analytics';
import { ResponsiveLine } from '@nivo/line';
import { defaultNivoTheme } from '@/components/charts/NivoTheme';

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// Helper function to format numbers with commas
function formatNumber(num: number): string {
  return num.toLocaleString();
}

// Helper function to shorten address
function shortenAddress(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function StateAnalyzer() {
  const { restClient } = useContext();
  const { selectedNetwork } = useNetwork();

  const [latestData, setLatestData] = useState<LatestBlockDeltaResponse | null>(null);
  const [topAdders, setTopAdders] = useState<TopStateAddersResponse | null>(null);
  const [topRemovers, setTopRemovers] = useState<TopStateRemoversResponse | null>(null);
  const [chartData, setChartData] = useState<StateGrowthChartResponse | null>(null);

  const [period, setPeriod] = useState<StatePeriod>('24h' as StatePeriod);
  const [granularity, setGranularity] = useState<StateGranularity>('hour' as StateGranularity);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      if (!selectedNetwork || !restClient) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch all data in parallel
        const [latest, adders, removers, chart] = await Promise.all([
          restClient.getStateLatest(selectedNetwork).catch(() => null),
          restClient.getStateTopAdders(selectedNetwork, { period, limit: 10 }).catch(() => null),
          restClient.getStateTopRemovers(selectedNetwork, { period, limit: 10 }).catch(() => null),
          restClient.getStateGrowthChart(selectedNetwork, { period, granularity }).catch(() => null),
        ]);

        setLatestData(latest);
        setTopAdders(adders);
        setTopRemovers(removers);
        setChartData(chart);
      } catch (err) {
        console.error('Error fetching state analytics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedNetwork, period, granularity, restClient]);

  // Prepare chart data for Nivo
  const nivoChartData = chartData?.dataPoints ? [
    {
      id: 'State Growth',
      data: chartData.dataPoints.map(point => ({
        x: new Date(point.timestamp * 1000),
        y: point.netStateChangeBytes / (1024 * 1024), // Convert to MB
      })),
    },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <Card isPrimary className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/5 via-transparent to-transparent" />
        <CardBody className="relative flex items-center gap-8">
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-sans font-bold text-primary mb-3">
              State Analyzer
            </h1>
            <p className="text-base md:text-lg font-mono text-secondary max-w-3xl">
              Real-time visualization of Ethereum state growth, tracking storage slot additions and
              deletions across {selectedNetwork || 'the network'}.
            </p>
          </div>
          <FaEthereum className="w-24 h-24 text-accent/20" />
        </CardBody>
      </Card>

      {/* Loading/Error States */}
      {loading && (
        <Card>
          <CardBody className="text-center py-12">
            <div className="animate-pulse text-secondary">Loading state analytics...</div>
          </CardBody>
        </Card>
      )}

      {error && (
        <Card>
          <CardBody className="text-center py-12">
            <div className="text-red-500">Error: {error}</div>
          </CardBody>
        </Card>
      )}

      {!loading && !error && (
        <>
          {/* Latest Block Metrics */}
          {latestData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardBody>
                  <div className="text-xs text-secondary mb-1">Latest Block</div>
                  <div className="text-2xl font-bold text-primary font-mono">
                    #{formatNumber(latestData.blockNumber)}
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="text-xs text-secondary mb-1">New Slots</div>
                  <div className="text-2xl font-bold text-accent font-mono">
                    +{formatNumber(latestData.newSlots)}
                  </div>
                  <div className="text-xs text-secondary mt-1">
                    {formatBytes(latestData.estimatedBytesAdded)}
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="text-xs text-secondary mb-1">Cleared Slots</div>
                  <div className="text-2xl font-bold text-red-500 font-mono">
                    -{formatNumber(latestData.clearedSlots)}
                  </div>
                  <div className="text-xs text-secondary mt-1">
                    {formatBytes(latestData.estimatedBytesFreed)}
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <div className="text-xs text-secondary mb-1">Net Change</div>
                  <div
                    className={`text-2xl font-bold font-mono ${
                      latestData.netStateChangeBytes >= 0 ? 'text-accent' : 'text-red-500'
                    }`}
                  >
                    {latestData.netStateChangeBytes >= 0 ? '+' : ''}
                    {formatBytes(latestData.netStateChangeBytes)}
                  </div>
                </CardBody>
              </Card>
            </div>
          )}

          {/* Period Selector */}
          <div className="flex gap-2">
            {(['24h', '7d', '30d'] as StatePeriod[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg font-mono text-sm transition-colors ${
                  period === p
                    ? 'bg-accent text-primary font-bold'
                    : 'bg-surface text-secondary hover:bg-hover'
                }`}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>

          {/* State Growth Chart */}
          {chartData && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-primary">State Growth Over Time</h2>
                  <div className="flex gap-2">
                    {(['block', 'hour', 'day'] as StateGranularity[]).map(g => (
                      <button
                        key={g}
                        onClick={() => setGranularity(g)}
                        className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                          granularity === g
                            ? 'bg-accent/20 text-accent'
                            : 'text-secondary hover:bg-hover'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardBody className="h-96">
                <ResponsiveLine
                  data={nivoChartData}
                  theme={defaultNivoTheme}
                  margin={{ top: 20, right: 30, bottom: 50, left: 60 }}
                  xScale={{
                    type: 'time',
                    format: 'native',
                  }}
                  xFormat="time:%Y-%m-%d %H:%M"
                  yScale={{
                    type: 'linear',
                    min: 'auto',
                    max: 'auto',
                  }}
                  axisBottom={{
                    format: '%H:%M',
                    tickRotation: -45,
                    legend: 'Time',
                    legendOffset: 40,
                  }}
                  axisLeft={{
                    legend: 'Net State Change (MB)',
                    legendOffset: -50,
                  }}
                  colors={['rgb(var(--cyber-cyan))']}
                  lineWidth={2}
                  pointSize={6}
                  pointColor="rgb(var(--cyber-cyan))"
                  pointBorderWidth={2}
                  pointBorderColor={{ from: 'serieColor' }}
                  enableArea={true}
                  areaOpacity={0.1}
                  enableGridX={false}
                  enableGridY={true}
                  useMesh={true}
                  tooltip={({ point }) => (
                    <div className="bg-surface border border-border rounded-lg px-3 py-2 shadow-lg">
                      <div className="text-xs text-secondary">
                        {new Date(point.data.x as Date).toLocaleString()}
                      </div>
                      <div className="text-sm font-bold text-primary font-mono">
                        {(point.data.y as number).toFixed(2)} MB
                      </div>
                    </div>
                  )}
                />
              </CardBody>
            </Card>
          )}

          {/* Top State Adders & Removers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Adders */}
            {topAdders && (
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-bold text-primary">Top State Adders</h2>
                  <p className="text-sm text-secondary">Contracts adding most storage slots</p>
                </CardHeader>
                <CardBody>
                  <div className="space-y-2">
                    {topAdders.adders.map(adder => (
                      <div
                        key={adder.address}
                        className="flex items-center gap-3 p-3 rounded-lg bg-surface/50 hover:bg-hover transition-colors"
                      >
                        <div className="text-lg font-bold text-accent font-mono w-8">
                          #{adder.rank}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-sm text-primary truncate">
                            {adder.label || shortenAddress(adder.address)}
                          </div>
                          <div className="text-xs text-secondary">
                            {formatNumber(adder.slotsAdded)} slots •{' '}
                            {formatBytes(adder.estimatedBytesAdded)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-accent font-mono">
                            {adder.percentageOfTotal.toFixed(1)}%
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}

            {/* Top Removers */}
            {topRemovers && (
              <Card>
                <CardHeader>
                  <h2 className="text-xl font-bold text-primary">Top State Removers</h2>
                  <p className="text-sm text-secondary">Contracts clearing most storage slots</p>
                </CardHeader>
                <CardBody>
                  <div className="space-y-2">
                    {topRemovers.removers.map(remover => (
                      <div
                        key={remover.address}
                        className="flex items-center gap-3 p-3 rounded-lg bg-surface/50 hover:bg-hover transition-colors"
                      >
                        <div className="text-lg font-bold text-red-500 font-mono w-8">
                          #{remover.rank}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-mono text-sm text-primary truncate">
                            {remover.label || shortenAddress(remover.address)}
                          </div>
                          <div className="text-xs text-secondary">
                            {formatNumber(remover.slotsCleared)} slots •{' '}
                            {formatBytes(remover.estimatedBytesFreed)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-red-500 font-mono">
                            {remover.percentageOfTotal.toFixed(1)}%
                          </div>
                          <div className="text-xs text-secondary">
                            ~{formatNumber(remover.estimatedGasRefund)} gas
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardBody>
              </Card>
            )}
          </div>

          {/* Summary Stats */}
          {chartData?.summary && (
            <Card>
              <CardHeader>
                <h2 className="text-xl font-bold text-primary">Period Summary</h2>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-secondary mb-1">Total New Slots</div>
                    <div className="text-xl font-bold text-accent font-mono">
                      +{formatNumber(chartData.summary.totalNewSlots)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-secondary mb-1">Total Cleared Slots</div>
                    <div className="text-xl font-bold text-red-500 font-mono">
                      -{formatNumber(chartData.summary.totalClearedSlots)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-secondary mb-1">Net State Change</div>
                    <div
                      className={`text-xl font-bold font-mono ${
                        chartData.summary.netStateChangeBytes >= 0 ? 'text-accent' : 'text-red-500'
                      }`}
                    >
                      {chartData.summary.netStateChangeBytes >= 0 ? '+' : ''}
                      {formatBytes(chartData.summary.netStateChangeBytes)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-secondary mb-1">Avg Block Growth</div>
                    <div className="text-xl font-bold text-primary font-mono">
                      {formatBytes(chartData.summary.averageBlockGrowthBytes)}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

export { StateAnalyzer };
