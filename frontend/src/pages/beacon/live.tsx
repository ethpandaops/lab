import { SlotView } from '@/components/beacon/SlotView';
import { useNetwork } from '@/stores/appStore';
import { useSlotState } from '@/hooks/useSlot';
import { useSlotDataWithPreload } from '@/hooks/useSlotDataWithPreload';

function BeaconLive() {
  const { selectedNetwork } = useNetwork();
  const { currentSlot } = useSlotState();

  useSlotDataWithPreload(selectedNetwork);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-hidden">
        <SlotView slot={currentSlot} network={selectedNetwork} isLive={true} />
      </div>
    </div>
  );
}

export { BeaconLive };
