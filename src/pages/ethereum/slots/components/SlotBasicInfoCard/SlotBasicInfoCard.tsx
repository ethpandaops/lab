import { type JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import { Badge } from '@/components/Elements/Badge';
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

  // Determine slot status
  // Note: canonical status would need to be determined from the data
  // For now, we assume if blockHead exists, the slot is canonical
  const getSlotStatus = (): { label: string; color: 'green' | 'red' | 'yellow' } => {
    if (!blockHead) {
      return { label: 'Missed', color: 'red' };
    }
    // TODO: Add canonical/orphaned detection when available in API
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

  // Format gas
  const formatGas = (used?: number | null, limit?: number | null): string => {
    if (!used || !limit) return 'N/A';
    const percentage = ((used / limit) * 100).toFixed(1);
    return `${used.toLocaleString()} / ${limit.toLocaleString()} (${percentage}%)`;
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
          <Badge color={status.color} variant="border">
            {status.label}
          </Badge>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Slot Number */}
        <div>
          <dt className="text-sm/6 font-medium text-muted">Slot</dt>
          <dd className="mt-1 text-base/7 font-semibold text-foreground">{slot.toLocaleString()}</dd>
        </div>

        {/* Epoch */}
        <div>
          <dt className="text-sm/6 font-medium text-muted">Epoch</dt>
          <dd className="mt-1 text-base/7 font-semibold text-foreground">{epoch.toLocaleString()}</dd>
        </div>

        {/* Proposer Index */}
        <div>
          <dt className="text-sm/6 font-medium text-muted">Proposer</dt>
          <dd className="mt-1 text-base/7 font-semibold text-foreground">
            {blockProposer?.proposer_validator_index ? (
              <div className="flex flex-col gap-1">
                <div>
                  {proposerLink ? (
                    <a
                      href={proposerLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {blockProposer.proposer_validator_index.toLocaleString()}
                    </a>
                  ) : (
                    blockProposer.proposer_validator_index.toLocaleString()
                  )}
                </div>
                {proposerEntity?.entity && (
                  <div className="text-sm font-normal text-muted">({proposerEntity.entity})</div>
                )}
              </div>
            ) : (
              'N/A'
            )}
          </dd>
        </div>

        {/* Block Root */}
        <div>
          <dt className="text-sm/6 font-medium text-muted">Block Root</dt>
          <dd className="mt-1 font-mono text-sm/6 text-foreground">{formatBlockRoot(blockHead?.block_root)}</dd>
        </div>

        {/* Blob Count */}
        <div>
          <dt className="text-sm/6 font-medium text-muted">Blobs</dt>
          <dd className="mt-1 text-base/7 font-semibold text-foreground">
            {blobCount?.blob_count !== undefined ? `${blobCount.blob_count} blobs` : 'N/A'}
          </dd>
        </div>

        {/* MEV Value */}
        <div>
          <dt className="text-sm/6 font-medium text-muted">MEV Value</dt>
          <dd className="mt-1 text-base/7 font-semibold text-foreground">{formatMevValue(blockMev?.value)}</dd>
        </div>

        {/* Execution Block Number */}
        <div>
          <dt className="text-sm/6 font-medium text-muted">Execution Block</dt>
          <dd className="mt-1 text-base/7 font-semibold text-foreground">
            {blockHead?.execution_payload_block_number?.toLocaleString() ?? 'N/A'}
          </dd>
        </div>

        {/* Gas Used / Limit */}
        <div className="sm:col-span-2">
          <dt className="text-sm/6 font-medium text-muted">Gas Used / Limit</dt>
          <dd className="mt-1 text-base/7 font-semibold text-foreground">
            {formatGas(blockHead?.execution_payload_gas_used, blockHead?.execution_payload_gas_limit)}
          </dd>
        </div>
      </div>
    </Card>
  );
}
