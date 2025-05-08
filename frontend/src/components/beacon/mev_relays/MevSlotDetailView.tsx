import React, { useMemo } from 'react';
import { Card, CardBody } from '../../common/Card';
import { LoadingState } from '../../common/LoadingState';
import { ErrorState } from '../../common/ErrorState';
import {
  BeaconSlotData,
  RelayBid, // Import RelayBid
  DeliveredPayload, // Import DeliveredPayload
  RelayBids, // Import RelayBids wrapper type
  DeliveredPayloads, // Import DeliveredPayloads wrapper type
  SlimTimings, // Import SlimTimings
} from '@/api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb';
import { SlotTimer } from './SlotTimer';
import ProposerInfoDisplay from './ProposerInfoDisplay';
import HighestBidDisplay from './HighestBidDisplay';
import BidListComponent from './BidListComponent';
import { DeliveredPayloadInfo } from './DeliveredPayloadInfo'; // Use named import
import { SlotTimingBreakdown } from './SlotTimingBreakdown'; // Changed to named import
import useBeacon from '@/contexts/beacon';

interface MevSlotDetailViewProps {
  slotData: BeaconSlotData | null | undefined;
  slotNumber: number | null;
  currentTime: number;
  isCurrentSlot: boolean;
  isLoading: boolean;
  error: Error | null;
}

export const MevSlotDetailView: React.FC<MevSlotDetailViewProps> = ({
  slotData,
  slotNumber,
  currentTime,
  isCurrentSlot,
  isLoading,
  error,
}) => {
  const { getBeaconClock } = useBeacon();
  const renderContent = () => {
    if (isLoading) {
      return <LoadingState />;
    }
    if (error) {
      return <ErrorState error={error} />;
    }
    if (!slotData) {
      return <p className="text-secondary">No data available for this slot.</p>;
    }

    // Destructure fields from slotData
    const { proposer, entity, relayBids, deliveredPayloads, timings } = slotData;

    // Add explicit types here to satisfy ESLint for imported types
    const typedRelayBids: { [key: string]: RelayBids } | undefined = relayBids;
    const typedDeliveredPayloads: { [key: string]: DeliveredPayloads } | undefined =
      deliveredPayloads;
    const typedTimings: SlimTimings | undefined = timings;

    // Prepare flattened bids array with explicit type
    const allBids: RelayBid[] = useMemo(() => {
      return Object.values(typedRelayBids || {}).flatMap(rb => rb.bids || []);
    }, [typedRelayBids]);

    // Prepare the single delivered payload with explicit type
    const actualDeliveredPayload: DeliveredPayload | null = useMemo(() => {
      // Find the first DeliveredPayloads wrapper that has payloads
      const payloadWrapper = Object.values(typedDeliveredPayloads || {}).find(
        dp => dp.payloads?.length > 0,
      );
      // Return the first payload from that wrapper, or null
      return payloadWrapper?.payloads?.[0] || null; // Removed duplicate declaration
    }, [typedDeliveredPayloads]);

    const slotStartTime = useMemo(() => {
      if (!slotData?.network || slotNumber === null || slotNumber === undefined) {
        return undefined;
      }
      const clock = getBeaconClock(slotData.network);
      return clock ? clock.getSlotStartTime(slotNumber) : undefined;
    }, [slotData?.network, slotNumber]);

    return (
      <div className="space-y-4">
        {/* Pass props to child components using correct data fields */}
        {isCurrentSlot && <SlotTimer currentTime={currentTime} />}
        <ProposerInfoDisplay proposerIndex={proposer?.proposerValidatorIndex} entity={entity} />
        {/* Pass prepared data to HighestBidDisplay */}
        <HighestBidDisplay
          bids={allBids}
          deliveredPayload={actualDeliveredPayload}
          currentTime={currentTime}
        />
        {/* Pass prepared bids to BidListComponent */}
        <BidListComponent
          bids={allBids}
          deliveredPayload={actualDeliveredPayload} // Pass the delivered payload
          currentTime={currentTime}
          // Pass the calculated slotStartTime
          slotStartTime={slotStartTime}
        />
        {/* Pass prepared payload to DeliveredPayloadInfo */}
        <DeliveredPayloadInfo deliveredPayload={actualDeliveredPayload} />
        {/* Pass typed timings to SlotTimingBreakdown */}
        <SlotTimingBreakdown timings={typedTimings} currentTime={currentTime} />
      </div>
    );
  };

  return (
    <Card>
      <CardBody>
        <h3 className="text-xl font-sans font-bold mb-4">
          Slot Details {slotNumber !== null ? `(${slotNumber})` : ''}
          {isCurrentSlot && (
            <span className="ml-2 text-xs text-green-400 font-normal">(Current)</span>
          )}
        </h3>
        {renderContent()}
      </CardBody>
    </Card>
  );
};

export default MevSlotDetailView;
