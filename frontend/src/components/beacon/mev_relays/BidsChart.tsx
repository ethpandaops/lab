import React, { useMemo } from 'react';
import { ChartWithStats, NivoScatterChart } from '@/components/charts';
import { BeaconSlotData } from '@/api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb';

// Helper: Convert Wei string to ETH number
const weiToEth = (wei: string | undefined): number => {
  if (!wei) return 0;
  try {
    const weiBigInt = BigInt(wei);
    return Number(weiBigInt * 10000n / (10n**18n)) / 10000;
  } catch (error) {
    console.error("Error converting Wei to ETH:", error);
    return 0;
  }
};

// A simple interface for bid data we'll extract from the proto objects
interface SimpleBid {
  relayName: string; // Use relay name, not builder pubkey
  value: number; // in ETH
  time: number; // relative to current slot in ms
}

interface BidsChartProps {
  currentSlotData: BeaconSlotData | null | undefined;
  currentTime: number;
  currentSlotNumber: number | null;
}

export const BidsChart: React.FC<BidsChartProps> = ({
  currentSlotData,
  currentTime,
  currentSlotNumber
}) => {
  // Extract and process bids from the current slot
  const { timeRange, chartData, seriesStats } = useMemo(() => {
    const simpleBids: SimpleBid[] = [];
    const SLOT_DURATION = 12000; // 12 seconds in ms
    
    // Process current slot data including bids with negative time (before slot start)
    if (currentSlotData?.relayBids) {
      Object.entries(currentSlotData.relayBids).forEach(([relayName, relayBids]) => {
        relayBids.bids.forEach(bid => {
          // Include bids from before slot start (negative time values) and up to slot end
          simpleBids.push({
            relayName,
            value: weiToEth(bid.value),
            time: bid.slotTime ?? 0
          });
        });
      });
    }
    
    // Calculate time range including before slot start
    const timeRange = {
      min: -6000, // Show 6 seconds before slot start
      max: SLOT_DURATION,
      ticks: [-6, -4, -2, 0, 2, 4, 6, 8, 10, 12]
    };
    
    // Vibrant color palette for a more eye-catching visualization
    const COLORS = [
      'rgba(255, 71, 87, 1)',     // Vibrant red
      'rgba(46, 213, 115, 1)',    // Vibrant green
      'rgba(54, 162, 235, 1)',    // Vibrant blue
      'rgba(255, 159, 64, 1)',    // Vibrant orange
      'rgba(155, 89, 182, 1)',    // Vibrant purple
      'rgba(52, 231, 228, 1)',    // Vibrant cyan
      'rgba(255, 221, 89, 1)'     // Vibrant yellow
    ];
    
    // Group bids by relay for scatter plot
    const relayBids = new Map<string, SimpleBid[]>();
    
    // Process all bids and group by relay
    simpleBids.forEach(bid => {
      if (!relayBids.has(bid.relayName)) {
        relayBids.set(bid.relayName, []);
      }
      
      relayBids.get(bid.relayName)!.push(bid);
    });
    
    // Transform data for scatter plot
    const chartData = Array.from(relayBids.entries()).map(([relayName, bids], index) => {
      return {
        id: relayName,
        color: COLORS[index % COLORS.length],
        data: bids.map(bid => ({
          x: bid.time / 1000, // Convert ms to seconds for x-axis
          y: bid.value,
          relayName: bid.relayName
        }))
      };
    });
    
    // Create statistics for each relay series
    const seriesStats = chartData.map(series => {
      const values = series.data.map(d => d.y);
      const nonZeroValues = values.filter(v => v > 0);
      
      // Find the most recent bid (largest time) for "last" value
      const latestBidIndex = series.data.reduce((maxIndex, bid, currentIndex, array) => {
        return bid.x > array[maxIndex].x ? currentIndex : maxIndex;
      }, 0);
      const latestBidValue = series.data.length > 0 ? series.data[latestBidIndex].y : 0;
      
      return {
        name: series.id,
        color: series.color,
        min: nonZeroValues.length ? Math.min(...nonZeroValues) : 0,
        max: Math.max(...values),
        avg: nonZeroValues.length 
          ? nonZeroValues.reduce((sum, val) => sum + val, 0) / nonZeroValues.length 
          : 0,
        last: latestBidValue, // Most recent bid value
        unit: ' ETH'
      };
    });
    
    return { timeRange, chartData, seriesStats };
  }, [currentSlotData]);
  
  // Don't render if we have no data
  if (chartData.length === 0) {
    return (
      <div className="p-4 text-center text-tertiary bg-surface/30 rounded-lg border border-subtle">
        No bid data available for visualization
      </div>
    );
  }
  
  return (
    <ChartWithStats
      title="Relay Bid Battle"
      description={`Bids for slot ${currentSlotNumber || '—'}`}
      height={300}
      chart={
        <NivoScatterChart
          data={chartData}
          margin={{ top: 10, right: 10, bottom: 40, left: 60 }}
          xScale={{
            type: 'linear',
            min: -6,
            max: 12,
          }}
          yScale={{
            type: 'linear',
            min: 0,
            max: 'auto',
          }}
          axisBottom={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            tickValues: timeRange.ticks,
            format: (value: number) => `${value}s`,
            legend: 'Time (s)',
            legendOffset: 36,
            legendPosition: 'middle'
          }}
          axisLeft={{
            tickSize: 5,
            tickPadding: 5,
            tickRotation: 0,
            legend: 'Value (ETH)',
            legendOffset: -50,
            legendPosition: 'middle',
            format: (value: number) => `${value.toFixed(4)}`
          }}
          nodeSize={12}
          colors={{ datum: 'color' }}
          theme={{
            grid: {
              line: {
                stroke: "#333",
                strokeWidth: 1,
                strokeDasharray: "4 4"
              }
            },
            tooltip: {
              container: {
                background: '#111',
                border: '1px solid #444',
                borderRadius: '4px',
                boxShadow: '0 5px 15px rgba(0,0,0,0.5)'
              }
            }
          }}
          markers={[
            {
              axis: 'x',
              value: currentTime / 1000, // Convert ms to seconds
              lineStyle: { stroke: 'rgba(255, 255, 255, 0.8)', strokeWidth: 2, strokeDasharray: '4 4' },
              legend: 'Current Time',
              legendOrientation: 'vertical',
              legendPosition: 'top-right',
              textStyle: { fill: 'rgba(255, 255, 255, 0.8)', fontSize: 10 },
            },
            // Add slot boundary markers
            {
              axis: 'x',
              value: 0,
              lineStyle: { stroke: 'rgba(255, 255, 255, 0.3)', strokeWidth: 1 },
              legend: 'Slot Start',
              legendPosition: 'bottom',
              textStyle: { fill: 'rgba(255, 255, 255, 0.6)', fontSize: 9 },
            },
            {
              axis: 'x',
              value: 12,
              lineStyle: { stroke: 'rgba(255, 255, 255, 0.3)', strokeWidth: 1 },
              legend: 'Slot End',
              legendPosition: 'bottom',
              textStyle: { fill: 'rgba(255, 255, 255, 0.6)', fontSize: 9 },
            }
          ]}
        />
      }
      series={seriesStats}
    />
  );
};

export default BidsChart; 