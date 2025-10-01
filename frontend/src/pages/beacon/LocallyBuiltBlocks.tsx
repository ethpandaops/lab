import { useState, useEffect, useMemo } from 'react';
import { useNetwork, useConfig } from '@/stores/appStore';
import { usePreparedBlocks } from '@/hooks/usePreparedBlocks';
import { useExperimentConfig } from '@/hooks/useExperimentConfig';
import {
  LocallyBuiltSlotBlocks,
  LocallyBuiltBlock,
} from '@/api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb';
import {
  LocallyBuiltBlocksDetail,
  UnifiedBlocksTimeline,
} from '@/components/beacon/LocallyBuiltBlocks';
import { ChevronLeft, Clock, AlertCircle } from 'lucide-react';
import useBeacon from '@/contexts/beacon';
import { extractSlotBounds } from '@/types/slot';

const SLOTS_TO_FETCH = 7; // Number of slots to fetch for REST API (matches UI display)

export function LocallyBuiltBlocks() {
  const { selectedNetwork } = useNetwork();
  const { config } = useConfig();
  const [selectedBlock, setSelectedBlock] = useState<LocallyBuiltBlock | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [currentSlot, setCurrentSlot] = useState<number | null>(null);
  const { getBeaconClock } = useBeacon();

  // Fetch experiment config to get data availability bounds
  const { data: experimentConfig, isLoading: isLoadingConfig } = useExperimentConfig(
    'locally-built-blocks',
    {
      refetchInterval: 10_000,
      staleTime: 10_000,
    },
  );

  // Extract slot bounds from experiment config
  const slotBounds = useMemo(() => {
    if (!experimentConfig) return null;
    return extractSlotBounds(experimentConfig, selectedNetwork);
  }, [experimentConfig, selectedNetwork]);

  // Calculate slots to fetch based on experiment config and current slot
  const slotsToFetch = useMemo(() => {
    if (!slotBounds) return [];

    // Use maxSlot as the latest available slot
    const latestAvailableSlot = slotBounds.maxSlot;

    if (latestAvailableSlot === 0) {
      // If we don't have data availability info yet, fall back to current slot
      if (!currentSlot) return [];
      const slots: number[] = [];
      for (let i = 0; i < SLOTS_TO_FETCH; i++) {
        const slot = currentSlot - i;
        if (slot >= 0) slots.push(slot);
      }
      return slots;
    }

    // Fetch the most recent N slots within the available range
    const slots: number[] = [];
    for (let i = 0; i < SLOTS_TO_FETCH; i++) {
      const slot = latestAvailableSlot - i;
      if (slot >= slotBounds.minSlot) {
        slots.push(slot);
      }
    }
    return slots;
  }, [slotBounds, currentSlot]);

  // Check if this experiment is available for the current network
  const isExperimentAvailable = () => {
    if (!config?.experiments) return true;
    const experiment = config.experiments.find(exp => exp.id === 'locally-built-blocks');
    return experiment?.enabled && experiment?.networks?.includes(selectedNetwork);
  };

  // Get the networks that support this experiment
  const getSupportedNetworks = () => {
    if (!config?.experiments) return [];
    const experiment = config.experiments.find(exp => exp.id === 'locally-built-blocks');
    return experiment?.enabled ? experiment?.networks || [] : [];
  };

  // Use the unified hook - it will automatically choose between REST and gRPC
  const { data, isLoading, refetch } = usePreparedBlocks({
    network: selectedNetwork,
    slots: slotsToFetch, // Always provide slots (REST needs them, gRPC ignores them)
    enabled: isExperimentAvailable() && !selectedBlock && slotsToFetch.length > 0,
  });

  // Update current slot from wallclock
  useEffect(() => {
    const clock = getBeaconClock(selectedNetwork);
    if (!clock) return;

    const updateSlot = () => {
      const slot = clock.getCurrentSlot();
      setCurrentSlot(slot);
    };

    updateSlot();
    const interval = setInterval(updateSlot, 1000);
    return () => clearInterval(interval);
  }, [selectedNetwork, getBeaconClock]);

  // Update last updated time when data changes
  useEffect(() => {
    if (data) {
      setLastUpdated(new Date());
    }
  }, [data]);

  // Format the last updated time
  const formatLastUpdated = () => {
    return lastUpdated.toLocaleTimeString();
  };

  // Show loading state while configuration is being fetched
  if (isLoadingConfig) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="text-sm font-mono text-secondary">Loading configuration...</div>
        </div>
      </div>
    );
  }

  // Show not available message if experiment isn't enabled
  if (!isExperimentAvailable()) {
    const supportedNetworks = getSupportedNetworks();
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-md mx-auto">
          <AlertCircle className="w-12 h-12 text-accent/60 mx-auto mb-4" />
          <h2 className="text-xl font-sans font-bold text-primary mb-2">
            Experiment Not Available
          </h2>
          <p className="text-sm font-mono text-secondary mb-4">
            Locally Built Blocks is not enabled for {selectedNetwork}
          </p>
          {supportedNetworks.length > 0 && (
            <p className="text-xs font-mono text-tertiary">
              Available on: {supportedNetworks.join(', ')}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Show message if no data is available yet
  if (!slotBounds || slotBounds.maxSlot === 0) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-md mx-auto">
          <AlertCircle className="w-12 h-12 text-accent/60 mx-auto mb-4" />
          <h2 className="text-xl font-sans font-bold text-primary mb-2">No Data Available</h2>
          <p className="text-sm font-mono text-secondary mb-4">
            No prepared blocks data is available for {selectedNetwork} yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {selectedBlock ? (
        // Detail View
        <div className="space-y-4">
          <div>
            <button
              onClick={() => setSelectedBlock(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface/40 hover:bg-surface/60 rounded-md text-tertiary hover:text-primary transition-all duration-200"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm font-mono">Back to overview</span>
            </button>
          </div>
          <LocallyBuiltBlocksDetail block={selectedBlock} />
        </div>
      ) : (
        // Overview View
        <>
          {/* Header */}
          <div className="mb-6 p-4 bg-surface/50 rounded-lg border border-subtle">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-sans font-bold text-primary mb-1">
                  Locally Built Blocks
                </h2>
                <p className="text-sm font-mono text-secondary max-w-3xl">
                  Blocks locally built by sentry nodes (not necessarily canonical/broadcasted).
                  Useful for analyzing client block building capabilities based on mempool contents.
                </p>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-subtle/50 flex flex-wrap gap-x-4 gap-y-2 text-xs font-mono text-tertiary">
              <div className="flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-accent/70" />
                <span>Last updated: {formatLastUpdated()}</span>
              </div>
            </div>
          </div>

          {/* Unified Blocks Timeline */}
          <UnifiedBlocksTimeline
            data={data || []}
            isLoading={isLoading}
            onSelectBlock={setSelectedBlock}
            currentSlot={currentSlot}
          />
        </>
      )}
    </div>
  );
}
