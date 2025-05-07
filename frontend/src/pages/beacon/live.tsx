import { useEffect, useState } from 'react';
import { SlotView } from '@/components/beacon/SlotView';
import { useSearchParams } from 'react-router-dom';
import useNetwork from '@/contexts/network';
import useBeacon from '@/contexts/beacon';

function BeaconLive() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedNetwork } = useNetwork();
  const [currentSlot, setCurrentSlot] = useState<number>();
  const { getBeaconClock, getHeadLagSlots } = useBeacon();

  // Get the BeaconClock for the current network
  const clock = getBeaconClock(selectedNetwork);
  const headLagSlots = getHeadLagSlots(selectedNetwork);

  // Update URL when network changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set('network', selectedNetwork);
    setSearchParams(params);
  }, [selectedNetwork, setSearchParams, searchParams]);

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
