import { type JSX, useMemo } from 'react';
import clsx from 'clsx';
import { CheckCircleIcon, XCircleIcon, QuestionMarkCircleIcon, EyeIcon } from '@heroicons/react/24/outline';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { BlobPosterLogo } from '@/components/Ethereum/BlobPosterLogo';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { getCountryFlag } from '@/utils/country';
import { formatSlot } from '@/utils';
import type { ProbeEventRowProps } from './ProbeEventRow.types';

/**
 * Result icon based on probe result
 * - success (green): peer responded with valid data
 * - failure (yellow): transient/one-off failure, probe didn't complete (less severe)
 * - missing (red): peer responded but didn't have the data (serious - they should have it)
 */
function ResultIcon({ result }: { result?: string }): JSX.Element {
  if (result === 'success') {
    return <CheckCircleIcon className="size-4 text-green-500" />;
  }
  if (result === 'failure') {
    return <XCircleIcon className="size-4 text-yellow-500" />;
  }
  return <QuestionMarkCircleIcon className="size-4 text-red-500" />;
}

/**
 * Shared probe event row component
 * Used by LiveProbeEvents and CellProbeDialog for consistent probe display
 */
export function ProbeEventRow({ probe, onClick, isNew, showViewIcon }: ProbeEventRowProps): JSX.Element {
  const slot = probe.slot;
  const columnsCount = probe.column_indices?.length ?? 0;

  // Peer details
  const peerClient = probe.meta_peer_implementation || 'Unknown';
  const peerCountryCode = probe.meta_peer_geo_country_code;

  // Blob posters (deduplicated, max 5 shown)
  const blobPosters = useMemo(() => {
    const posters = probe.blob_submitters ?? [];
    const unique = [...new Set(posters.filter(p => p && p !== 'Unknown'))];
    return unique.slice(0, 5);
  }, [probe.blob_submitters]);
  const remainingCount = Math.max(
    0,
    [...new Set((probe.blob_submitters ?? []).filter(p => p && p !== 'Unknown'))].length - 5
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'group flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-left transition-all hover:bg-muted/30',
        isNew && 'animate-highlight-new'
      )}
    >
      {/* Left: Client logo with country flag overlay */}
      <div className="relative shrink-0">
        <ClientLogo client={peerClient} size={28} />
        {peerCountryCode && (
          <div className="absolute -right-1.5 -bottom-1 flex size-4 items-center justify-center rounded-full border border-background bg-surface text-[10px] shadow-xs">
            {getCountryFlag(peerCountryCode)}
          </div>
        )}
      </div>

      {/* Middle: Details */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* Row 1: Client name - slot, result */}
        <div className="flex w-full items-center gap-1.5 text-xs">
          <span className="truncate font-medium text-foreground">{peerClient}</span>
          <span className="text-muted">·</span>
          <span className="font-mono text-muted">{slot !== undefined ? formatSlot(slot) : '?'}</span>
          <div className="flex-1" />
          <ResultIcon result={probe.result} />
        </div>

        {/* Row 2: Columns, blob posters, time */}
        <div className="flex w-full items-center gap-1.5 text-[10px] text-muted">
          <span>{columnsCount} cols</span>
          {blobPosters.length > 0 && (
            <>
              <span>·</span>
              <div className="flex items-center gap-1">
                {blobPosters.map(poster => (
                  <BlobPosterLogo key={poster} poster={poster} size={16} className="shrink-0" />
                ))}
                {remainingCount > 0 && <span className="shrink-0 text-[9px] text-muted">+{remainingCount}</span>}
              </div>
            </>
          )}
          <div className="flex-1" />
          <Timestamp
            timestamp={probe.probe_date_time ?? 0}
            format="relative"
            className="!p-0 text-[10px] !text-muted"
            disableModal
          />
        </div>
      </div>

      {/* Optional: View icon */}
      {showViewIcon && (
        <div className="flex shrink-0 items-center self-center rounded-sm bg-accent/10 p-1.5 text-accent transition-all group-hover:bg-accent/20">
          <EyeIcon className="size-4" />
        </div>
      )}
    </button>
  );
}
