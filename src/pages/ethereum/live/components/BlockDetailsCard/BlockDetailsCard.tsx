import { type JSX, memo } from 'react';
import { Card } from '@/components/Layout/Card';
import { SlotProgressTimeline } from '@/components/Ethereum/SlotProgressTimeline';
import type { BlockDetailsCardProps } from './BlockDetailsCard.types';

function BlockDetailsCardComponent({
  data: _data,
  currentTime,
  slotProgressPhases,
}: BlockDetailsCardProps): JSX.Element {
  return (
    <Card className="h-full p-3 md:h-44 md:p-4">
      <SlotProgressTimeline phases={slotProgressPhases} mode="live" currentTime={currentTime} showStats={true} />
    </Card>
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
