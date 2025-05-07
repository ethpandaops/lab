import { useContext } from 'react';
import { useParams } from 'react-router-dom';
import { SlotView } from '@/components/beacon/SlotView';
import NetworkContext from '@/contexts/NetworkContext';
import { AboutThisData } from '@/components/common/AboutThisData';

function BeaconSlot(): JSX.Element {
  const { slot } = useParams<{ slot: string }>();
  const { selectedNetwork } = useContext(NetworkContext);

  return (
    <div className="space-y-6">
      {/* Slot View */}
      <SlotView
        slot={slot ? parseInt(slot, 10) : undefined}
        network={selectedNetwork}
        isLive={false}
      />
    </div>
  );
}

export { BeaconSlot };
