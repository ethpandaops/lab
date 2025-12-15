import { type JSX } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { EllipsisVerticalIcon } from '@heroicons/react/20/solid';
import { Badge } from '@/components/Elements/Badge';
import { Slot } from '@/components/Ethereum/Slot';
import { Epoch } from '@/components/Ethereum/Epoch';
import { Entity } from '@/components/Ethereum/Entity';
import { ForkLabel } from '@/components/Ethereum/ForkLabel';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { BeaconchainIcon } from '@/components/Ethereum/BeaconchainIcon';
import { DoraIcon } from '@/components/Ethereum/DoraIcon';
import { TracoorIcon } from '@/components/Ethereum/TracoorIcon';
import { EtherscanIcon } from '@/components/Ethereum/EtherscanIcon';
import { useNetwork } from '@/hooks/useNetwork';
import type { SlotBasicInfoCardProps } from './SlotBasicInfoCard.types';
import type { ForkVersion } from '@/utils/beacon';

/**
 * Displays basic information about a slot in a card layout.
 * Shows key metrics like slot number, epoch, proposer, status, block root, etc.
 */
export function SlotBasicInfoCard({ slot, epoch, data, isMissedSlot = false }: SlotBasicInfoCardProps): JSX.Element {
  const { currentNetwork } = useNetwork();
  // Use canonical block head if available, otherwise fall back to orphaned block data
  // Will be undefined for missed slots
  const blockHead = data.blockHead[0] ?? data.block[0];
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
  // or from the isOrphaned/isMissedSlot flags
  const getSlotStatus = (): { label: string; color: 'green' | 'red' | 'yellow' } => {
    // Check isMissedSlot prop first (no block data at all)
    if (isMissedSlot) {
      return { label: 'Missed', color: 'red' };
    }

    // Check isOrphaned flag (set when we have block data but no canonical blockHead)
    if (data.isOrphaned) {
      return { label: 'Orphaned', color: 'yellow' };
    }

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

  // Build explorer links data
  const serviceUrls = currentNetwork?.service_urls;
  const explorerLinks = [
    {
      type: 'beaconchain' as const,
      url: serviceUrls?.beaconExplorer ? `${serviceUrls.beaconExplorer}/slot/${slot}` : null,
      icon: BeaconchainIcon,
      label: 'Beaconcha.in',
    },
    {
      type: 'dora' as const,
      url: serviceUrls?.dora ? `${serviceUrls.dora}/slot/${slot}` : null,
      icon: DoraIcon,
      label: 'Dora',
    },
    {
      type: 'tracoor' as const,
      url: serviceUrls?.tracoor
        ? `${serviceUrls.tracoor}/beacon_block?beaconBlockSlot=${slot}${blockHead?.block_root ? `&beaconBlockBlockRoot=${blockHead.block_root}` : ''}`
        : null,
      icon: TracoorIcon,
      label: 'Tracoor',
    },
    {
      type: 'etherscan' as const,
      url:
        serviceUrls?.explorer && blockHead?.execution_payload_block_number
          ? `${serviceUrls.explorer}/block/${blockHead.execution_payload_block_number}`
          : null,
      icon: EtherscanIcon,
      label: 'Etherscan',
    },
  ].filter(link => link.url !== null);

  return (
    <div className="overflow-hidden rounded-sm border border-border bg-surface">
      {/* Tight header section - no padding, integrated into card */}
      <div className="border-b border-border bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg/7 font-semibold text-foreground">Slot Information</h2>
          {explorerLinks.length > 0 && (
            <>
              {/* Desktop: Show icons directly */}
              <div className="hidden items-center gap-2 sm:flex">
                {explorerLinks.map(link => (
                  <a
                    key={link.type}
                    href={link.url!}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block opacity-70 transition-opacity hover:opacity-100"
                    aria-label={link.label}
                  >
                    <link.icon className="h-5 w-5" />
                  </a>
                ))}
              </div>
              {/* Mobile: Show dropdown menu */}
              <Menu as="div" className="relative sm:hidden">
                <MenuButton className="inline-flex items-center rounded-sm p-1 opacity-70 transition-opacity hover:opacity-100">
                  <EllipsisVerticalIcon className="h-5 w-5" aria-hidden="true" />
                </MenuButton>
                <MenuItems className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-sm border border-border bg-surface shadow-lg focus:outline-none">
                  {explorerLinks.map(link => (
                    <MenuItem key={link.type}>
                      <a
                        href={link.url!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-background"
                      >
                        <link.icon className="h-4 w-4" />
                        {link.label}
                      </a>
                    </MenuItem>
                  ))}
                </MenuItems>
              </Menu>
            </>
          )}
        </div>
      </div>

      {/* Card content */}
      <div className="p-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1 space-y-6">
            {/* Status Section */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge color={wasBlockSeen ? 'green' : 'red'} variant="border">
                {wasBlockSeen ? 'Block Seen' : 'Block Not Seen'}
              </Badge>
              <Badge color={status.color} variant="border">
                {status.label}
              </Badge>
            </div>

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

                {/* Block Version */}
                {blockHead?.block_version && (
                  <div>
                    <dt className="text-xs font-medium text-muted">Fork</dt>
                    <dd className="mt-1 text-base/7 font-semibold text-foreground">
                      <ForkLabel fork={blockHead.block_version as ForkVersion} size="sm" />
                    </dd>
                  </div>
                )}

                {/* Execution Block Number */}
                <div>
                  <dt className="text-xs font-medium text-muted">Execution Block</dt>
                  <dd className="mt-1 text-base/7 font-semibold text-foreground">
                    {blockHead?.execution_payload_block_number ?? 'N/A'}
                  </dd>
                </div>

                {/* Blob Count - only show if there are blobs */}
                {actualBlobCount > 0 && (
                  <div>
                    <dt className="text-xs font-medium text-muted">Blobs</dt>
                    <dd className="mt-1 text-base/7 font-semibold text-foreground">{actualBlobCount}</dd>
                  </div>
                )}

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
                  <dd className="mt-1 font-mono text-xs text-foreground">{formatBlockRoot(blockHead?.block_root)}</dd>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
