import { type JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import { Badge } from '@/components/Elements/Badge';
import { formatGasWithPercentage } from '@/utils';
import { formatTimestamp, getRelativeTime } from '@/utils/time';
import type { SlotBasicInfoCardProps } from './SlotBasicInfoCard.types';

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

  // Format MEV value
  const formatMevValue = (value?: number | string | null): string => {
    if (!value) return 'N/A';
    const ethValue = typeof value === 'string' ? parseFloat(value) : value;
    return `${(ethValue / 1e18).toFixed(4)} ETH`;
  };

  // Create beaconcha.in link for proposer
  const getBeaconchainLink = (validatorIndex?: number): string | null => {
    if (!validatorIndex) return null;
    return `https://beaconcha.in/validator/${validatorIndex}`;
  };

  const proposerLink = getBeaconchainLink(blockProposer?.proposer_validator_index);

  return (
    <Card
      header={
        <div className="flex items-center justify-between">
          <h2 className="text-lg/7 font-semibold text-foreground">Slot Information</h2>
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
      {/* Slot Information Grid - More compact and information-dense layout */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
        {/* Slot Number */}
        <div>
          <dt className="text-xs font-medium text-muted">Slot</dt>
          <dd className="mt-1 text-base/7 font-semibold text-foreground">{slot}</dd>
        </div>

        {/* Epoch */}
        <div>
          <dt className="text-xs font-medium text-muted">Epoch</dt>
          <dd className="mt-1 text-base/7 font-semibold text-foreground">{epoch}</dd>
        </div>

        {/* Slot Timestamp */}
        <div className="col-span-2">
          <dt className="text-xs font-medium text-muted">Slot Time</dt>
          <dd className="mt-1 text-sm text-foreground">
            {blockHead?.slot_start_date_time
              ? formatTimestamp(blockHead.slot_start_date_time)
              : blockProposer?.slot_start_date_time
                ? formatTimestamp(blockProposer.slot_start_date_time)
                : 'N/A'}
          </dd>
        </div>

        {/* Relative Time */}
        <div className="col-span-2 sm:col-span-1">
          <dt className="text-xs font-medium text-muted">Age</dt>
          <dd className="mt-1 text-sm text-foreground">
            {blockHead?.slot_start_date_time
              ? getRelativeTime(blockHead.slot_start_date_time)
              : blockProposer?.slot_start_date_time
                ? getRelativeTime(blockProposer.slot_start_date_time)
                : 'N/A'}
          </dd>
        </div>

        {/* Epoch Timestamp */}
        <div className="col-span-2 sm:col-span-1">
          <dt className="text-xs font-medium text-muted">Epoch Start</dt>
          <dd className="mt-1 text-sm text-foreground">
            {blockHead?.epoch_start_date_time
              ? formatTimestamp(blockHead.epoch_start_date_time, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : 'N/A'}
          </dd>
        </div>

        {/* Proposer Index */}
        <div className="col-span-2">
          <dt className="text-xs font-medium text-muted">Proposer</dt>
          <dd className="mt-1 text-sm text-foreground">
            {blockProposer?.proposer_validator_index !== undefined ? (
              <>
                {proposerLink ? (
                  <a
                    href={proposerLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Validator {blockProposer.proposer_validator_index}
                  </a>
                ) : (
                  `Validator ${blockProposer.proposer_validator_index}`
                )}
                {proposerEntity?.entity && <span className="ml-2 text-muted">({proposerEntity.entity})</span>}
              </>
            ) : (
              'N/A'
            )}
          </dd>
        </div>

        {/* Block Root */}
        <div className="col-span-2">
          <dt className="text-xs font-medium text-muted">Block Root</dt>
          <dd className="mt-1 font-mono text-xs text-foreground">{formatBlockRoot(blockHead?.block_root)}</dd>
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
          <dd className="mt-1 text-base/7 font-semibold text-foreground">
            {blobCount?.blob_count !== undefined && blobCount?.blob_count !== null ? `${blobCount.blob_count}` : '0'}
          </dd>
        </div>

        {/* MEV Value */}
        <div className="col-span-2 sm:col-span-1">
          <dt className="text-xs font-medium text-muted">MEV Value</dt>
          <dd className="mt-1 text-base/7 font-semibold text-foreground">{formatMevValue(blockMev?.value)}</dd>
        </div>

        {/* Gas Used / Limit */}
        <div className="col-span-2 sm:col-span-3 lg:col-span-1">
          <dt className="text-xs font-medium text-muted">Gas Used / Limit</dt>
          <dd className="mt-1 text-sm text-foreground">
            {formatGasWithPercentage(blockHead?.execution_payload_gas_used, blockHead?.execution_payload_gas_limit)}
          </dd>
        </div>
      </div>
    </Card>
  );
}
