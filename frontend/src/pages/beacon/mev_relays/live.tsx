import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
// import { useParams } from 'react-router-dom'; // Uncomment if network comes from URL params
import { getLabApiClient } from '../../../api';
import { GetSlotDataRequest } from '../../../api/gen/backend/pkg/api/proto/lab_api_pb';
import { BeaconSlotData } from '../../../api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb.js'; // Import from correct source
// import LoadingOrError from '../../../components/LoadingOrError'; // Removed unused import
import { Card, CardBody } from '../../../components/common/Card'; // Import Card components
import { MevSlotDetailView } from '../../../components/beacon/mev_relays'; // Added import
import { MultiSlotEventTimeline } from '../../../components/beacon/mev_relays/MultiSlotEventTimeline'; // Import the new timeline
import { BeaconClockManager } from '../../../utils/beacon'; // Add BeaconClockManager import

const MevRelaysLivePage: React.FC = () => {
  // TODO: Replace with actual network determination (e.g., useParams or context)
  const network = 'mainnet';

  // State for the slot calculated from the wall clock
  const [wallClockSlot, setWallClockSlot] = useState<number | null>(null);

  const [currentSlotNumber, setCurrentSlotNumber] = useState<number | null>(
    null,
  );
  const [previousSlotNumber, setPreviousSlotNumber] = useState<number | null>(null); // Add state for previous slot
  const [nextSlotNumber, setNextSlotNumber] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0); // Time in ms within the current slot

  // Periodically check the wall clock slot
  useEffect(() => {
    const checkWallClock = () => {
      try {
        const manager = BeaconClockManager.getInstance();
        const clock = manager.getBeaconClock(network);
        if (clock) {
          const currentSlot = clock.getCurrentSlot();
          setWallClockSlot(currentSlot);
          // console.log(`Wall clock slot: ${currentSlot}`); // Debug log
        } else {
          console.warn(`BeaconClock not available for network: ${network}`);
          setWallClockSlot(null); // Ensure state is null if clock is missing
        }
      } catch (error) {
        console.error("Error getting wall clock slot:", error);
        setWallClockSlot(null); // Reset on error
      }
    };

    // Run immediately on mount
    checkWallClock();

    // Set up interval to check every second
    const intervalId = setInterval(checkWallClock, 1000); // Check every 1 second

    // Cleanup function
    return () => clearInterval(intervalId);
  }, [network]); // Re-run if network changes

  // Calculate target display slots based on wall clock slot
  useEffect(() => {
    if (wallClockSlot !== null) {
      const calculatedCurrentSlot = wallClockSlot - 2; // Target slot is 2 slots behind wall clock
      const calculatedNextSlot = wallClockSlot - 1;
      const calculatedPreviousSlot = wallClockSlot - 3;

      // Set initial slots or update if there's a significant jump
      if (currentSlotNumber === null || calculatedCurrentSlot > currentSlotNumber) {
        console.log(`Updating slots based on wall clock. Wall: ${wallClockSlot}, Calculated Current: ${calculatedCurrentSlot}, Current State: ${currentSlotNumber}`);
        setCurrentSlotNumber(calculatedCurrentSlot);
        setNextSlotNumber(calculatedNextSlot);
        setPreviousSlotNumber(calculatedPreviousSlot);
        // Reset timer only on significant jumps, not initial load if timer already started somehow
        if (currentSlotNumber !== null && calculatedCurrentSlot > currentSlotNumber + 1) {
           setCurrentTime(0);
        } else if (currentSlotNumber === null) {
           // Don't reset time on initial load if it might have started from previous state
           // setCurrentTime(0); // Let the timer logic handle its own start
        }
      }
    }
  }, [wallClockSlot, currentSlotNumber]); // Depend on wallClockSlot and currentSlotNumber for comparison

  // Fetch data for the current slot
  const currentSlotQuery = useQuery({
    queryKey: ['beaconSlotData', network, currentSlotNumber],
    queryFn: async (): Promise<BeaconSlotData | null> => {
      if (!currentSlotNumber) return null;
      const client = await getLabApiClient();
      const request = new GetSlotDataRequest({
        network,
        slot: BigInt(currentSlotNumber),
      });
      // Assuming the method is getSlotData, adjust if different
      const response = await client.getSlotData(request);
      return response.data ?? null;
    },
    enabled: !!currentSlotNumber && !!network,
    staleTime: Infinity, // Data for a specific slot never changes
    gcTime: 60 * 60 * 1000, // Cache for 1 hour (gcTime is the correct prop name)
  });

  // Fetch data for the next slot
  const nextSlotQuery = useQuery({
    queryKey: ['beaconSlotData', network, nextSlotNumber],
    queryFn: async (): Promise<BeaconSlotData | null> => {
      if (!nextSlotNumber) return null;
      const client = await getLabApiClient();
      const request = new GetSlotDataRequest({
        network,
        slot: BigInt(nextSlotNumber),
      });
      // Assuming the method is getSlotData, adjust if different
      const response = await client.getSlotData(request);
      return response.data ?? null;
    },
    enabled: !!nextSlotNumber && !!network,
    staleTime: Infinity, // Data for a specific slot never changes
    gcTime: 60 * 60 * 1000, // Cache for 1 hour (gcTime is the correct prop name)
  });

  // Fetch data for the previous slot
  const previousSlotQuery = useQuery({
    queryKey: ['beaconSlotData', network, previousSlotNumber],
    queryFn: async (): Promise<BeaconSlotData | null> => {
      if (!previousSlotNumber) return null;
      const client = await getLabApiClient();
      const request = new GetSlotDataRequest({
        network,
        slot: BigInt(previousSlotNumber),
      });
      const response = await client.getSlotData(request);
      return response.data ?? null;
    },
    enabled: !!previousSlotNumber && !!network,
    staleTime: Infinity,
    gcTime: 60 * 60 * 1000,
  });


  // Simulation Timer: Increment time within the slot
  useEffect(() => {
    if (currentSlotNumber === null) return; // Don't start timer until slots are set

    const intervalId = setInterval(() => {
      setCurrentTime((prevTime) => {
        if (prevTime >= 12000) {
          clearInterval(intervalId);
          return 12000; // Cap at 12000
        }
        return prevTime + 100; // Increment by 100ms
      });
    }, 100); // Update every 100ms

    // Cleanup function
    return () => clearInterval(intervalId);
  }, [currentSlotNumber]); // Restart timer if currentSlotNumber changes

  // Slot Transition: Move to the next slot when timer reaches 12s
  useEffect(() => {
    if (currentTime >= 12000) {
      console.log(`Transitioning from slot ${currentSlotNumber} to ${nextSlotNumber}`);
      setPreviousSlotNumber(currentSlotNumber); // Old current becomes new previous
      setCurrentSlotNumber(nextSlotNumber);
      setNextSlotNumber((prev) => (prev !== null ? prev + 1 : null));
      setCurrentTime(0); // Reset timer for the new slot
    }
  }, [currentTime, currentSlotNumber, nextSlotNumber]); // Add currentSlotNumber dependency

  return (
    <div className="space-y-6">
      {/* Integrated Contextual Header */}
      <div className="mb-6 p-4 bg-surface/50 rounded-lg border border-subtle">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-xl font-sans font-bold text-primary mb-1">
              MEV Relays Live View ({network})
            </h1>
            <p className="text-sm font-mono text-secondary">
              Real-time view of MEV relay activity for the current and upcoming slots.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Placeholder for controls like network selector or refresh */}
          </div>
        </div>
      </div>

      {/* Handle initial loading state */}
      {/* Handle initial loading state based on wallClockSlot */}
      {(wallClockSlot === null || (!currentSlotNumber && !nextSlotNumber && !previousSlotNumber)) && (
        <Card>
          <CardBody>
            <div className="text-center p-4 text-secondary">Determining current slot from wall clock...</div>
          </CardBody>
        </Card>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Current Slot */}
        <div className="current-slot-view space-y-4"> {/* Renamed class for clarity */}
          <Card>
            <CardBody>
              <h2 className="text-lg font-sans font-bold text-primary mb-2">
                Current Slot Details ({currentSlotNumber ?? 'N/A'})
              </h2>
              <p className="text-sm font-mono text-secondary mb-4">
                Time in Slot: {(currentTime / 1000).toFixed(1)}s / 12s
              </p>
              {/* --- Replaced Placeholder and Debug --- */}
              <MevSlotDetailView
                slotData={currentSlotQuery.data ?? undefined} // Pass undefined if null
                slotNumber={currentSlotNumber}
                currentTime={currentTime}
                isLoading={currentSlotQuery.isLoading}
                error={currentSlotQuery.error ?? null} // Pass null if null/undefined
                isCurrentSlot={true}
              />
              {/* --- End Replacement --- */}
            </CardBody>
          </Card>
        </div>

        {/* Right Column: Next Slot */}
        <div className="next-slot-view space-y-4"> {/* Renamed class for clarity */}
          <Card>
            <CardBody>
              <h2 className="text-lg font-sans font-bold text-primary mb-2">
                Next Slot Preview ({nextSlotNumber ?? 'N/A'})
              </h2>
              {/* --- Replaced Placeholder and Debug --- */}
              <MevSlotDetailView
                slotData={nextSlotQuery.data ?? undefined} // Pass undefined if null
                slotNumber={nextSlotNumber}
                currentTime={currentTime} // Pass timer, though less relevant here
                isLoading={nextSlotQuery.isLoading}
                error={nextSlotQuery.error ?? null} // Pass null if null/undefined
                isCurrentSlot={false}
              />
              {/* --- End Replacement --- */}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Full Width Section: Timeline */}
      <div className="timeline-placeholder mt-6">
        <Card>
          <CardBody>
            <h2 className="text-lg font-sans font-bold text-primary mb-2">
              Event Timeline
            </h2>
            {/* --- Replace Placeholder with Actual Component --- */}
            <MultiSlotEventTimeline
                previousSlotData={previousSlotQuery.data}
                currentSlotData={currentSlotQuery.data}
                nextSlotData={nextSlotQuery.data}
                currentTime={currentTime}
                currentSlotNumber={currentSlotNumber}
            />
            {/* --- End Replacement --- */}
          </CardBody>
        </Card>
      </div>

      {/* Existing Debug Info (Optional - can be removed later) */}
      <Card>
        <CardBody>
          <h2 className="text-lg font-sans font-bold text-primary mb-2">Debug Info</h2>
          <p className="text-sm font-mono text-secondary">Wall Clock Slot: {wallClockSlot ?? 'Loading...'}</p>
          <p className="text-sm font-mono text-secondary">Previous Slot: {previousSlotNumber ?? 'N/A'}</p> {/* Added Previous Slot */}
          <p className="text-sm font-mono text-secondary">Current Slot: {currentSlotNumber ?? 'N/A'}</p>
          <p className="text-sm font-mono text-secondary">Next Slot: {nextSlotNumber ?? 'N/A'}</p>
          <p className="text-sm font-mono text-secondary">Time in Slot: {(currentTime / 1000).toFixed(1)}s / 12s</p>
        </CardBody>
      </Card>

    </div>
  );
};

export default MevRelaysLivePage;