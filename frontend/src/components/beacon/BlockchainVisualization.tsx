import React, { useMemo } from 'react';
import SlotDataStore from '@/utils/SlotDataStore';
import { getCurrentPhase } from '@/components/beacon/block_production/common/PhaseUtils';
import { Phase } from '@/components/beacon/block_production/common/types';
import BlockDetailsPanel from '@/components/beacon/block_production/common/BlockDetailsPanel';
import PendingBlock from '@/components/beacon/block_production/common/PendingBlock';
import { SlotData } from '@/types/index';
// Define types for our component props
interface BlockchainVisualizationProps {
  currentSlot: number | null;
  network: string;
  currentTime: number;
  nodeBlockSeen?: Record<string, number>;
  nodeBlockP2P?: Record<string, number>;
  blockTime?: number;
  height?: string | number;
  width?: string | number;
  className?: string;
  // New prop to pass down slot data directly
  slotData?: Record<number, SlotData>;
}

// Type for block data display
interface BlockDisplayData {
  slot: number;
  blockHash?: string;
  executionBlockNumber?: number;
  transactionCount?: number;
  blobCount?: number;
  blockValue?: number;
  proposerEntity?: string;
  gasUsed?: number;
  gasLimit?: number;
  isCurrentSlot: boolean;
  isPast: boolean;
  isFuture: boolean;
  hasData: boolean;
  isBuilding: boolean;
  futureBidsCount?: number;
  futureBids?: Array<{
    value: number;
    relayName: string;
    builderName?: string;
  }>;
  slotDataObject?: SlotData; // Store the full slot data object
  isLocallyBuilt?: boolean;
}

const BlockchainVisualization: React.FC<BlockchainVisualizationProps> = ({
  currentSlot,
  network,
  currentTime,
  nodeBlockSeen = {},
  nodeBlockP2P = {},
  blockTime,
  height = '100%',
  width = '100%',
  className = '',
  slotData = {},
}) => {
  // Determine the current phase using PhaseUtils
  const currentPhase = useMemo(() => {
    return getCurrentPhase(currentTime, nodeBlockSeen, nodeBlockP2P, blockTime);
  }, [currentTime, nodeBlockSeen, nodeBlockP2P, blockTime]);

  // Get the slot data store
  const slotDataStore = useMemo(() => SlotDataStore.getInstance(), []);

  // Calculate the slots to display: 1 previous, current, and 1 next
  const displaySlots = useMemo(() => {
    if (currentSlot === null) return [];

    return [
      currentSlot - 1, // -1 slot
      currentSlot, // Current slot
      currentSlot + 1, // Next slot
    ];
  }, [currentSlot]);

  // For debugging
  // console.log("slotData:", slotData);

  // Process data for each slot
  const blockData: BlockDisplayData[] = useMemo(() => {
    return displaySlots.map(slot => {
      // Prefer passed-in slot data, fall back to store if needed
      const slotDataForSlot =
        (slotData && slotData[slot]) || slotDataStore.getSlotData(network, slot);
      const isPast = slot < (currentSlot || 0);
      const isFuture = slot > (currentSlot || 0);
      const isCurrentSlot = slot === currentSlot;
      const hasData = !!slotDataForSlot;

      // Only show building/pending for future slots and for current slot in Building phase
      // But if slotData is directly provided for the current slot, don't mark as building
      const isBuilding =
        isFuture || (isCurrentSlot && currentPhase === Phase.Building && !slotData?.[slot]);

      // If we have data for this slot, extract relevant information
      if (slotDataForSlot) {
        const block = slotDataForSlot.block || {};
        const executionPayload = block.execution_payload || {};

        // Extract blob count
        const blobGasUsed =
          typeof executionPayload.blob_gas_used !== 'undefined'
            ? Number(executionPayload.blob_gas_used)
            : typeof block.execution_payload_blob_gas_used !== 'undefined'
              ? Number(block.execution_payload_blob_gas_used)
              : typeof block.executionPayloadBlobGasUsed !== 'undefined'
                ? Number(block.executionPayloadBlobGasUsed)
                : 0;

        const blobCount = blobGasUsed > 0 ? Math.ceil(blobGasUsed / 131072) : 0;

        // Extract execution block number
        const executionBlockNumber =
          typeof executionPayload.block_number !== 'undefined'
            ? Number(executionPayload.block_number)
            : typeof block.execution_payload_block_number !== 'undefined'
              ? Number(block.execution_payload_block_number)
              : typeof block.executionPayloadBlockNumber !== 'undefined'
                ? Number(block.executionPayloadBlockNumber)
                : undefined;

        // Extract transaction count
        const transactionCount =
          typeof executionPayload.transactions_count !== 'undefined'
            ? Number(executionPayload.transactions_count)
            : typeof block.execution_payload_transactions_count !== 'undefined'
              ? Number(block.execution_payload_transactions_count)
              : typeof block.executionPayloadTransactionsCount !== 'undefined'
                ? Number(block.executionPayloadTransactionsCount)
                : undefined;

        // Extract gas used
        const gasUsed =
          typeof executionPayload.gas_used !== 'undefined'
            ? Number(executionPayload.gas_used)
            : typeof block.execution_payload_gas_used !== 'undefined'
              ? Number(block.execution_payload_gas_used)
              : typeof block.executionPayloadGasUsed !== 'undefined'
                ? Number(block.executionPayloadGasUsed)
                : undefined;

        // Extract gas limit
        const gasLimit =
          typeof executionPayload.gas_limit !== 'undefined'
            ? Number(executionPayload.gas_limit)
            : typeof block.execution_payload_gas_limit !== 'undefined'
              ? Number(block.execution_payload_gas_limit)
              : typeof block.executionPayloadGasLimit !== 'undefined'
                ? Number(block.executionPayloadGasLimit)
                : undefined;

        // Get block hash
        const blockHash =
          block.state_root ||
          block.blockRoot ||
          block.block_root ||
          executionPayload.block_hash ||
          block.executionPayloadBlockHash ||
          block.execution_payload_block_hash;

        // Get list of relays that delivered the payload
        const deliveredRelays: string[] = slotDataForSlot.deliveredPayloads
          ? Object.keys(slotDataForSlot.deliveredPayloads)
          : [];

        const isLocallyBuilt =
          !slotDataForSlot.block?.payloadsDelivered ||
          !Array.isArray(slotDataForSlot.block?.payloadsDelivered) ||
          slotDataForSlot.block?.payloadsDelivered.length === 0;

        // Get block value from winning bid if available
        let winningBid = null;

        if (slotDataForSlot.relayBids) {
          // Find winning bids from all relays (bids marked as winning)
          const winningBids = Object.values(slotDataForSlot.relayBids).flatMap(
            relay => relay.bids?.filter(bid => bid.isWinning) || [],
          );

          // Use the first winning bid for value display
          winningBid = winningBids[0];

          // Add delivered relays to the winning bid
          if (winningBid) {
            winningBid.deliveredRelays = deliveredRelays;
          }
        }

        const blockValue = winningBid?.value;

        return {
          slot,
          blockHash,
          executionBlockNumber,
          transactionCount,
          blobCount,
          blockValue,
          proposerEntity: slotDataForSlot.proposerEntity,
          gasUsed,
          gasLimit,
          isCurrentSlot,
          isPast,
          isFuture,
          hasData,
          isBuilding,
          slotDataObject: slotDataForSlot, // Store the full slot data object
          isLocallyBuilt,
        };
      }

      // For future slots, check for bids with negative time and extract detailed bid information
      if (isFuture) {
        const previousSlotData =
          (slotData && slotData[currentSlot || 0]) ||
          slotDataStore.getSlotData(network, currentSlot || 0);
        let futureBidsCount = 0;
        const futureBids: Array<{ value: number; relayName: string; builderName?: string }> = [];

        if (previousSlotData?.relayBids) {
          // Process bids with negative time (for next slot)
          Object.entries(previousSlotData.relayBids).forEach(([relayName, relay]) => {
            if (relay.bids && Array.isArray(relay.bids)) {
              // Filter bids with negative time (which indicates they're for the next slot)
              // Some systems use negative time to indicate next slot bids
              const negativeBids = relay.bids.filter(bid => {
                const bidTime = typeof bid.time === 'number' ? bid.time : 0;
                return bidTime < 0;
              });

              futureBidsCount += negativeBids.length;

              // Process detailed bid information to show in the UI
              negativeBids.forEach(bid => {
                try {
                  // Get builder name if available
                  let builderName = undefined;

                  // Try to get builder name from the data
                  if (bid.builderPubkey) {
                    // Check if any BuilderNames store/data is available
                    if (previousSlotData.builderNames) {
                      builderName = previousSlotData.builderNames[bid.builderPubkey];
                    }
                  }

                  // Convert value to ETH - handle various value formats
                  let valueInEth = 0;
                  if (typeof bid.value === 'string') {
                    try {
                      // Try to handle big integers safely
                      valueInEth = Number(BigInt(bid.value)) / 1e18;
                    } catch (e) {
                      // If not a valid bigint string, try direct conversion
                      valueInEth = parseFloat(bid.value) / 1e18;
                    }
                  } else if (typeof bid.value === 'number') {
                    valueInEth = bid.value;
                  }

                  futureBids.push({
                    value: valueInEth,
                    relayName,
                    builderName,
                  });
                } catch (error) {
                  console.error('Error processing future bid', error);
                }
              });
            }
          });
        }

        // Sort future bids by value (highest first)
        futureBids.sort((a, b) => b.value - a.value);

        // Try to get prefetched data for the future slot
        const prefetchedData =
          (slotData && slotData[slot]) || slotDataStore.getSlotData(network, slot);
        if (prefetchedData) {
          // We have prefetched data for this future slot
          const proposerEntity = prefetchedData.proposerEntity;

          return {
            slot,
            futureBidsCount,
            futureBids,
            proposerEntity,
            isCurrentSlot,
            isPast,
            isFuture,
            hasData: !!prefetchedData,
            isBuilding: true, // Always show future blocks as pending
            slotDataObject: prefetchedData,
          };
        }

        // If we have future bids but no prefetched data, still include the bids
        return {
          slot,
          futureBidsCount,
          futureBids,
          isCurrentSlot,
          isPast,
          isFuture,
          hasData: false,
          isBuilding: true, // Always show future blocks as pending
        };
      }

      // Return basic data for slots without data
      return {
        slot,
        isCurrentSlot,
        isPast,
        isFuture,
        hasData: false,
        isBuilding: isCurrentSlot, // If current slot with no data, it's likely in building phase
      };
    });
  }, [displaySlots, slotDataStore, network, currentSlot, currentPhase, slotData]);

  return (
    <div
      className={`w-full h-full flex flex-col items-center justify-center ${className}`}
      style={{ width, height }}
    >
      <div className="w-full h-full flex flex-col justify-center">
        <div className="text-sm font-medium mb-3 text-primary flex items-center justify-between backdrop-blur-sm bg-surface/30 rounded-lg px-3 py-2">
          <div className="flex items-center">
            <div className="w-2 h-2 rounded-full bg-accent mr-1.5"></div>
            Blockchain
          </div>
        </div>

        {/* Top-down Blockchain visualization */}
        <div className="relative flex flex-col items-center justify-center h-full">
          {/* Connecting line - simple horizontal chain line */}
          <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 z-0 flex items-center justify-center">
            {/* Main horizontal line with subtle glow */}
            <div className="absolute h-1 bg-cyan-600 w-full shadow-[0_0_8px_rgba(8,145,178,0.6)]"></div>
          </div>

          {/* Blocks - now arranged horizontally */}
          <div className="relative z-10 flex flex-row items-center justify-center gap-6 px-4 w-full h-full">
            {blockData.map(block => {
              // Hide previous and next blocks on screens below 1536px (2xl)
              // Only show them on extra large screens (>= 1536px)
              const visibilityClassNames = !block.isCurrentSlot
                ? 'hidden 2xl:flex' // Hide on smaller screens, show only on 2xl screens (1536px+)
                : 'flex'; // Always show current block

              // Calculate flex layout based on whether this is the current slot or not
              const flexClassNames = block.isCurrentSlot
                ? 'w-full 2xl:w-[40%]' // Full width on smaller screens, 40% on 2xl screens
                : '2xl:w-[30%]'; // 30% width on 2xl screens only

              // Only use PendingBlock for future blocks
              if (block.isFuture) {
                return (
                  <div
                    key={block.slot}
                    className={`${visibilityClassNames} items-center justify-center h-full ${flexClassNames} transition-all duration-300`}
                  >
                    <PendingBlock
                      slot={block.slot}
                      epoch={Math.floor(block.slot / 32)}
                      proposerEntity={block.proposerEntity}
                      slotDataStore={slotDataStore}
                      network={network}
                      currentTime={currentTime}
                    />
                  </div>
                );
              }

              // Otherwise, use BlockDetailsPanel for past and current slots
              return (
                <div
                  key={block.slot}
                  className={`${visibilityClassNames} items-center justify-center h-full ${flexClassNames} transition-all duration-300`}
                >
                  <BlockDetailsPanel
                    slot={block.slot}
                    isCurrentSlot={block.isCurrentSlot}
                    isPast={block.isPast}
                    isFuture={false} // Never mark as future since we're using PendingBlock for that
                    block={block.slotDataObject?.block}
                    isBuilding={block.isBuilding}
                    hasData={block.hasData}
                    proposerEntity={block.proposerEntity}
                    blockValue={block.blockValue}
                    futureBidsCount={block.futureBidsCount}
                    futureBids={block.futureBids}
                    isLocallyBuilt={block.isLocallyBuilt}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockchainVisualization;
