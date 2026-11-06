import { type JSX } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Link } from '@tanstack/react-router';
import { EllipsisVerticalIcon } from '@heroicons/react/20/solid';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/16/solid';
import { Card } from '@/components/Layout/Card';
import { Badge } from '@/components/Elements/Badge';
import { Slot } from '@/components/Ethereum/Slot';
import { Epoch } from '@/components/Ethereum/Epoch';
import { Entity } from '@/components/Ethereum/Entity';
import { Validator } from '@/components/Ethereum/Validator';
import { ForkLabel } from '@/components/Ethereum/ForkLabel';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { BeaconchainIcon } from '@/components/Ethereum/BeaconchainIcon';
import { DoraIcon } from '@/components/Ethereum/DoraIcon';
import { TracoorIcon } from '@/components/Ethereum/TracoorIcon';
import { EtherscanIcon } from '@/components/Ethereum/EtherscanIcon';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { useIsPageEnabled } from '@/hooks/useIsPageEnabled';
import { useNetwork } from '@/hooks/useNetwork';
import { GRAFFITI_FORMAT_LABELS, formatClientName } from '@/utils/graffiti';
import { useSlotProposerClient, type ProposerClientField } from '../../hooks/useSlotProposerClient';
import { noDataBefore } from '../../hooks/useSlotTableCoverage';
import type { SlotBasicInfoCardProps } from './SlotBasicInfoCard.types';
import type { ForkVersion } from '@/utils/beacon';

/**
 * Client logo and name linked to the client page; its release linked to the version page and GitHub, marked as a
 * build after it for a branch commit; or the commit and why it names no release.
 */
function ProposerClientValue({ field }: { field: ProposerClientField }): JSX.Element {
  const commit =
    field.commit &&
    (field.commitUrl ? (
      <a
        href={field.commitUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="font-mono text-xs text-muted hover:underline"
      >
        {field.commit}
      </a>
    ) : (
      <span className="font-mono text-xs text-muted">{field.commit}</span>
    ));

  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
      <Link
        to="/ethereum/clients/$client"
        params={{ client: field.client }}
        className="inline-flex items-center gap-2 hover:underline"
      >
        <ClientLogo client={field.client} size={16} noLink decorative />
        <span>{formatClientName(field.client)}</span>
      </Link>
      {field.version ? (
        <>
          <span className="inline-flex items-center gap-1">
            {field.buildAfter && <span className="text-muted">build after</span>}
            <Link
              to="/ethereum/clients/$client/$version"
              params={{ client: field.client, version: field.version }}
              className="hover:underline"
            >
              {field.version}
            </Link>
            {field.versionUrl && (
              <a
                href={field.versionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted hover:text-foreground"
                aria-label={`${field.version} release on GitHub`}
              >
                <ArrowTopRightOnSquareIcon className="size-3" />
              </a>
            )}
          </span>
          {field.statedVersion && <span className="text-xs text-muted">states {field.statedVersion}</span>}
          {field.buildAfter && commit}
          {field.buildAfter && field.commitsSinceRelease !== undefined && (
            <span className="text-xs text-muted">
              {field.commitsSinceRelease} {field.commitsSinceRelease === 1 ? 'commit' : 'commits'} after
            </span>
          )}
        </>
      ) : (
        <>
          {field.statedVersion && <span className="text-muted">states {field.statedVersion}</span>}
          {commit}
          {field.unresolvedNote && <span className="basis-full text-xs text-muted">{field.unresolvedNote}</span>}
        </>
      )}
    </span>
  );
}

/**
 * Displays basic information about a slot in a card layout.
 * Shows key metrics like slot number, epoch, proposer, status, block root, etc.
 */
export function SlotBasicInfoCard({
  slot,
  epoch,
  data,
  isMissedSlot = false,
  dataStart,
}: SlotBasicInfoCardProps): JSX.Element {
  const { currentNetwork } = useNetwork();
  // Use canonical block head if available, otherwise fall back to orphaned block data
  // Will be undefined for missed slots
  const blockHead = data.blockHead[0] ?? data.block[0];
  const blockProposer = data.blockProposer[0];
  const blockMev = data.blockMev[0];
  const blobCount = data.blobCount[0];
  const proposerEntity = data.proposerEntity[0];
  // fct_block_proposer starts later than fct_block_head; older blocks still name their proposer
  const proposerIndex = blockProposer?.proposer_validator_index ?? blockHead?.proposer_index;
  const proposerClient = useSlotProposerClient(slot, proposerIndex);
  const entityStart = proposerEntity ? undefined : dataStart('fct_block_proposer_entity');
  const mevStart = blockMev ? undefined : dataStart('fct_block_mev');

  // Calculate blob count from blob propagation data if blobCount data is not available
  const actualBlobCount =
    blobCount?.blob_count !== undefined && blobCount?.blob_count !== null
      ? blobCount.blob_count
      : data.blobPropagation.length > 0
        ? Math.max(...data.blobPropagation.map(b => (b.blob_index ?? -1) + 1))
        : 0;

  // Determine slot status from proposer data (which has canonical/orphaned/missed status)
  // or from the isOrphaned/isMissedSlot flags
  const getSlotStatus = (): { label: string; color: 'green' | 'red' | 'orange' } => {
    // Check isMissedSlot prop first (no block data at all)
    if (isMissedSlot) {
      return { label: 'Missed', color: 'red' };
    }

    // Check isOrphaned flag (set when we have block data but no canonical blockHead)
    if (data.isOrphaned) {
      return { label: 'Orphaned', color: 'orange' };
    }

    const statusValue = blockProposer?.status?.toLowerCase();

    if (statusValue === 'canonical') {
      return { label: 'Canonical', color: 'green' };
    }
    if (statusValue === 'orphaned') {
      return { label: 'Orphaned', color: 'orange' };
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

  const gasProfilerEnabled = useIsPageEnabled('/ethereum/execution/gas-profiler');

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
    <Card
      title="Slot Information"
      allowContentOverflow
      actions={
        explorerLinks.length > 0 && (
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
              <MenuItems className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-sm border border-border bg-surface focus:outline-none">
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
        )
      }
    >
      <div>
        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex-1 space-y-6">
            {/* Status Section */}
            <div className="flex flex-wrap items-center gap-2">
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

                {/* Execution Block Number - zero means the CL row has no
                    payload data (gloas blocks carry only the bid), so hide it */}
                {!!blockHead?.execution_payload_block_number && (
                  <div>
                    <dt className="text-xs font-medium text-muted">Execution Block</dt>
                    <dd className="mt-1 text-base/7 font-semibold text-foreground">
                      {gasProfilerEnabled ? (
                        <Link
                          to="/ethereum/execution/gas-profiler/block/$blockNumber"
                          params={{ blockNumber: String(blockHead.execution_payload_block_number) }}
                          className="text-primary hover:underline"
                        >
                          {blockHead.execution_payload_block_number}
                        </Link>
                      ) : (
                        blockHead.execution_payload_block_number
                      )}
                    </dd>
                  </div>
                )}

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
                    {entityStart === undefined ? (
                      <>
                        <Entity entity={proposerEntity?.entity} />
                        {proposerIndex !== undefined && proposerIndex !== null && (
                          <span className="ml-2 text-muted">
                            (Validator <Validator index={proposerIndex} />)
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        {proposerIndex !== undefined && proposerIndex !== null && (
                          <span>
                            Validator <Validator index={proposerIndex} />
                          </span>
                        )}
                        <span className="block text-xs text-muted">{noDataBefore(entityStart, 'entity')}</span>
                      </>
                    )}
                  </dd>
                </div>

                {/* MEV Value */}
                <div className="col-span-2">
                  <dt className="text-xs font-medium text-muted">MEV Value</dt>
                  {mevStart !== undefined ? (
                    <dd className="mt-1 text-sm text-muted">{noDataBefore(mevStart)}</dd>
                  ) : (
                    <dd className="mt-1 text-base/7 font-semibold text-foreground">
                      {formatMevValue(blockMev?.value)}
                    </dd>
                  )}
                </div>

                {/* Proposer clients parsed from the graffiti */}
                {proposerClient.consensus && (
                  <div className="col-span-2">
                    <dt className="text-xs font-medium text-muted">Consensus Client</dt>
                    <dd className="mt-1 text-sm text-foreground">
                      <ProposerClientValue field={proposerClient.consensus} />
                    </dd>
                  </div>
                )}
                {proposerClient.execution && (
                  <div className="col-span-2">
                    <dt className="text-xs font-medium text-muted">Execution Client</dt>
                    <dd className="mt-1 text-sm text-foreground">
                      <ProposerClientValue field={proposerClient.execution} />
                    </dd>
                  </div>
                )}

                {/* Node name, only published on devnets */}
                {proposerClient.nodeName && (
                  <div className="col-span-2">
                    <dt className="text-xs font-medium text-muted">Beacon node</dt>
                    <dd className="mt-1 font-mono text-xs text-foreground">{proposerClient.nodeName}</dd>
                  </div>
                )}

                {/* Graffiti */}
                {proposerClient.graffitiText && (
                  <div className="col-span-2 sm:col-span-3 lg:col-span-4">
                    <dt className="text-xs font-medium text-muted">Graffiti</dt>
                    <dd
                      className="mt-1 truncate font-mono text-xs text-foreground"
                      title={`${proposerClient.graffitiText} (${GRAFFITI_FORMAT_LABELS[proposerClient.graffitiFormat ?? ''] ?? proposerClient.graffitiFormat})`}
                    >
                      {proposerClient.graffitiText}
                    </dd>
                  </div>
                )}

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
    </Card>
  );
}
