import { type JSX, useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import type { SlotTimelineProps } from './SlotTimeline.types';
import type { ParsedBlock } from '../../hooks';
import { useInterval } from '@/hooks/useInterval';
import { BlockDetailsModal } from '../BlockDetailsModal';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import styles from './SlotTimeline.module.css';

/**
 * Formats a timestamp to a relative time string (e.g., "2m ago")
 */
function formatRelativeTime(timestamp: number, now: number): string {
  const diff = now - timestamp;

  if (diff < 60) return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

/**
 * Displays a timeline matrix with slots as columns and clients as rows
 * Each cell shows how many blocks that client built in that slot
 */
export function SlotTimeline({
  slotGroups,
  allExecutionClients,
  allConsensusClients,
  blockCountMap,
  maxBlockCount,
}: SlotTimelineProps): JSX.Element {
  // Track current time for live relative time updates
  const [now, setNow] = useState(() => Date.now() / 1000);

  // Track new slots for flash animation
  const [newSlots, setNewSlots] = useState<Set<number>>(new Set());
  const prevSlotsRef = useRef<Set<number>>(new Set());

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [selectedIsExecution, setSelectedIsExecution] = useState<boolean>(false);
  const [selectedBlocks, setSelectedBlocks] = useState<ParsedBlock[]>([]);

  // Update current time every second for live countdown
  useInterval(() => {
    setNow(Date.now() / 1000);
  }, 1000);

  // Handle cell click to open modal
  const handleCellClick = (slot: number, client: string, isExecution: boolean, blocks: ParsedBlock[]): void => {
    setSelectedSlot(slot);
    setSelectedClient(client);
    setSelectedIsExecution(isExecution);
    setSelectedBlocks(blocks);
    setModalOpen(true);
  };

  const handleCloseModal = (): void => {
    setModalOpen(false);
    setSelectedSlot(null);
    setSelectedClient(null);
    setSelectedBlocks([]);
  };

  // Detect new slots when data updates
  useEffect(() => {
    const currentSlots = new Set(slotGroups.map(g => g.slot));
    const previousSlots = prevSlotsRef.current;

    // On first render, just initialize without marking as new
    if (previousSlots.size === 0) {
      prevSlotsRef.current = currentSlots;
      return;
    }

    // Find slots that are in current but not in previous (new slots)
    const newSlotNumbers = new Set(Array.from(currentSlots).filter(slot => !previousSlots.has(slot)));

    if (newSlotNumbers.size > 0) {
      setNewSlots(newSlotNumbers);

      // Clear the "new" flag after animation completes (4 seconds)
      const timeout = setTimeout(() => {
        setNewSlots(new Set());
      }, 4000);

      // Update previous slots reference
      prevSlotsRef.current = currentSlots;

      return () => clearTimeout(timeout);
    }

    // Update previous slots reference even when no new slots
    prevSlotsRef.current = currentSlots;
  }, [slotGroups]);

  if (slotGroups.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 text-center">
        <p className="text-muted">No slots found</p>
      </div>
    );
  }

  /**
   * Get color intensity based on count relative to max
   */
  const getIntensity = (count: number): string => {
    if (count === 0) return 'bg-background border-border text-muted';
    const ratio = count / maxBlockCount;
    if (ratio >= 0.8) return 'bg-primary/90 text-white border-primary';
    if (ratio >= 0.6) return 'bg-primary/70 text-white border-primary';
    if (ratio >= 0.4) return 'bg-primary/50 text-foreground border-primary';
    if (ratio >= 0.2) return 'bg-primary/30 text-foreground border-primary';
    return 'bg-primary/10 text-foreground border-primary';
  };

  /**
   * Get block count from pre-computed map
   */
  const getBlockCount = (slot: number, client: string, isExecution: boolean): number => {
    const key = `${slot}:${client}:${isExecution}`;
    return blockCountMap.get(key) || 0;
  };

  return (
    <div className="space-y-4">
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-block h-4 w-1 rounded-full bg-primary"></span>
        <h2 className="text-sm font-medium text-muted">Timeline</h2>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface">
        <div className="inline-block min-w-full p-4">
          {/* Slot headers */}
          <div className="mb-4 flex gap-0.5">
            <div className="w-28 shrink-0" /> {/* Empty corner for client labels */}
            {slotGroups.map(group => {
              const isNew = newSlots.has(group.slot);
              return (
                <div
                  key={group.slot}
                  className={clsx(
                    'flex min-w-20 flex-1 flex-col items-center gap-0.5 px-1',
                    isNew && styles.newBlockAnimation
                  )}
                >
                  <div
                    className={clsx(
                      'rounded-sm px-1.5 py-0.5 text-xs font-medium',
                      isNew ? 'bg-primary text-white' : 'bg-primary/20 text-foreground'
                    )}
                  >
                    {group.blocks.length}
                  </div>
                  <div className="text-xs font-medium text-foreground">Slot {group.slot.toLocaleString()}</div>
                  <div className="text-xs text-muted">{formatRelativeTime(group.slotStartDateTime, now)}</div>
                </div>
              );
            })}
          </div>

          {/* Execution Clients Section */}
          {allExecutionClients.length > 0 && (
            <div className="space-y-0.5">
              <div className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Execution Clients</div>
              {allExecutionClients.map(client => (
                <div key={client} className="flex gap-0.5">
                  <div className="flex w-28 shrink-0 items-center gap-2 text-xs font-medium text-foreground">
                    <ClientLogo client={client} size={16} />
                    <span>{client}</span>
                  </div>
                  {slotGroups.map(group => {
                    const count = getBlockCount(group.slot, client, true);
                    const isNew = newSlots.has(group.slot);
                    return (
                      <button
                        type="button"
                        key={`${client}-${group.slot}`}
                        onClick={() => handleCellClick(group.slot, client, true, group.blocks)}
                        className={clsx(
                          'flex min-w-20 flex-1 items-center justify-center rounded-sm border text-sm font-medium',
                          'h-10 transition-all',
                          count > 0
                            ? 'cursor-pointer hover:scale-105 hover:shadow-md'
                            : 'cursor-not-allowed opacity-50',
                          getIntensity(count),
                          isNew && styles.newBlockAnimation
                        )}
                        title={`${client}: ${count} block${count !== 1 ? 's' : ''} in slot ${group.slot}`}
                        disabled={count === 0}
                      >
                        {count > 0 && count}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          )}

          {/* Consensus Clients Section */}
          <div className="mt-6 space-y-0.5">
            <div className="mb-2 text-xs font-semibold tracking-wide text-muted uppercase">Consensus Clients</div>
            {allConsensusClients.map(client => (
              <div key={client} className="flex gap-0.5">
                <div className="flex w-28 shrink-0 items-center gap-2 text-xs font-medium text-foreground">
                  <ClientLogo client={client} size={16} />
                  <span>{client}</span>
                </div>
                {slotGroups.map(group => {
                  const count = getBlockCount(group.slot, client, false);
                  const isNew = newSlots.has(group.slot);
                  return (
                    <button
                      type="button"
                      key={`${client}-${group.slot}`}
                      onClick={() => handleCellClick(group.slot, client, false, group.blocks)}
                      className={clsx(
                        'flex min-w-20 flex-1 items-center justify-center rounded-sm border text-sm font-medium',
                        'h-10 transition-all',
                        count > 0 ? 'cursor-pointer hover:scale-105 hover:shadow-md' : 'cursor-not-allowed opacity-50',
                        getIntensity(count),
                        isNew && styles.newBlockAnimation
                      )}
                      title={`${client}: ${count} block${count !== 1 ? 's' : ''} in slot ${group.slot}`}
                      disabled={count === 0}
                    >
                      {count > 0 && count}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Block Details Modal */}
      {selectedSlot !== null && selectedClient !== null && (
        <BlockDetailsModal
          open={modalOpen}
          onClose={handleCloseModal}
          slot={selectedSlot}
          client={selectedClient}
          isExecutionClient={selectedIsExecution}
          blocks={selectedBlocks}
        />
      )}
    </div>
  );
}
