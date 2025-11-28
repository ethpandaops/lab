import { type JSX, memo } from 'react';
import { SlotProgressTimeline } from '@/components/Ethereum/SlotProgressTimeline';
import type { BlockDetailsCardProps } from './BlockDetailsCard.types';

function BlockDetailsCardComponent({
  data: _data,
  currentTime,
  slotProgressPhases,
}: BlockDetailsCardProps): JSX.Element {
  return (
    <div className="h-full">
      <SlotProgressTimeline phases={slotProgressPhases} mode="live" currentTime={currentTime} showStats={true} />
    </div>
  );
}

// Custom comparison function to prevent re-renders when data hasn't changed
const arePropsEqual = (prevProps: BlockDetailsCardProps, nextProps: BlockDetailsCardProps): boolean => {
  return (
    prevProps.data === nextProps.data &&
    prevProps.currentTime === nextProps.currentTime &&
    prevProps.slotProgressPhases === nextProps.slotProgressPhases
  );
};

export const BlockDetailsCard = memo(BlockDetailsCardComponent, arePropsEqual);
