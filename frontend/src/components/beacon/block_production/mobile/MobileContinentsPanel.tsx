import React from 'react';
import { Node } from '@/api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb';

// Map of continent codes to colors
const CONTINENT_COLORS: Record<string, string> = {
  'EU': '#34A853', // Green for Europe
  'NA': '#4285F4', // Blue for North America
  'AS': '#FBBC05', // Yellow for Asia
  'OC': '#EA4335', // Red for Oceania
  'SA': '#9C27B0', // Purple for South America
  'AF': '#FF9800', // Orange for Africa
  'AN': '#00BCD4'  // Cyan for Antarctica
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
  firstContinentToSeeBlock
}) => {
  // Group nodes by continent
  const continentData = React.useMemo(() => {
    // Map of continent names to their full names for better display
    const continentFullNames: Record<string, string> = {
      'NA': 'North America',
      'SA': 'South America',
      'EU': 'Europe',
      'AS': 'Asia',
      'AF': 'Africa',
      'OC': 'Oceania',
      'AN': 'Antarctica'
    };
    
    const continentsMap: Record<string, {
      count: number;
      nodesThatHaveSeenBlock: number;
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
          nodesThatHaveSeenBlock: 0 
        };
      }
      
      continentsMap[continentCode].count += 1;
      
      // Check if this node has seen the block by current time
      const p2pTime = nodeBlockP2P[nodeId];
      const apiTime = nodeBlockSeen[nodeId];
      const hasSeen = 
        (typeof p2pTime === 'number' && p2pTime <= currentTime) ||
        (typeof apiTime === 'number' && apiTime <= currentTime);
        
      if (hasSeen) {
        continentsMap[continentCode].nodesThatHaveSeenBlock += 1;
      }
    });

    return Object.entries(continentsMap).map(([code, data]) => ({
      name: continentFullNames[code] || code,
      code,
      count: data.count,
      seen: data.nodesThatHaveSeenBlock,
      progress: data.count > 0 ? (data.nodesThatHaveSeenBlock / data.count) * 100 : 0
    })).sort((a, b) => b.seen - a.seen);
  }, [nodes, nodeBlockP2P, nodeBlockSeen, currentTime]);

  return (
    <div className="space-y-2">
      {continentData.slice(0, 4).map(continent => (
        <div key={continent.code} className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <div>{continent.name}</div>
            <div className="font-mono">{continent.seen}/{continent.count}</div>
          </div>
          <div className="h-1.5 w-full bg-surface/30 rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-500 ease-out"
              style={{
                width: `${continent.progress}%`,
                backgroundColor: CONTINENT_COLORS[continent.code] || '#9b59b6'
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

export default MobileContinentsPanel;