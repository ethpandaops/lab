import { type JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import { Badge } from '@/components/Elements/Badge';
import { Slot } from '@/components/Ethereum/Slot';
import { Epoch } from '@/components/Ethereum/Epoch';
import { Entity } from '@/components/Ethereum/Entity';
import { BlockArt } from '@/components/Ethereum/BlockArt';
import { ForkLabel } from '@/components/Ethereum/ForkLabel';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import type { SlotBasicInfoCardProps } from './SlotBasicInfoCard.types';
import type { ForkVersion } from '@/utils/beacon';

/**
 * Displays basic information about a slot in a card layout.
 * Shows key metrics like slot number, epoch, proposer, status, block root, etc.
 */
export function SlotBasicInfoCard({ slot, epoch, data }: SlotBasicInfoCardProps): JSX.Element {
  const blockHead = data.blockHead[0];
  const blockProposer = data.blockProposer[0];
  const blockMev = data.blockMev[0];
  const blobCount = data.blobCount[0];
  const proposerEntity = data.proposerEntity[0];

  // Calculate blob count from blob propagation data if blobCount data is not available
  const actualBlobCount =
    blobCount?.blob_count !== undefined && blobCount?.blob_count !== null
      ? blobCount.blob_count
      : data.blobPropagation.length > 0
        ? Math.max(...data.blobPropagation.map(b => (b.blob_index ?? -1) + 1))
        : 0;

  // Determine if block was seen by monitoring infrastructure
  const wasBlockSeen = !!blockHead;

  // Determine slot status from proposer data (which has canonical/orphaned/missed status)
  const getSlotStatus = (): { label: string; color: 'green' | 'red' | 'yellow' } => {
    const statusValue = blockProposer?.status?.toLowerCase();

    if (statusValue === 'canonical') {
      return { label: 'Canonical', color: 'green' };
    }
    if (statusValue === 'orphaned') {
      return { label: 'Orphaned', color: 'yellow' };
    }
    if (statusValue === 'missed' || !blockHead) {
      return { label: 'Missed', color: 'red' };
    }
    // Default to canonical if we have block data but no status
    return { label: 'Canonical', color: 'green' };
  };

  const status = getSlotStatus();

  // Format block root
  const formatBlockRoot = (root?: string): string => {
    if (!root) return 'N/A';
    return `${root.slice(0, 10)}...${root.slice(-8)}`;
  };

  // Format MEV value (value is in wei as a string)
  const formatMevValue = (value?: string | null): string => {
    if (!value || value === '0') return 'N/A';
    try {
      const weiValue = BigInt(value);
      const ethValue = Number(weiValue) / 1e18;
      return `${ethValue.toFixed(4)} ETH`;
    } catch {
      return 'N/A';
    }
  };

  return (
    <Card
      header={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-lg/7 font-semibold text-foreground">Slot Information</h2>
            {blockHead?.block_version && <ForkLabel fork={blockHead.block_version as ForkVersion} size="sm" />}
          </div>
          <div className="flex items-center gap-2">
            <Badge color={wasBlockSeen ? 'green' : 'red'} variant="border">
              {wasBlockSeen ? 'Block Seen' : 'Block Not Seen'}
            </Badge>
            <Badge color={status.color} variant="border">
              {status.label}
            </Badge>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1 space-y-6">
          {/* Basic Information Section */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">Basic Information</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
              {/* Slot Number */}
              <div>
                <dt className="text-xs font-medium text-muted">Slot</dt>
                <dd className="mt-1 text-base/7 font-semibold text-foreground">
                  <Slot slot={slot} noLink />
                </dd>
              </div>

              {/* Epoch */}
              <div>
                <dt className="text-xs font-medium text-muted">Epoch</dt>
                <dd className="mt-1 text-base/7 font-semibold text-foreground">
                  <Epoch epoch={epoch} />
                </dd>
              </div>

              {/* Execution Block Number */}
              <div>
                <dt className="text-xs font-medium text-muted">Execution Block</dt>
                <dd className="mt-1 text-base/7 font-semibold text-foreground">
                  {blockHead?.execution_payload_block_number ?? 'N/A'}
                </dd>
              </div>

              {/* Blob Count */}
              <div>
                <dt className="text-xs font-medium text-muted">Blobs</dt>
                <dd className="mt-1 text-base/7 font-semibold text-foreground">{actualBlobCount}</dd>
              </div>

              {/* Slot Timestamp */}
              <div className="col-span-2">
                <dt className="text-xs font-medium text-muted">Slot Time</dt>
                <dd className="mt-1 text-sm text-foreground">
                  {blockHead?.slot_start_date_time ? (
                    <Timestamp timestamp={blockHead.slot_start_date_time} format="short" />
                  ) : blockProposer?.slot_start_date_time ? (
                    <Timestamp timestamp={blockProposer.slot_start_date_time} format="short" />
                  ) : (
                    'N/A'
                  )}
                </dd>
              </div>

              {/* Relative Time */}
              <div className="col-span-2 sm:col-span-1">
                <dt className="text-xs font-medium text-muted">Age</dt>
                <dd className="mt-1 text-sm text-foreground">
                  {blockHead?.slot_start_date_time ? (
                    <Timestamp timestamp={blockHead.slot_start_date_time} format="relative" />
                  ) : blockProposer?.slot_start_date_time ? (
                    <Timestamp timestamp={blockProposer.slot_start_date_time} format="relative" />
                  ) : (
                    'N/A'
                  )}
                </dd>
              </div>

              {/* Epoch Timestamp */}
              <div className="col-span-2">
                <dt className="text-xs font-medium text-muted">Epoch Start</dt>
                <dd className="mt-1 text-sm text-foreground">
                  {blockHead?.epoch_start_date_time ? (
                    <Timestamp timestamp={blockHead.epoch_start_date_time} format="short" />
                  ) : (
                    'N/A'
                  )}
                </dd>
              </div>
            </div>
          </div>

          {/* Block Details Section */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">Block Details</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
              {/* Proposer Entity */}
              <div className="col-span-2">
                <dt className="text-xs font-medium text-muted">Proposer</dt>
                <dd className="mt-1 text-sm text-foreground">
                  <Entity entity={proposerEntity?.entity} />
                  {blockProposer?.proposer_validator_index !== undefined &&
                    blockProposer.proposer_validator_index !== null && (
                      <span className="ml-2 text-muted">(Validator {blockProposer.proposer_validator_index})</span>
                    )}
                </dd>
              </div>

              {/* MEV Value */}
              <div className="col-span-2">
                <dt className="text-xs font-medium text-muted">MEV Value</dt>
                <dd className="mt-1 text-base/7 font-semibold text-foreground">{formatMevValue(blockMev?.value)}</dd>
              </div>

              {/* Block Root */}
              <div className="col-span-2 sm:col-span-3 lg:col-span-4">
                <dt className="text-xs font-medium text-muted">Block Root</dt>
                <dd className="mt-1 text-xs text-foreground">{formatBlockRoot(blockHead?.block_root)}</dd>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center lg:items-start">
          <BlockArt
            width={180}
            height={180}
            blockHash={blockHead?.block_root}
            blockNumber={blockHead?.execution_payload_block_number ?? slot}
          />
        </div>
      </div>
    </Card>
  );
}
