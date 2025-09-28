import React, { useMemo } from 'react';

interface FlowStageItem {
  id: string;
  label: string;
  color?: string;
  isWinning?: boolean;
  value?: number;
  bidCount?: number; // Added bid count for relays
  earliestTime?: number; // First time a node in this continent saw the block
  formattedTime?: string; // Formatted time string
  rank?: number; // Ranking position (1st, 2nd, 3rd)
  count?: number; // Number of nodes in the continent
  nodesThatHaveSeenBlock?: number; // Number of nodes that have seen the block
  progress?: number; // Progress percentage
  fullName?: string; // Full name (for nodes/continents)
}

interface FlowStageProps {
  title: string;
  color: string;
  isActive: boolean;
  items: FlowStageItem[];
  maxItems?: number;
  showValue?: boolean;
  stageType?: 'builder' | 'relay' | 'proposer' | 'node';
  currentTime: number; // Current time to determine visibility
}

const FlowStage: React.FC<FlowStageProps> = ({
  title,
  color,
  isActive,
  items,
  maxItems = 10,
  showValue = false,
  stageType,
  currentTime,
}) => {
  // For relays, sort alphabetically (with winning bid first)
  // For other stages, sort by value
  const displayItems = useMemo(() => {
    if (items.length <= maxItems && stageType !== 'builder') return items;

    if (stageType === 'builder') {
      // For builders, show top 10 builders by value (winning bid first)
      return [...items]
        .sort((a, b) => {
          if (a.isWinning && !b.isWinning) return -1;
          if (!a.isWinning && b.isWinning) return 1;
          return (b.value || 0) - (a.value || 0);
        })
        .slice(0, 10); // Only show top 10 builders
    } else if (stageType === 'relay') {
      // For relays, show all relays, sorted alphabetically with winning bid first
      return [...items].sort((a, b) => {
        if (a.isWinning && !b.isWinning) return -1;
        if (!a.isWinning && b.isWinning) return 1;
        return a.label.localeCompare(b.label);
      });
    } else if (stageType === 'node') {
      // For nodes, prioritize sorting by timing data (who saw the block first)
      if (items.some(item => item.earliestTime !== undefined && item.earliestTime <= currentTime)) {
        // If we have timing data for nodes that have seen the block, sort by that
        return [...items]
          .sort((a, b) => {
            const aTime = a.earliestTime !== undefined && a.earliestTime <= currentTime ? a.earliestTime : Infinity;
            const bTime = b.earliestTime !== undefined && b.earliestTime <= currentTime ? b.earliestTime : Infinity;

            // If both have no timing or timing hasn't reached current time, sort by count
            if (aTime === Infinity && bTime === Infinity) {
              return (b.count || 0) - (a.count || 0);
            }

            // Otherwise sort by earliest time
            return aTime - bTime;
          })
          .slice(0, maxItems);
      } else {
        // If no timing data yet, sort by count (highest first)
        return [...items].sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, maxItems);
      }
    } else {
      // For other stages, sort by value (highest first)
      return [...items].sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, maxItems);
    }
  }, [items, maxItems, stageType, currentTime]);

  return (
    <div className={`flex flex-col h-full transition-opacity duration-700 ${isActive ? 'opacity-100' : 'opacity-40'}`}>
      <div className="text-sm font-medium mb-1 text-primary">{title}</div>

      <div
        className={`flex-1 p-1.5 rounded-lg overflow-y-auto transition-colors duration-500 ${isActive ? 'bg-surface/30' : 'bg-surface/20'}`}
      >
        {displayItems.length > 0 ? (
          <div
            className={`${
              stageType === 'node'
                ? 'space-y-1'
                : stageType === 'relay'
                  ? 'space-y-0.5'
                  : stageType === 'builder'
                    ? 'space-y-0.25' // Even smaller spacing for builders
                    : 'space-y-1.5'
            }`}
          >
            {displayItems.map(item => (
              <div
                key={item.id}
                className={`${
                  stageType === 'node'
                    ? 'p-1.5'
                    : stageType === 'relay'
                      ? 'py-1 px-1.5'
                      : stageType === 'builder'
                        ? 'py-0.5 px-1' // Even smaller padding for builders
                        : 'p-2'
                } rounded text-xs ${
                  stageType === 'node'
                    ? `transition-opacity duration-500 ${isActive ? '' : 'opacity-70'}`
                    : item.isWinning
                      ? 'bg-gold/5'
                      : 'bg-surface/30'
                } ${isActive ? 'transition-colors duration-300 hover:bg-opacity-80' : ''}`}
                style={{
                  ...(stageType === 'node' && {
                    // Slightly deeper background color for top 3 continents, without borders
                    backgroundColor:
                      item.rank && item.rank > 0 && item.rank <= 3
                        ? `${item.color}20` // More visible background for top 3
                        : `${item.color}10`, // Light background for others
                    boxShadow: 'none', // No borders
                    marginBottom: '0.25rem', // Reduce spacing between items
                  }),
                  ...(stageType === 'builder' && {
                    backgroundColor: item.isWinning ? 'rgba(255, 215, 0, 0.05)' : 'rgba(230, 126, 34, 0.05)',
                    boxShadow: item.isWinning ? 'inset 0 0 0 1px rgba(255, 215, 0, 0.2)' : 'none',
                    marginBottom: '0.075rem', // Minimal spacing for builders to fit more
                    fontSize: '0.65rem', // Slightly smaller text to fit more builders
                  }),
                  ...(stageType === 'relay' && {
                    backgroundColor: item.isWinning ? 'rgba(255, 215, 0, 0.05)' : 'rgba(46, 204, 113, 0.05)',
                    boxShadow: item.isWinning ? 'inset 0 0 0 1px rgba(255, 215, 0, 0.2)' : 'none',
                    marginBottom: '0.125rem', // Even smaller spacing for relays
                  }),
                }}
              >
                {/* Item header - conditionally display based on type */}
                {stageType === 'builder' ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <div
                        className={`w-2 h-2 rounded-full mr-1 flex-shrink-0 ${item.isWinning ? 'opacity-70' : ''}`}
                        style={{ backgroundColor: item.color || color }}
                      ></div>
                      <div className="text-xs font-mono truncate flex-1">{item.label}</div>
                    </div>
                    <div className="text-[11px] font-mono ml-1 text-tertiary">
                      <span className={`${item.isWinning ? 'text-gold/90 font-medium' : ''}`}>
                        {item.value ? item.value.toFixed(4) : '0.0000'} ETH
                      </span>
                    </div>
                  </div>
                ) : stageType === 'relay' ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center flex-1">
                      <div
                        className={`w-2 h-2 rounded-full mr-1 flex-shrink-0 ${item.isWinning ? 'opacity-70' : ''}`}
                        style={{ backgroundColor: item.color || color }}
                      ></div>
                      <div className="text-xs truncate flex-1">{item.label}</div>
                    </div>
                    <div className="flex items-center ml-1.5">
                      <div className="text-[10px] font-mono text-tertiary">
                        {item.bidCount !== undefined
                          ? `${item.bidCount} bid${item.bidCount !== 1 ? 's' : ''}`
                          : '0 bids'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {stageType !== 'node' && (
                        <div
                          className={`w-2.5 h-2.5 rounded-full mr-1.5 flex-shrink-0 ${item.isWinning ? 'opacity-70' : ''}`}
                          style={{ backgroundColor: item.color || color }}
                        ></div>
                      )}
                      {stageType === 'node' ? (
                        <div className="font-medium">{item.fullName || item.label}</div>
                      ) : (
                        <div className="font-medium truncate">{item.label}</div>
                      )}
                    </div>
                  </div>
                )}

                {/* For node items - super compact display with medal rankings */}
                {stageType === 'node' && (
                  <div className="mt-0.5">
                    {/* Single-line compact display with fixed height */}
                    <div className="flex justify-between items-center mb-0.5 h-5">
                      {/* Medal + Time */}
                      <div className="flex items-center gap-1 min-w-0">
                        {/* Medal for top 3 - always reserve space */}
                        <span className="text-[11px] mr-0.5 w-4 flex justify-center">
                          {item.rank &&
                          item.rank > 0 &&
                          item.rank <= 3 &&
                          item.earliestTime &&
                          item.earliestTime <= currentTime
                            ? item.rank === 1
                              ? '🥇'
                              : item.rank === 2
                                ? '🥈'
                                : '🥉'
                            : ''}
                        </span>

                        {/* Time pill with fixed height/width */}
                        <span className="font-mono text-[10px] font-medium bg-gray-800/40 px-1 py-0.5 rounded min-w-[40px] text-center">
                          {item.earliestTime && item.earliestTime <= currentTime && item.formattedTime
                            ? item.formattedTime
                            : 'Waiting...'}
                        </span>
                      </div>

                      {/* Node count - fixed width */}
                      <div className="text-[10px] font-medium min-w-[60px] text-right">
                        Seen:
                        <span
                          className={`font-mono ml-1 ${
                            !isActive
                              ? 'text-tertiary/50'
                              : item.nodesThatHaveSeenBlock && item.nodesThatHaveSeenBlock > 0
                                ? 'text-white'
                                : ''
                          }`}
                        >
                          {item.nodesThatHaveSeenBlock}/{item.count}
                        </span>
                      </div>
                    </div>

                    {/* Thin progress bar - fixed height */}
                    <div className="h-[2px] w-full bg-gray-200/10 rounded-full overflow-hidden">
                      <div
                        className="h-full transition-width duration-700 ease-out"
                        style={{
                          width: `${item.progress || 0}%`,
                          backgroundColor: item.color,
                        }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Show value for other stages */}
                {stageType !== 'relay' &&
                  stageType !== 'builder' &&
                  stageType !== 'node' &&
                  showValue &&
                  item.value !== undefined && (
                    <div className="mt-1.5 text-[11px] font-mono text-tertiary">Value: {item.value.toFixed(6)} ETH</div>
                  )}
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-xs text-tertiary">
            {isActive ? 'No items yet' : 'Waiting...'}
          </div>
        )}
      </div>
    </div>
  );
};

export default FlowStage;
