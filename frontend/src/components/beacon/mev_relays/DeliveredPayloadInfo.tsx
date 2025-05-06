import React from 'react'; // Removed unused useMemo
import { DeliveredPayload } from '@/api/gen/backend/pkg/server/proto/beacon_slots/beacon_slots_pb'; // Corrected path
// Removed unused formatEther, formatDuration

interface DeliveredPayloadInfoProps {
  deliveredPayload: DeliveredPayload | null | undefined;
  // Removed currentTime and slotStartTime as they are no longer used
}

export const DeliveredPayloadInfo: React.FC<DeliveredPayloadInfoProps> = ({
  deliveredPayload,
  // Removed unused currentTime prop
}) => {
  // Display if the payload object exists
  if (!deliveredPayload) {
    // Render nothing or a placeholder if desired, but null is cleaner if parent handles placeholder
    return null;
    // return <div className="text-xs font-mono text-muted mt-2">Awaiting Payload Delivery...</div>;
  }

  // No need for useMemo based on time anymore

  return (
    <div className="border border-success/50 rounded p-2 bg-success/5 mt-2 text-sm font-mono">
      <div className="text-primary font-medium mb-1">Delivered Payload Info</div>
      <div className="text-secondary">
        Block Hash:{' '}
        <span className="text-primary">
          {deliveredPayload.blockHash.substring(0, 10)}...
          {deliveredPayload.blockHash.substring(deliveredPayload.blockHash.length - 8)}
        </span>
      </div>
      <div className="text-secondary">
        Proposer:{' '}
        <span className="text-primary">{deliveredPayload.proposerPubkey.substring(0, 10)}...</span>
      </div>
    </div>
  );
};
