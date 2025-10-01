import { SlotView } from '@/components/beacon/SlotView';
import { useNetwork } from '@/stores/appStore';
import { useSlotState } from '@/hooks/useSlot';

function BeaconLive() {
  const { selectedNetwork } = useNetwork();
  const { currentSlot } = useSlotState();

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-hidden">
        <SlotView slot={currentSlot} network={selectedNetwork} isLive={true} />
      </div>
    </div>
  );
}

export { BeaconLive };
