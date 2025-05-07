import { useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { SlotView } from '@/components/beacon/SlotView';
import useNetwork from '@/contexts/network';

function BeaconSlot() {
  const { slot } = useParams<{ slot: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { selectedNetwork } = useNetwork();

  // Update URL when network changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    params.set('network', selectedNetwork);
    setSearchParams(params);
  }, [selectedNetwork, setSearchParams, searchParams]);

  return (
    <div className="space-y-6">
      {/* Slot View */}
      <SlotView slot={slot ? parseInt(slot) : undefined} network={selectedNetwork} isLive={false} />
    </div>
  );
}

export { BeaconSlot };
