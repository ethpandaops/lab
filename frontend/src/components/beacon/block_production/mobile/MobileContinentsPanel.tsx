import React, { useMemo } from 'react';
import { Node } from '@/api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb';

// Map of continent codes to colors
const CONTINENT_COLORS: Record<string, string> = {
  EU: '#34A853', // Green for Europe
  NA: '#4285F4', // Blue for North America
  AS: '#FBBC05', // Yellow for Asia
  OC: '#EA4335', // Red for Oceania
  SA: '#9C27B0', // Purple for South America
  AF: '#FF9800', // Orange for Africa
  AN: '#00BCD4', // Cyan for Antarctica
};

interface MobileContinentsPanelProps {
  nodes: Record<string, Node>;
  nodeBlockSeen: Record<string, number>;
  nodeBlockP2P: Record<string, number>;
  currentTime: number;
  firstContinentToSeeBlock: string | null;
}

const MobileContinentsPanel: React.FC<MobileContinentsPanelProps> = ({
  nodes,
  nodeBlockSeen,
  nodeBlockP2P,
  currentTime,
  firstContinentToSeeBlock,
}) => {
  // Group nodes by continent with timing data
  const continentData = useMemo(() => {
    // Map of continent names to their full names for better display
    const continentFullNames: Record<string, string> = {
      NA: 'North America',
      SA: 'South America',
      EU: 'Europe',
      AS: 'Asia',
      AF: 'Africa',
      OC: 'Oceania',
      AN: 'Antarctica',
    };

    // Extended continent map with timing data
    const continentsMap: Record<
      string,
      {
        count: number;
        nodesThatHaveSeenBlock: number;
        earliestTime: number; // Track the earliest time for each continent
        totalPropagationTime: number; // Sum of propagation times
        nodesSeen: number; // Count of nodes with valid time data
      }
    > = {};

    // Process node data
    Object.entries(nodes).forEach(([nodeId, node]) => {
      if (!node.geo) return;

      // Use continent code or continent name
      const continentCode = node.geo.continent || 'Unknown';

      // Initialize continent entry if it doesn't exist
      if (!continentsMap[continentCode]) {
        continentsMap[continentCode] = {
          count: 0,
          nodesThatHaveSeenBlock: 0,
          earliestTime: Infinity,
          totalPropagationTime: 0,
          nodesSeen: 0,
        };
      }

      continentsMap[continentCode].count += 1;

      // Determine node timing - use the earliest of API or P2P time
      const p2pTime = typeof nodeBlockP2P[nodeId] === 'number' ? nodeBlockP2P[nodeId] : Infinity;
      const apiTime = typeof nodeBlockSeen[nodeId] === 'number' ? nodeBlockSeen[nodeId] : Infinity;
      const nodeTime = Math.min(p2pTime, apiTime);

      // Check if this node has seen the block by current time
      const hasSeen = nodeTime !== Infinity && nodeTime <= currentTime;

      if (hasSeen) {
        continentsMap[continentCode].nodesThatHaveSeenBlock += 1;

        // Track the earliest time for this continent
        continentsMap[continentCode].earliestTime = Math.min(continentsMap[continentCode].earliestTime, nodeTime);

        // Add to propagation time totals
        continentsMap[continentCode].totalPropagationTime += nodeTime;
        continentsMap[continentCode].nodesSeen += 1;
      }
    });

    // Transform the data for rendering, adding derived metrics
    return (
      Object.entries(continentsMap)
        .map(([code, data]) => {
          // Calculate average propagation time if we have at least one node
          const avgPropagationTime = data.nodesSeen > 0 ? data.totalPropagationTime / data.nodesSeen : 0;

          return {
            name: continentFullNames[code] || code,
            code,
            count: data.count,
            seen: data.nodesThatHaveSeenBlock,
            progress: data.count > 0 ? (data.nodesThatHaveSeenBlock / data.count) * 100 : 0,
            earliestTime: data.earliestTime !== Infinity ? data.earliestTime : null,
            avgTime: avgPropagationTime || null,
            isFirst: code === firstContinentToSeeBlock?.toUpperCase(),
          };
        })
        // Sort by propagation time (earliest first) then by percentage seen
        .sort((a, b) => {
          // First by propagation time
          if (a.earliestTime !== null && b.earliestTime !== null) {
            return a.earliestTime - b.earliestTime;
          }
          // If one has timing data and other doesn't, prioritize the one with data
          if (a.earliestTime !== null) return -1;
          if (b.earliestTime !== null) return 1;

          // Otherwise sort by percentage seen
          return b.seen - a.seen;
        })
    );
  }, [nodes, nodeBlockP2P, nodeBlockSeen, currentTime, firstContinentToSeeBlock]);

  // Show detailed view of all continents
  return (
    <div className="space-y-2.5">
      {continentData.map(continent => (
        <div key={continent.code} className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-1">
              {continent.isFirst && (
                <span title="First to see the block" className="text-[10px] mr-0.5">
                  🥇
                </span>
              )}
              {continent.name}
              {continent.earliestTime !== null && (
                <span className="text-[10px] font-mono text-tertiary ml-1">
                  {(continent.earliestTime / 1000).toFixed(2)}s
                </span>
              )}
            </div>
            <div className="font-mono">
              {continent.seen}/{continent.count}
            </div>
          </div>

          {/* Progress bar with pulse animation for active propagation */}
          <div className="h-1.5 w-full bg-surface/30 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ease-out ${
                continent.progress < 100 && continent.progress > 0 ? 'animate-pulse' : ''
              }`}
              style={{
                width: `${continent.progress}%`,
                backgroundColor: CONTINENT_COLORS[continent.code] || '#9b59b6',
              }}
            />
          </div>
        </div>
      ))}

      {/* Global propagation summary stats */}
      {continentData.length > 0 && (
        <div className="pt-1 mt-1 border-t border-subtle/10 text-xs flex justify-between text-tertiary">
          <div>
            Continents: {continentData.filter(c => c.seen > 0).length}/{continentData.length}
          </div>
          <div>
            {continentData.reduce((sum, c) => sum + c.seen, 0)}/{continentData.reduce((sum, c) => sum + c.count, 0)}{' '}
            nodes
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileContinentsPanel;
