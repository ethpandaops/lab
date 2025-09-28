import { FC, useEffect, useState } from 'react';
import {
  LocallyBuiltSlotBlocks,
  LocallyBuiltBlock,
} from '@/api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb';
import { Clock, Database, Server, FileText, Zap } from 'lucide-react';
import { formatBytes } from '@/utils/format.ts';
import { Timestamp } from '@bufbuild/protobuf';

// Simple timestamp formatter component
const FormattedTimestamp: FC<{ timestamp?: Timestamp }> = ({ timestamp }) => {
  if (!timestamp) return <span className="text-tertiary">-</span>;

  const date = timestamp.toDate();
  const relativeTime = getRelativeTimeStr(date);

  return <span title={date.toLocaleString()}>{relativeTime}</span>;
};

// Helper function to get relative time
const getRelativeTimeStr = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHour = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHour / 24);

  if (diffSec < 5) {
    return 'just now';
  } else if (diffSec < 60) {
    return `${diffSec}s ago`;
  } else if (diffMin < 60) {
    return `${diffMin}m ago`;
  } else if (diffHour < 24) {
    return `${diffHour}h ago`;
  } else if (diffDay < 30) {
    return `${diffDay}d ago`;
  } else {
    return date.toLocaleDateString();
  }
};

interface BlocksTimelineProps {
  data: LocallyBuiltSlotBlocks[];
  isLoading: boolean;
  onSelectBlock?: (block: LocallyBuiltBlock) => void;
}

export const BlocksTimeline: FC<BlocksTimelineProps> = ({ data, isLoading, onSelectBlock }) => {
  const [timelineBlocks, setTimelineBlocks] = useState<{ block: LocallyBuiltBlock; isPending: boolean }[]>([]);

  // Process the most recent blocks for the timeline
  useEffect(() => {
    if (isLoading || data.length === 0) return;

    // Sort data by slot (most recent first)
    const sortedData = [...data].sort((a, b) => Number(b.slot) - Number(a.slot));

    // Get the latest 5 slots
    const latestSlots = sortedData.slice(0, 5);

    // Get the latest blocks from each slot
    const latestBlocks = latestSlots.flatMap(slotBlock => {
      // If there are multiple blocks for this slot, pick a representative one
      // (You could also consider showing one per client or other strategies)
      return slotBlock.blocks.length > 0
        ? {
            block: slotBlock.blocks[0],
            isPending: slotBlock === sortedData[0], // Mark the most recent slot as pending
          }
        : [];
    });

    setTimelineBlocks(latestBlocks);
  }, [data, isLoading]);

  // If loading or no data
  if (isLoading || timelineBlocks.length === 0) {
    return (
      <div className="p-4 bg-surface/30 backdrop-blur-sm rounded-lg border border-subtle/30 animate-pulse">
        <div className="flex justify-between items-start">
          <div className="text-sm font-mono text-tertiary">Loading timeline...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-surface/30 backdrop-blur-sm rounded-lg border border-subtle/30">
      <div className="flex justify-between items-start mb-4">
        <div className="text-sm font-mono text-tertiary flex items-center gap-2">
          <Clock className="w-4 h-4 text-accent/70" />
          <span>Blocks timeline (most recent right)</span>
        </div>
      </div>

      <div className="flex overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-subtle scrollbar-track-transparent gap-2">
        {/* Timeline blocks */}
        <div className="flex items-center justify-end w-full gap-3">
          {/* Timeline line */}
          <div className="h-px w-full bg-subtle/50 absolute z-0" />

          {/* Blocks in reverse order (newest on right) */}
          {[...timelineBlocks].reverse().map(({ block, isPending }, index) => (
            <div
              key={`${block.slot}-${block.metadata?.metaClientName || index}`}
              className={`
                relative z-10 flex-shrink-0 w-48 
                ${isPending ? 'animate-pulse' : ''}
              `}
            >
              {/* Block node */}
              <div
                className={`
                  cursor-pointer transition-all duration-200 
                  flex flex-col items-center mb-3
                  ${isPending ? 'scale-110' : ''}
                `}
                onClick={() => onSelectBlock && onSelectBlock(block)}
              >
                <div
                  className={`
                    w-14 h-14 rounded-lg flex items-center justify-center
                    ${
                      isPending
                        ? 'bg-accent/20 border border-accent shadow-lg shadow-accent/10'
                        : 'bg-surface/70 border border-subtle/50'
                    }
                  `}
                >
                  <Database className={`w-6 h-6 ${isPending ? 'text-accent' : 'text-tertiary'}`} />
                </div>
                <div className="mt-2 text-center">
                  <div className={`font-mono text-sm ${isPending ? 'text-accent font-bold' : 'text-secondary'}`}>
                    Slot {block.slot.toString()}
                  </div>
                  <div className="font-mono text-xs text-tertiary mt-1">
                    <FormattedTimestamp timestamp={block.slotStartDateTime} />
                  </div>
                </div>
              </div>

              {/* Block metrics */}
              <div className="mt-3 bg-surface/50 backdrop-blur-sm p-3 rounded-lg border border-subtle/30 space-y-2">
                {/* Client */}
                <div className="flex items-start gap-2">
                  <Server className="w-3.5 h-3.5 text-tertiary mt-0.5" />
                  <div>
                    <div className="text-xs font-mono text-secondary">
                      {block.metadata?.metaClientName || 'Unknown'}
                    </div>
                    <div className="text-xs font-mono text-tertiary">
                      {block.metadata?.metaClientImplementation || ''}
                    </div>
                  </div>
                </div>

                {/* Transactions */}
                <div className="flex items-start gap-2">
                  <FileText className="w-3.5 h-3.5 text-tertiary mt-0.5" />
                  <div>
                    <div className="text-xs font-mono text-secondary">
                      {block.executionPayloadTransactionsCount} txs
                    </div>
                    <div className="text-xs font-mono text-tertiary">
                      {formatBytes(block.executionPayloadTransactionsTotalBytes)}
                    </div>
                  </div>
                </div>

                {/* Value */}
                <div className="flex items-start gap-2">
                  <Zap className="w-3.5 h-3.5 text-tertiary mt-0.5" />
                  <div>
                    <div className="text-xs font-mono text-secondary">
                      {(Number(block.executionPayloadValue) / 1e9).toFixed(4)} ETH
                    </div>
                    <div className="text-xs font-mono text-tertiary">block value</div>
                  </div>
                </div>
              </div>

              {/* Status label for pending block */}
              {isPending && (
                <div className="absolute -top-6 right-0">
                  <div className="bg-accent/20 text-accent px-2 py-0.5 rounded text-xs font-mono animate-pulse">
                    PENDING
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
