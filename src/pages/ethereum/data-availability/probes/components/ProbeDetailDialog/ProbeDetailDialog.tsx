import { type JSX, useState, useCallback } from 'react';
import { Link } from '@tanstack/react-router';
import clsx from 'clsx';
import {
  ServerIcon,
  CpuChipIcon,
  ListBulletIcon,
  LinkIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  DocumentDuplicateIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import type { IntCustodyProbe } from '@/api/types.gen';
import { useNetwork } from '@/hooks/useNetwork';
import { Dialog } from '@/components/Overlays/Dialog';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { BlobPosterLogo } from '@/components/Ethereum/BlobPosterLogo';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { getCountryFlag } from '@/utils/country';
import { slotToTimestamp } from '@/utils/beacon';
import { formatSlot } from '@/utils';
import { ProbeFlow } from '../ProbeFlow';

export interface ProbeDetailDialogProps {
  /** The probe to display */
  probe: IntCustodyProbe | null;
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Called when the dialog should close */
  onClose: () => void;
  /** Optional callback when a filter is applied (closes dialog and filters) */
  onFilterClick?: (field: string, value: string | number) => void;
}

/**
 * Copyable badge component for column indices
 */
function CopyableBadge({
  value,
  label,
  onDrillDown,
}: {
  value: string | number;
  label?: string;
  onDrillDown?: () => void;
}): JSX.Element {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent): void => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(String(value));
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  const handleClick = (e: React.MouseEvent): void => {
    e.stopPropagation();
    if (onDrillDown) {
      onDrillDown();
    }
  };

  return (
    <span className="group relative inline-flex items-center gap-0.5">
      <button
        type="button"
        onClick={onDrillDown ? handleClick : handleCopy}
        className={clsx(
          'inline-flex cursor-pointer items-center justify-center rounded border px-1.5 py-0.5 font-mono text-[10px] transition-all',
          copied
            ? 'border-green-500/30 bg-green-500/10 text-green-500'
            : onDrillDown
              ? 'border-border bg-background text-foreground hover:border-primary/30 hover:bg-primary/10 hover:text-primary'
              : 'border-border bg-background text-foreground hover:border-primary/30 hover:bg-primary/10'
        )}
        title={onDrillDown ? `Filter by ${label || value}` : `Copy ${label || value}`}
      >
        {copied ? <CheckIcon className="mr-1 size-3" /> : null}
        {value}
      </button>
    </span>
  );
}

/**
 * Clickable cell value for filtering in the Client Details table
 */
function FilterableValue({
  value,
  displayValue,
  field,
  onFilter,
  className,
  children,
}: {
  value: string | number | undefined | null;
  displayValue?: string;
  field: string;
  onFilter?: (field: string, value: string | number) => void;
  className?: string;
  children?: React.ReactNode;
}): JSX.Element {
  if (!value || !onFilter) {
    return <span className={className}>{children || displayValue || value || '-'}</span>;
  }

  return (
    <button
      type="button"
      onClick={() => onFilter(field, value)}
      className={clsx('cursor-pointer transition-colors hover:text-primary hover:underline', className)}
      title={`Filter by ${displayValue || value}`}
    >
      {children || displayValue || value}
    </button>
  );
}

/**
 * Shared probe detail dialog component
 * Used by both ProbesView and CellProbeDialog for consistent probe details display
 */
export function ProbeDetailDialog({
  probe,
  isOpen,
  onClose,
  onFilterClick,
}: ProbeDetailDialogProps): JSX.Element | null {
  const { currentNetwork } = useNetwork();
  const [linkCopied, setLinkCopied] = useState(false);

  // Handle copy link - construct a proper shareable URL to the probes page
  const handleCopyLink = useCallback(() => {
    if (!probe) return;

    // Build URL to probes page with probe identification params
    const url = new URL('/ethereum/data-availability/probes/', window.location.origin);

    // Include network param if not mainnet (mainnet is the default)
    if (currentNetwork && currentNetwork.name !== 'mainnet') {
      url.searchParams.set('network', currentNetwork.name);
    }

    if (probe.probe_date_time !== undefined) {
      url.searchParams.set('probeTime', String(probe.probe_date_time));
    }
    if (probe.peer_id_unique_key !== undefined) {
      url.searchParams.set('probePeerId', String(probe.peer_id_unique_key));
    }

    navigator.clipboard.writeText(url.toString());
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }, [probe, currentNetwork]);

  // Handle filter and close
  const handleFilterAndClose = useCallback(
    (field: string, value: string | number) => {
      if (onFilterClick) {
        onFilterClick(field, value);
      }
      onClose();
    },
    [onFilterClick, onClose]
  );

  if (!probe) return null;

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      title={
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <ServerIcon className="size-5 text-primary" />
            <span>Probe Details</span>
            {/* Copy Link button */}
            <button
              type="button"
              onClick={handleCopyLink}
              className={clsx(
                'ml-auto flex items-center gap-1.5 rounded border px-2 py-1 text-xs transition-all',
                linkCopied
                  ? 'border-green-500/30 bg-green-500/10 text-green-500'
                  : 'border-border bg-background text-muted hover:border-primary/30 hover:bg-primary/10 hover:text-primary'
              )}
              title="Copy link to this probe"
            >
              {linkCopied ? <CheckIcon className="size-3.5" /> : <LinkIcon className="size-3.5" />}
              <span>{linkCopied ? 'Copied!' : 'Copy Link'}</span>
            </button>
          </div>
          <Timestamp
            timestamp={probe.probe_date_time ?? 0}
            format="long"
            disableModal
            className="!p-0 text-xs !text-muted"
          />
        </div>
      }
      size="xl"
    >
      <div className="space-y-4">
        {/* Visual Flow */}
        <ProbeFlow probe={probe} />

        {/* Blob Publishers Hero Section */}
        {probe.blob_submitters && probe.blob_submitters.length > 0 && (
          <div
            className={clsx(
              'rounded-lg border p-4',
              // failure = yellow (transient/one-off failure - less severe)
              // missing = red (peer responded but didn't have the data - serious)
              probe.result === 'success'
                ? 'border-green-500/30 bg-green-500/5'
                : probe.result === 'failure'
                  ? 'border-yellow-500/30 bg-yellow-500/5'
                  : 'border-red-500/30 bg-red-500/5'
            )}
          >
            {/* Status message */}
            <div className="mb-3 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <DocumentDuplicateIcon
                  className={clsx(
                    'size-5',
                    probe.result === 'success'
                      ? 'text-green-500'
                      : probe.result === 'failure'
                        ? 'text-yellow-500'
                        : 'text-red-500'
                  )}
                />
                <span
                  className={clsx(
                    'text-sm font-medium',
                    probe.result === 'success'
                      ? 'text-green-600 dark:text-green-400'
                      : probe.result === 'failure'
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-red-600 dark:text-red-400'
                  )}
                >
                  {probe.result === 'success'
                    ? 'These blob publishers are being secured by this peer'
                    : probe.result === 'failure'
                      ? 'Possible transient failure - probe did not complete'
                      : "This peer doesn't appear to have this data"}
                </span>
              </div>
              {/* Reassuring link - only show for failure/missing */}
              {probe.slot !== undefined && probe.result !== 'success' && (
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <span>This is just one probe.</span>
                  <Link
                    to="/ethereum/data-availability/probes"
                    search={{ slot: probe.slot }}
                    className="inline-flex items-center gap-1 text-primary transition-colors hover:text-primary/80 hover:underline"
                  >
                    <MagnifyingGlassIcon className="size-3" />
                    <span>View all probes for this slot</span>
                  </Link>
                  <span>to see the full picture.</span>
                </div>
              )}
            </div>

            {/* Blob publishers grid */}
            <div className="flex flex-wrap gap-3">
              {(() => {
                const countMap = new Map<string, number>();
                for (const submitter of probe.blob_submitters) {
                  countMap.set(submitter, (countMap.get(submitter) ?? 0) + 1);
                }
                const sorted = [...countMap.entries()].sort((a, b) => b[1] - a[1]);
                return sorted.map(([poster, count]) => (
                  <div
                    key={poster}
                    className="flex items-center gap-2 rounded border border-border bg-background px-3 py-2"
                  >
                    <BlobPosterLogo poster={poster} size={28} />
                    <div className="flex flex-col">
                      <span className="text-sm font-semibold text-foreground">{poster}</span>
                      <span className="text-xs text-muted">
                        {count} {count === 1 ? 'blob' : 'blobs'}
                      </span>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* Error Section - show early for failure probes */}
        {probe.error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
            <h4 className="mb-2 text-[10px] font-bold tracking-wider text-red-400 uppercase">Error</h4>
            <div className="font-mono text-[10px] text-red-300">{probe.error}</div>
          </div>
        )}

        {/* About */}
        {probe.slot !== undefined && probe.slot !== null && currentNetwork && probe.probe_date_time && (
          <div>
            <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider text-foreground uppercase">
              <InformationCircleIcon className="size-4 text-primary" />
              About
            </h4>
            <p className="text-sm text-muted">
              {(() => {
                const slotTimestamp = slotToTimestamp(probe.slot, currentNetwork.genesis_time);
                const probeTimestamp = probe.probe_date_time;
                const ageSeconds = probeTimestamp - slotTimestamp;
                const ageDays = Math.floor(ageSeconds / 86400);
                const ageHours = Math.floor((ageSeconds % 86400) / 3600);
                const ageMinutes = Math.floor((ageSeconds % 3600) / 60);

                let ageString: string;
                if (ageDays > 0) {
                  ageString = `${ageDays} day${ageDays === 1 ? '' : 's'}`;
                } else if (ageHours > 0) {
                  ageString = `${ageHours} hour${ageHours === 1 ? '' : 's'}`;
                } else if (ageMinutes > 0) {
                  ageString = `${ageMinutes} minute${ageMinutes === 1 ? '' : 's'}`;
                } else {
                  ageString = 'less than a minute';
                }

                const peerCountry = probe.meta_peer_geo_country;
                const peerClient = probe.meta_peer_implementation || 'unknown';
                const columnCount = probe.column_indices?.length ?? 0;

                return (
                  <>
                    We requested {columnCount} column{columnCount !== 1 && 's'} for{' '}
                    <Link
                      to="/ethereum/slots/$slot"
                      params={{ slot: String(probe.slot) }}
                      className="text-primary hover:underline"
                    >
                      slot {formatSlot(probe.slot)}
                    </Link>{' '}
                    from a {peerClient} node
                    {peerCountry && (
                      <>
                        {' '}
                        in {probe.meta_peer_geo_country_code && getCountryFlag(probe.meta_peer_geo_country_code)}{' '}
                        {peerCountry}
                      </>
                    )}
                    . The slot was {ageString} old at the time.
                  </>
                );
              })()}
            </p>
          </div>
        )}

        {/* Client Details Table */}
        <div>
          <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider text-foreground uppercase">
            <CpuChipIcon className="size-4 text-primary" />
            Client Details
            {onFilterClick && <span className="text-[10px] font-normal text-muted normal-case">(click to filter)</span>}
          </h4>

          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="min-w-full text-xs">
              <thead className="bg-muted/50 font-medium text-muted uppercase">
                <tr>
                  <th className="px-2 py-1 text-left">Attribute</th>
                  <th className="px-2 py-1 text-left">Prober</th>
                  <th className="px-2 py-1 text-left">Peer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr className="bg-card/30">
                  <td className="px-2 py-1 font-medium text-muted">Client</td>
                  <td className="px-2 py-1">
                    <div className="flex items-center gap-1.5">
                      <ClientLogo client={probe.meta_client_implementation || 'Unknown'} size={16} />
                      <FilterableValue
                        value={probe.meta_client_implementation}
                        field="meta_client_implementation"
                        onFilter={onFilterClick ? handleFilterAndClose : undefined}
                        className="font-medium"
                      />
                    </div>
                  </td>
                  <td className="px-2 py-1">
                    <div className="flex items-center gap-1.5">
                      <ClientLogo client={probe.meta_peer_implementation || 'Unknown'} size={16} />
                      <FilterableValue
                        value={probe.meta_peer_implementation}
                        field="meta_peer_implementation"
                        onFilter={onFilterClick ? handleFilterAndClose : undefined}
                        className="font-medium"
                      />
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="px-2 py-1 font-medium text-muted">Node ID</td>
                  <td className="px-2 py-1">
                    <FilterableValue
                      value={probe.node_id}
                      field="node_id"
                      onFilter={onFilterClick ? handleFilterAndClose : undefined}
                      className="font-mono text-[10px]"
                    />
                  </td>
                  <td className="px-2 py-1 text-muted">-</td>
                </tr>
                <tr className="bg-card/30">
                  <td className="px-2 py-1 font-medium text-muted">Version</td>
                  <td className="px-2 py-1">
                    <FilterableValue
                      value={probe.meta_client_version}
                      field="meta_client_version"
                      onFilter={onFilterClick ? handleFilterAndClose : undefined}
                      className="font-mono text-[10px]"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <FilterableValue
                      value={probe.meta_peer_version}
                      field="meta_peer_version"
                      onFilter={onFilterClick ? handleFilterAndClose : undefined}
                      className="font-mono text-[10px]"
                    />
                  </td>
                </tr>
                <tr>
                  <td className="px-2 py-1 font-medium text-muted">Country</td>
                  <td className="px-2 py-1">
                    <div className="flex items-center gap-1.5">
                      <span>{getCountryFlag(probe.meta_client_geo_country_code)}</span>
                      <FilterableValue
                        value={probe.meta_client_geo_country}
                        field="meta_client_geo_country"
                        onFilter={onFilterClick ? handleFilterAndClose : undefined}
                      />
                    </div>
                  </td>
                  <td className="px-2 py-1">
                    <div className="flex items-center gap-1.5">
                      <span>{getCountryFlag(probe.meta_peer_geo_country_code)}</span>
                      <FilterableValue
                        value={probe.meta_peer_geo_country}
                        field="meta_peer_geo_country"
                        onFilter={onFilterClick ? handleFilterAndClose : undefined}
                      />
                    </div>
                  </td>
                </tr>
                <tr className="bg-card/30">
                  <td className="px-2 py-1 font-medium text-muted">City</td>
                  <td className="px-2 py-1">
                    <FilterableValue
                      value={probe.meta_client_geo_city}
                      field="meta_client_geo_city"
                      onFilter={onFilterClick ? handleFilterAndClose : undefined}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <FilterableValue
                      value={probe.meta_peer_geo_city}
                      field="meta_peer_geo_city"
                      onFilter={onFilterClick ? handleFilterAndClose : undefined}
                    />
                  </td>
                </tr>
                <tr>
                  <td className="px-2 py-1 font-medium text-muted">ASN</td>
                  <td className="px-2 py-1">
                    <FilterableValue
                      value={probe.meta_client_geo_autonomous_system_number}
                      displayValue={
                        probe.meta_client_geo_autonomous_system_number
                          ? `AS${probe.meta_client_geo_autonomous_system_number}`
                          : undefined
                      }
                      field="meta_client_geo_autonomous_system_number"
                      onFilter={onFilterClick ? handleFilterAndClose : undefined}
                      className="font-mono text-[10px]"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <FilterableValue
                      value={probe.meta_peer_geo_autonomous_system_number}
                      displayValue={
                        probe.meta_peer_geo_autonomous_system_number
                          ? `AS${probe.meta_peer_geo_autonomous_system_number}`
                          : undefined
                      }
                      field="meta_peer_geo_autonomous_system_number"
                      onFilter={onFilterClick ? handleFilterAndClose : undefined}
                      className="font-mono text-[10px]"
                    />
                  </td>
                </tr>
                <tr className="bg-card/30">
                  <td className="px-2 py-1 font-medium text-muted">Peer ID</td>
                  <td className="px-2 py-1 text-muted">-</td>
                  <td className="px-2 py-1">
                    <FilterableValue
                      value={probe.peer_id_unique_key}
                      field="peer_id_unique_key"
                      onFilter={onFilterClick ? handleFilterAndClose : undefined}
                      className="font-mono text-[10px]"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Probed Columns */}
        {probe.column_indices && probe.column_indices.length > 0 && (
          <div className="border-t border-border pt-4">
            <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider text-foreground uppercase">
              <ListBulletIcon className="size-4 text-primary" />
              Probed Columns
              {onFilterClick && (
                <span className="text-[10px] font-normal text-muted normal-case">(click to filter)</span>
              )}
            </h4>
            <div className="max-h-32 overflow-y-auto rounded border border-border/50 bg-muted/30 p-2">
              <div className="flex flex-wrap gap-1">
                {[...probe.column_indices]
                  .sort((a, b) => a - b)
                  .map(col => (
                    <CopyableBadge
                      key={col}
                      value={col}
                      label="Column"
                      onDrillDown={onFilterClick ? () => handleFilterAndClose('column', col) : undefined}
                    />
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}
