import { memo } from 'react';
import { GlobalMap } from '@/components/beacon/GlobalMap';

interface BlockEvent {
  type: 'block_seen';
  time: number;
  node: string;
  source: 'p2p' | 'api';
}

interface SlotViewMapProps {
  nodes: Record<string, any>;
  currentTime: number;
  blockEvents: BlockEvent[];
  loading: boolean;
  isMissing: boolean;
  slotData: any;
}

function SlotViewMapComponent({
  nodes,
  currentTime,
  blockEvents,
  loading,
  isMissing,
  slotData,
}: SlotViewMapProps) {
  return (
    <GlobalMap
      nodes={nodes}
      currentTime={currentTime}
      blockEvents={blockEvents}
      loading={loading}
      isMissing={isMissing}
      slot={slotData?.slot ? Number(slotData.slot) : undefined}
      proposer={slotData?.entity || 'Unknown'}
      proposerIndex={
        slotData?.proposer?.proposerValidatorIndex
          ? Number(slotData.proposer.proposerValidatorIndex)
          : undefined
      }
      txCount={
        slotData?.block?.executionPayloadTransactionsCount
          ? Number(slotData.block.executionPayloadTransactionsCount)
          : 0
      }
      blockSize={
        slotData?.block?.blockTotalBytes ? Number(slotData.block.blockTotalBytes) : undefined
      }
      baseFee={
        slotData?.block?.executionPayloadBaseFeePerGas
          ? Number(slotData.block.executionPayloadBaseFeePerGas)
          : undefined
      }
      gasUsed={
        slotData?.block?.executionPayloadGasUsed
          ? Number(slotData.block.executionPayloadGasUsed)
          : undefined
      }
      gasLimit={
        slotData?.block?.executionPayloadGasLimit
          ? Number(slotData.block.executionPayloadGasLimit)
          : undefined
      }
      executionBlockNumber={
        slotData?.block?.executionPayloadBlockNumber
          ? Number(slotData.block.executionPayloadBlockNumber)
          : undefined
      }
      hideDetails={true}
    />
  );
}

export const SlotViewMap = memo(
  SlotViewMapComponent,
  (prev, next) =>
    prev.currentTime === next.currentTime &&
    prev.nodes === next.nodes &&
    prev.blockEvents === next.blockEvents &&
    prev.loading === next.loading &&
    prev.isMissing === next.isMissing &&
    prev.slotData === next.slotData,
);
