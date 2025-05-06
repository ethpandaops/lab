import React, { useMemo, useState } from 'react';
import { ChartWithStats } from '@/components/charts';

// Define the props interface
export interface MevBidsVisualizerProps {
  bids: Array<{
    relayName: string;
    value: number; // in ETH
    time: number; // relative to slot start in ms
    blockHash?: string;
    builderPubkey?: string;
    isWinning?: boolean;
  }>;
  currentTime: number; // in ms relative to slot start
  relayColors: Record<string, string>; // mapping relay names to colors
  winningBid?: {
    blockHash: string;
    value: number;
    relayName: string;
  } | null;
  timeRange?: {
    min: number;
    max: number;
    ticks: number[];
  };
  valueRange?: {
    min: number;
    max: number;
  };
  height?: number;
}

// Simple tooltip component
const Tooltip = ({ 
  x, 
  y, 
  relayName, 
  value, 
  time, 
  isWinning 
}: { 
  x: number; 
  y: number; 
  relayName: string; 
  value: number; 
  time: number; 
  isWinning?: boolean;
}) => {
  return (
    <div
      className="absolute bg-surface border border-default rounded-lg shadow-lg p-2 z-50 pointer-events-none"
      style={{
        left: x + 10,
        top: y - 40,
        minWidth: '150px'
      }}
    >
      <div className="font-mono text-xs">
        <div className="flex justify-between items-center mb-1">
          <span className="font-medium text-primary">{relayName}</span>
          {isWinning && (
            <span className="text-xs bg-success/20 text-success px-1.5 py-0.5 rounded-full">
              Winner
            </span>
          )}
        </div>
        <div className="text-secondary">Value: <span className="text-accent">{value.toFixed(4)} ETH</span></div>
        <div className="text-secondary">Time: <span className="text-accent">{(time / 1000).toFixed(2)}s</span></div>
      </div>
    </div>
  );
};

// Super simple scatterplot component
const SimpleScatterPlot = ({ 
  data, 
  width, 
  height, 
  xMin, 
  xMax, 
  yMin, 
  yMax,
  currentTime,
  relayColors
}: { 
  data: Array<{ x: number; y: number; relayName: string; isWinning?: boolean }>;
  width: number;
  height: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  currentTime: number;
  relayColors: Record<string, string>;
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<{
    index: number;
    x: number;
    y: number;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Add padding to the chart area
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Function to map data values to coordinates
  const xScale = (x: number) => {
    return padding.left + (chartWidth * (x - xMin)) / (xMax - xMin);
  };

  const yScale = (y: number) => {
    return height - padding.bottom - (chartHeight * (y - yMin)) / (yMax - yMin);
  };
  
  // Ticks for the axes
  const xTicks = [-12, -9, -6, -3, 0, 3, 6, 9, 12].map(t => t * 1000);
  const yTicks = Array.from({ length: 6 }, (_, i) => yMin + (i * (yMax - yMin) / 5));

  return (
    <div className="relative" style={{ width, height }}>
      <svg width={width} height={height} style={{ overflow: 'visible' }}>
        {/* X-axis */}
        <line 
          x1={padding.left} 
          y1={height - padding.bottom} 
          x2={width - padding.right} 
          y2={height - padding.bottom} 
          stroke="rgba(255, 255, 255, 0.3)" 
        />
        
        {/* Y-axis */}
        <line 
          x1={padding.left} 
          y1={padding.top} 
          x2={padding.left} 
          y2={height - padding.bottom} 
          stroke="rgba(255, 255, 255, 0.3)" 
        />
        
        {/* X-axis ticks and labels */}
        {xTicks.map(tick => (
          <g key={`x-tick-${tick}`}>
            <line 
              x1={xScale(tick)} 
              y1={height - padding.bottom} 
              x2={xScale(tick)} 
              y2={height - padding.bottom + 5} 
              stroke="rgba(255, 255, 255, 0.3)" 
            />
            <text 
              x={xScale(tick)} 
              y={height - padding.bottom + 20} 
              textAnchor="middle" 
              fill="rgba(255, 255, 255, 0.7)"
              fontSize="10px"
            >
              {(tick / 1000).toFixed(0)}s
            </text>
          </g>
        ))}
        
        {/* Y-axis ticks and labels */}
        {yTicks.map(tick => (
          <g key={`y-tick-${tick}`}>
            <line 
              x1={padding.left - 5} 
              y1={yScale(tick)} 
              x2={padding.left} 
              y2={yScale(tick)} 
              stroke="rgba(255, 255, 255, 0.3)" 
            />
            <text 
              x={padding.left - 10} 
              y={yScale(tick)} 
              textAnchor="end" 
              alignmentBaseline="middle" 
              fill="rgba(255, 255, 255, 0.7)"
              fontSize="10px"
            >
              {tick.toFixed(3)}
            </text>
          </g>
        ))}
        
        {/* Grid lines */}
        {xTicks.map(tick => (
          <line 
            key={`x-grid-${tick}`}
            x1={xScale(tick)} 
            y1={padding.top} 
            x2={xScale(tick)} 
            y2={height - padding.bottom} 
            stroke="rgba(255, 255, 255, 0.1)" 
            strokeDasharray="2,2"
          />
        ))}
        
        {yTicks.map(tick => (
          <line 
            key={`y-grid-${tick}`}
            x1={padding.left} 
            y1={yScale(tick)} 
            x2={width - padding.right} 
            y2={yScale(tick)} 
            stroke="rgba(255, 255, 255, 0.1)" 
            strokeDasharray="2,2"
          />
        ))}
        
        {/* Current time marker */}
        <line 
          x1={xScale(currentTime)} 
          y1={padding.top} 
          x2={xScale(currentTime)} 
          y2={height - padding.bottom} 
          stroke="rgba(255, 255, 255, 0.5)" 
          strokeWidth={2}
          strokeDasharray="4,4"
        />
        
        {/* X-axis label */}
        <text 
          x={width / 2} 
          y={height + 5} 
          textAnchor="middle" 
          fill="rgba(255, 255, 255, 0.7)"
          fontSize="12px"
          fontWeight="medium"
        >
          Time relative to slot start (seconds)
        </text>
        
        {/* Y-axis label */}
        <text 
          x={-height / 2} 
          y={-15} 
          textAnchor="middle" 
          transform={`rotate(-90)`}
          fill="rgba(255, 255, 255, 0.7)"
          fontSize="12px"
          fontWeight="medium"
        >
          Bid Value (ETH)
        </text>
        
        {/* Data points */}
        {data.map((point, i) => (
          <g 
            key={`point-${i}`}
            onMouseEnter={() => {
              setHoveredPoint({
                index: i,
                x: point.x,
                y: point.y,
                screenX: xScale(point.x),
                screenY: yScale(point.y)
              });
            }}
            onMouseLeave={() => setHoveredPoint(null)}
          >
            <circle 
              cx={xScale(point.x)} 
              cy={yScale(point.y)} 
              r={point.isWinning ? 8 : 6} 
              fill={relayColors[point.relayName] || '#888888'} 
              stroke={point.isWinning ? 'white' : 'rgba(255, 255, 255, 0.5)'} 
              strokeWidth={point.isWinning ? 2 : 1}
              opacity={0.8}
              style={{ cursor: 'pointer' }}
            />
          </g>
        ))}
      </svg>

      {/* Tooltip */}
      {hoveredPoint !== null && (
        <Tooltip
          x={hoveredPoint.screenX}
          y={hoveredPoint.screenY}
          relayName={data[hoveredPoint.index].relayName}
          value={data[hoveredPoint.index].y}
          time={data[hoveredPoint.index].x}
          isWinning={data[hoveredPoint.index].isWinning}
        />
      )}
    </div>
  );
};

export const MevBidsVisualizer: React.FC<MevBidsVisualizerProps> = ({
  bids,
  currentTime,
  relayColors,
  winningBid,
  timeRange = {
    min: -12000,
    max: 12000,
    ticks: [-12, -9, -6, -3, 0, 3, 6, 9, 12]
  },
  valueRange,
  height = 400
}) => {
  // Group bids by relay for stats
  const { chartData, seriesStats } = useMemo(() => {
    const bidsByRelay: Record<string, Array<{ x: number; y: number; isWinning?: boolean }>> = {};
    
    // Process bids
    bids.forEach(bid => {
      if (!bidsByRelay[bid.relayName]) {
        bidsByRelay[bid.relayName] = [];
      }
      
      bidsByRelay[bid.relayName].push({
        x: bid.time,
        y: bid.value,
        isWinning: bid.isWinning
      });
    });
    
    // Flatten for chart
    const flatData = bids.map(bid => ({
      x: bid.time,
      y: bid.value,
      relayName: bid.relayName,
      isWinning: bid.isWinning
    }));
    
    // Calculate stats for each relay
    const stats = Object.entries(bidsByRelay).map(([relay, relayBids]) => {
      const values = relayBids.map(bid => bid.y);
      
      // Make sure we have values to avoid empty arrays
      const min = values.length ? Math.min(...values) : 0;
      const avg = values.length ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
      const max = values.length ? Math.max(...values) : 0;
      const last = values.length ? values[values.length - 1] : 0;
      
      return {
        name: relay,
        color: relayColors[relay] || '#888888',
        min: min.toFixed(3),
        avg: avg.toFixed(3),
        max: max.toFixed(3),
        last: last.toFixed(3),
        unit: ' ETH'
      };
    });
    
    return {
      chartData: flatData,
      seriesStats: stats
    };
  }, [bids, relayColors]);
  
  // Calculate value range if not provided
  const calculatedValueRange = useMemo(() => {
    if (valueRange) return valueRange;
    
    if (bids.length === 0) return { min: 0, max: 1 };
    
    const allValues = bids.map(bid => bid.value);
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.1 || 0.1;
    
    return {
      min: Math.max(0, min - padding),
      max: max + padding || 1
    };
  }, [bids, valueRange]);
  
  return (
    <ChartWithStats
      title={`MEV Bids Timeline (${bids.length} bids)`}
      description="Visualization of bids received over time relative to slot start"
      chart={
        <div className="relative w-full h-full flex items-center justify-center bg-surface/30 rounded-lg">
          {/* Always render the chart, even with empty data */}
          <SimpleScatterPlot 
            data={chartData}
            width={800}
            height={height}
            xMin={timeRange.min}
            xMax={timeRange.max}
            yMin={calculatedValueRange.min}
            yMax={calculatedValueRange.max}
            currentTime={currentTime}
            relayColors={relayColors}
          />
        </div>
      }
      series={seriesStats}
      height={height}
      // Add custom styles to improve series table readability
      titleClassName="text-lg"
      descriptionClassName="text-xs"
      valueHeader="Value (ETH)"
      notes={
        winningBid ? (
          <div className="text-xs font-mono">
            Winning bid: <span className="text-success">{winningBid.value.toFixed(4)} ETH</span> from <span className="font-medium">{winningBid.relayName}</span>
          </div>
        ) : bids.length === 0 ? (
          <div className="text-xs font-mono text-tertiary">No bids received for this slot</div>
        ) : null
      }
    />
  );
};

export default MevBidsVisualizer;