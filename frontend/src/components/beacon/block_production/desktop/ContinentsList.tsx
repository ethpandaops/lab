import React from 'react';
import { Node } from '@/api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb';

// Continent colors mapping
const CONTINENT_COLORS: Record<string, string> = {
  'NA': '#4285F4', // Blue for North America
  'EU': '#34A853', // Green for Europe
  'AS': '#FBBC05', // Yellow for Asia
  'OC': '#EA4335', // Red for Oceania
  'SA': '#9C27B0', // Purple for South America
  'AF': '#FF9800', // Orange for Africa
  'AN': '#00BCD4'  // Cyan for Antarctica
};

// Map of continent codes to full names
const CONTINENT_NAMES: Record<string, string> = {
  'NA': 'North America',
  'SA': 'South America',
  'EU': 'Europe',
  'AS': 'Asia',
  'AF': 'Africa',
  'OC': 'Oceania',
  'AN': 'Antarctica'
};

interface ContinentsListProps {
  nodes: Record<string, Node>;
  nodeBlockSeen: Record<string, number>;
  nodeBlockP2P: Record<string, number>;
  currentTime: number;
  isActive: boolean;
}

const ContinentsList: React.FC<ContinentsListProps> = ({
  nodes,
  nodeBlockSeen,
  nodeBlockP2P,
  currentTime,
  isActive
}) => {
  // Group nodes by continent for display with additional timing data
  const continents = React.useMemo(() => {
    const continentsMap: Record<string, {
      count: number;
      nodes: Node[];
      // Track timing data for each node
      nodeTimings: Array<{
        nodeId: string;
        p2pTime?: number; // Time when node saw block via p2p
        apiTime?: number; // Time when node saw block via api
        firstSeenTime?: number; // The earlier of p2p and api time
      }>;
    }> = {};

    // Process node data
    Object.entries(nodes).forEach(([nodeId, node]) => {
      if (!node.geo) return;
      
      // Use continent code or continent name
      const continentCode = node.geo.continent || 'Unknown';
      
      // Initialize continent entry if it doesn't exist
      if (!continentsMap[continentCode]) {
        continentsMap[continentCode] = { 
          count: 0, 
          nodes: [],
          nodeTimings: []
        };
      }
      
      continentsMap[continentCode].count += 1;
      continentsMap[continentCode].nodes.push(node);
      
      // Extract block timing data for this node
      const nodeTiming = {
        nodeId,
        p2pTime: nodeBlockP2P[nodeId], // Get P2P timing if available
        apiTime: nodeBlockSeen[nodeId], // Get API timing if available
        firstSeenTime: undefined as number | undefined
      };
      
      // Calculate first seen time (earliest of P2P and API)
      if (nodeTiming.p2pTime !== undefined || nodeTiming.apiTime !== undefined) {
        const p2pTime = nodeTiming.p2pTime !== undefined ? nodeTiming.p2pTime : Infinity;
        const apiTime = nodeTiming.apiTime !== undefined ? nodeTiming.apiTime : Infinity;
        nodeTiming.firstSeenTime = Math.min(p2pTime, apiTime);
        
        // If we only have infinity values, set to undefined
        if (nodeTiming.firstSeenTime === Infinity) {
          nodeTiming.firstSeenTime = undefined;
        }
      }
      
      // Add to node timings list
      continentsMap[continentCode].nodeTimings.push(nodeTiming);
    });

    // Calculate continent progress data
    const processedContinents = Object.entries(continentsMap).map(([continentCode, data]) => {
      // Get full continent name if available
      const fullName = CONTINENT_NAMES[continentCode] || continentCode;
      
      // Sort nodes by earliest seen time
      const sortedNodes = [...data.nodeTimings].sort((a, b) => {
        const aTime = a.firstSeenTime !== undefined ? a.firstSeenTime : Infinity;
        const bTime = b.firstSeenTime !== undefined ? b.firstSeenTime : Infinity;
        return aTime - bTime;
      });
      
      // Calculate how many nodes have seen the block by current time
      const nodesThatHaveSeenBlock = data.nodeTimings.filter(timing => {
        const seenTime = timing.firstSeenTime;
        return seenTime !== undefined && seenTime <= currentTime;
      }).length;
      
      // Calculate progress percentage
      const progress = data.count > 0 ? (nodesThatHaveSeenBlock / data.count) * 100 : 0;
      
      // Find earliest and latest node timing for this continent
      const timings = data.nodeTimings
        .map(t => t.firstSeenTime)
        .filter((t): t is number => t !== undefined)
        .sort((a, b) => a - b);
        
      const earliestTime = timings.length > 0 ? timings[0] : undefined;
      const latestTime = timings.length > 0 ? timings[timings.length - 1] : undefined;
      
      // Format the earliest time as a readable time if it exists
      const formattedTime = earliestTime !== undefined 
        ? `${(earliestTime / 1000).toFixed(2)}s`
        : undefined;
      
      return {
        id: continentCode,
        continentCode, // Keep the code for color lookup
        fullName,      // Store the full name
        label: fullName, 
        color: CONTINENT_COLORS[continentCode] || '#9b59b6', // Use continent-specific color
        count: data.count,
        nodesThatHaveSeenBlock,
        progress,       // Store progress percentage
        earliestTime,   // First node to see the block (numeric)
        formattedTime,  // Formatted earliest time
        latestTime,     // Last node to see the block
        isWinning: progress > 0, // Mark as winning if at least one node has seen the block
        rank: 0,        // Will be set based on sorting
      };
    });
    
    // Sort continents by earliestTime (who saw the block first)
    const sortedContinents = [...processedContinents].sort((a, b) => {
      // If either doesn't have timing data, push to the end
      if (a.earliestTime === undefined && b.earliestTime === undefined) return 0;
      if (a.earliestTime === undefined) return 1;
      if (b.earliestTime === undefined) return -1;
      
      // Otherwise sort by earliest time
      return a.earliestTime - b.earliestTime;
    });
    
    // Assign medal rankings to the top 3
    sortedContinents.forEach((continent, index) => {
      if (continent.earliestTime !== undefined) {
        continent.rank = index + 1; // 1-based ranking
      }
    });
    
    return sortedContinents;
  }, [nodes, currentTime, nodeBlockSeen, nodeBlockP2P]);

  return (
    <div className="bg-surface/10 p-2 rounded-lg shadow-sm border border-subtle/30 overflow-hidden h-full flex flex-col">
      <div className="p-2 border-b border-subtle/20 bg-surface/60 rounded-t-lg">
        <div className="text-sm font-medium text-primary flex items-center">
          <div className="w-2 h-2 rounded-full bg-purple-400 mr-1.5"></div>
          Nodes
        </div>
      </div>
      
      <div className="flex-1 p-2 overflow-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        <style jsx>{`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}</style>
        {continents.length > 0 ? (
          <div className="space-y-2">
            {continents.map(item => (
              <div 
                key={item.id}
                className={`rounded-lg p-2 transition-all duration-300 ${
                  item.rank === 1 && item.earliestTime && item.earliestTime <= currentTime 
                    ? 'bg-amber-400/10 border border-amber-400/20' 
                    : 'bg-surface/30'
                }`}
                style={{
                  opacity: item.progress > 0 && isActive ? 1 : 0.7,
                }}
              >
                <div className="flex justify-between items-center">
                  <div className={`font-medium flex items-center ${
                    item.rank === 1 && item.earliestTime && item.earliestTime <= currentTime 
                      ? 'text-base' 
                      : 'text-sm'
                  }`}>
                    {item.rank > 0 && item.rank <= 3 && item.earliestTime && item.earliestTime <= currentTime && (
                      <span className="text-xs mr-2">
                        {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : '🥉'}
                      </span>
                    )}
                    {item.label}
                  </div>
                  
                  {item.earliestTime && item.earliestTime <= currentTime && (
                    <div className={`font-mono px-1.5 py-0.5 rounded ${
                      item.rank === 1 
                        ? 'bg-amber-400/20 text-amber-400 text-sm' 
                        : 'bg-surface/30 text-xs text-tertiary'
                    }`}>
                      {item.formattedTime}
                    </div>
                  )}
                </div>
                
                <div className="mt-2 flex justify-between items-center text-xs">
                  <span className="text-tertiary">
                    Seen: <span className="font-mono">{item.nodesThatHaveSeenBlock}/{item.count}</span>
                  </span>
                  <span className={`font-medium ${
                    item.rank === 1 ? 'text-amber-400' : 'text-tertiary'
                  }`}>
                    {Math.round(item.progress)}%
                  </span>
                </div>
                
                {/* Progress bar */}
                <div className="mt-1.5 h-2 w-full bg-surface/50 rounded-full overflow-hidden">
                  <div 
                    className="h-full transition-width duration-700 ease-out rounded-full"
                    style={{ 
                      width: `${item.progress || 0}%`,
                      backgroundColor: item.rank === 1 ? '#f59e0b' : item.color,
                      boxShadow: item.progress > 0 ? 'inset 0 0 4px rgba(255, 255, 255, 0.3)' : 'none'
                    }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-tertiary p-3">
            {isActive ? 'No continent data yet' : 'Waiting for propagation...'}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContinentsList;