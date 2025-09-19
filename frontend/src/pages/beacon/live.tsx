import { useEffect, useState } from 'react';
import { SlotView } from '@/components/beacon/SlotView';
import useNetwork from '@/contexts/network';
import useBeacon from '@/contexts/beacon';
import useConfig from '@/contexts/config';
import { AlertCircle } from 'lucide-react';

function BeaconLive() {
  const { selectedNetwork } = useNetwork();
  const { config } = useConfig();
  const [currentSlot, setCurrentSlot] = useState<number>();
  const { getBeaconClock, getHeadLagSlots } = useBeacon();

  // Check if this experiment is available for the current network
  const isExperimentAvailable = () => {
    if (!config?.experiments) return true; // Default to available if no config
    const experiment = config.experiments.find(exp => exp.id === 'live-slots');
    return experiment?.enabled && experiment?.networks?.includes(selectedNetwork);
  };

  // Get the networks that support this experiment
  const getSupportedNetworks = () => {
    if (!config?.experiments) return [];
    const experiment = config.experiments.find(exp => exp.id === 'live-slots');
    return experiment?.enabled ? experiment?.networks || [] : [];
  };

  // Get the BeaconClock for the current network
  const clock = getBeaconClock(selectedNetwork);
  const headLagSlots = getHeadLagSlots(selectedNetwork);

  // Initialize and update current slot
  useEffect(() => {
    if (!clock) return;

    // Calculate current slot with head lag plus one extra slot for processing
    const currentClockSlot = clock.getCurrentSlot();
    const slot = currentClockSlot - (headLagSlots + 2); // Add extra slot of lag
    setCurrentSlot(slot);

    // Calculate when this slot ends
    const slotEndTime = clock.getSlotEndTime(currentClockSlot);
    const now = Math.floor(Date.now() / 1000);
    const timeUntilNext = (slotEndTime - now) * 1000; // Convert to ms

    // Schedule update for next slot
    const timer = setTimeout(() => {
      setCurrentSlot(slot + 1);
    }, timeUntilNext);

    return () => clearTimeout(timer);
  }, [clock, headLagSlots]);

  // Handle slot completion
  const handleSlotComplete = () => {
    if (currentSlot !== undefined) {
      setCurrentSlot(currentSlot + 1);
    }
  };

  // Show not available message if experiment isn't enabled for this network
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
            Live Slots is not enabled for {selectedNetwork}
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

  return (
    <div className="space-y-6">
      {currentSlot !== undefined && (
        <SlotView
          slot={currentSlot}
          network={selectedNetwork}
          isLive={true}
          onSlotComplete={handleSlotComplete}
        />
      )}
    </div>
  );
}

export { BeaconLive };
