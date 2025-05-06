import React, { useMemo } from 'react';
import { Card, CardBody } from '@/components/common/Card';
import { ChartWithStats } from '@/components/charts/ChartWithStats';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';

export interface TimingsViewProps {
  bids: Array<{
    relayName: string;
    value: number;
    time: number;
    blockHash?: string;
    builderPubkey?: string;
    isWinning?: boolean;
  }>;
  relayColors: Record<string, string>;
  className?: string;
}

export const TimingsView: React.FC<TimingsViewProps> = ({
  bids,
  relayColors,
  className
}) => {
  // Process data for bid timing distribution
  const { bidTimingData, bidTimingStats } = useMemo(() => {
    if (!bids.length) return { bidTimingData: [], bidTimingStats: [] };

    // Group bids by relay
    const bidsByRelay: Record<string, number[]> = {};
    
    // Collect times for each relay
    bids.forEach(bid => {
      if (!bidsByRelay[bid.relayName]) {
        bidsByRelay[bid.relayName] = [];
      }
      bidsByRelay[bid.relayName].push(bid.time);
    });

    // Create stats for each relay
    const stats = Object.entries(bidsByRelay).map(([relayName, times]) => {
      const sortedTimes = [...times].sort((a, b) => a - b);
      const min = sortedTimes[0];
      const max = sortedTimes[sortedTimes.length - 1];
      const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
      
      return {
        name: relayName,
        color: relayColors[relayName] || '#888888',
        min: (min / 1000).toFixed(2),
        avg: (avg / 1000).toFixed(2),
        max: (max / 1000).toFixed(2),
        last: (sortedTimes[sortedTimes.length - 1] / 1000).toFixed(2),
        unit: 's'
      };
    });

    // Create histogram data (bin size: 500ms)
    const binSize = 500; // ms
    const maxTime = 12000; // 12 seconds
    const bins = Array.from({ length: Math.ceil(maxTime / binSize) }, (_, i) => ({
      binStart: i * binSize,
      binEnd: (i + 1) * binSize,
      count: 0
    }));

    // Count bids in each bin
    bids.forEach(bid => {
      const binIndex = Math.floor(bid.time / binSize);
      if (binIndex >= 0 && binIndex < bins.length) {
        bins[binIndex].count++;
      }
    });

    // Format for chart
    const chartData = bins.map(bin => ({
      time: bin.binStart / 1000,
      count: bin.count,
      label: `${(bin.binStart / 1000).toFixed(1)}s - ${(bin.binEnd / 1000).toFixed(1)}s`
    }));

    return {
      bidTimingData: chartData,
      bidTimingStats: stats
    };
  }, [bids, relayColors]);

  // Calculate first, median, and last bid times
  const bidTimeMetrics = useMemo(() => {
    if (!bids.length) return { first: null, median: null, last: null };
    
    const sortedBids = [...bids].sort((a, b) => a.time - b.time);
    const first = sortedBids[0];
    const last = sortedBids[sortedBids.length - 1];
    const median = sortedBids[Math.floor(sortedBids.length / 2)];
    
    return { first, median, last };
  }, [bids]);

  // Calculate time between first and last bid
  const bidTimeSpan = useMemo(() => {
    if (!bids.length || bids.length < 2) return null;
    
    const times = bids.map(bid => bid.time);
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    return (max - min) / 1000; // in seconds
  }, [bids]);

  // Custom tooltip for the histogram
  interface TooltipProps {
    active?: boolean;
    payload?: Array<{
      payload: {
        label: string;
        count: number;
      };
    }>;
  }

  const CustomTooltip = ({ active, payload }: TooltipProps) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-surface p-2 border border-subtle rounded-md shadow-md">
          <p className="text-xs font-mono text-primary">{data.label}</p>
          <p className="text-xs font-mono text-secondary">
            Count: <span className="text-accent">{data.count}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Bid Timing Metrics */}
        <Card>
          <CardBody>
            <h3 className="text-lg font-sans font-bold text-primary mb-3">Bid Timing Metrics</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-xs text-tertiary">Total Bids</span>
                <span className="text-sm font-mono text-secondary">{bids.length}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-tertiary">Time Span</span>
                <span className="text-sm font-mono text-secondary">
                  {bidTimeSpan ? `${bidTimeSpan.toFixed(2)}s` : 'N/A'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-tertiary">First Bid</span>
                <span className="text-sm font-mono text-secondary">
                  {bidTimeMetrics.first ? `${(bidTimeMetrics.first.time / 1000).toFixed(2)}s` : 'N/A'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-tertiary">Last Bid</span>
                <span className="text-sm font-mono text-secondary">
                  {bidTimeMetrics.last ? `${(bidTimeMetrics.last.time / 1000).toFixed(2)}s` : 'N/A'}
                </span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Relay Performance */}
        <Card>
          <CardBody>
            <h3 className="text-lg font-sans font-bold text-primary mb-3">Relay Performance</h3>
            <div className="space-y-2">
              {Object.entries(relayColors).map(([relayName, color]) => {
                const relayBids = bids.filter(bid => bid.relayName === relayName);
                const winningBid = relayBids.find(bid => bid.isWinning);
                
                return (
                  <div key={relayName} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: color }}
                      />
                      <span className="text-sm text-secondary">{relayName}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-mono text-tertiary">
                        {relayBids.length} bid{relayBids.length !== 1 ? 's' : ''}
                      </span>
                      {winningBid && (
                        <span className="text-xs font-mono text-success">Winner</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Bid Timing Distribution Chart */}
      <Card>
        <CardBody>
          <ChartWithStats
            title="Bid Timing Distribution"
            description="Number of bids received in each 500ms time window"
            chart={
              <ResponsiveContainer width="100%" height={300}>
                <LineChart
                  data={bidTimingData}
                  margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                >
                  <XAxis 
                    dataKey="time" 
                    label={{ 
                      value: 'Time (seconds)', 
                      position: 'insideBottomRight', 
                      offset: -10 
                    }}
                    domain={[0, 12]}
                    ticks={[0, 2, 4, 6, 8, 10, 12]}
                  />
                  <YAxis 
                    label={{ 
                      value: 'Number of Bids', 
                      angle: -90, 
                      position: 'insideLeft',
                      style: { textAnchor: 'middle' }
                    }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine
                    x={bidTimeMetrics.first?.time ? bidTimeMetrics.first.time / 1000 : undefined}
                    stroke="#8884d8"
                    strokeDasharray="3 3"
                    label={{ value: 'First', position: 'top', fill: '#8884d8' }}
                  />
                  <ReferenceLine
                    x={bidTimeMetrics.last?.time ? bidTimeMetrics.last.time / 1000 : undefined}
                    stroke="#82ca9d"
                    strokeDasharray="3 3"
                    label={{ value: 'Last', position: 'top', fill: '#82ca9d' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            }
            series={bidTimingStats}
            height={300}
          />
        </CardBody>
      </Card>
    </div>
  );
};

export default TimingsView;