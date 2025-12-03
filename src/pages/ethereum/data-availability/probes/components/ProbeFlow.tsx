import { type JSX } from 'react';
import {
  CheckCircleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
  ArrowLongRightIcon,
  ArrowLongLeftIcon,
} from '@heroicons/react/24/solid';
import { type IntCustodyProbe } from '@/api/types.gen';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { getCountryFlag } from '@/utils/country';

type ProbeFlowProps = {
  probe: IntCustodyProbe;
};

export function ProbeFlow({ probe }: ProbeFlowProps): JSX.Element {
  const isSuccess = probe.result === 'success';
  const isFailure = probe.result === 'failure';

  // Calculate total data requested
  const columnsCount = probe.column_indices?.length ?? 0;
  const cellsCount = columnsCount;
  const cellSizeKiB = 2;
  const totalSizeKiB = cellsCount * cellSizeKiB;
  const totalSizeMiB = totalSizeKiB / 1024;
  const sizeDisplay = totalSizeMiB >= 1 ? `${totalSizeMiB.toFixed(1)} MiB` : `${totalSizeKiB} KiB`;

  // Get country codes for flags
  const clientCountryCode = probe.meta_client_geo_country_code;
  const peerCountryCode = probe.meta_peer_geo_country_code;

  // Status colors
  // failure = yellow (transient/one-off failure - less severe)
  // missing = red (peer responded but didn't have the data - serious)
  const statusColor = isSuccess ? 'text-green-500' : isFailure ? 'text-yellow-500' : 'text-red-500';
  const statusBg = isSuccess ? 'bg-green-500/10' : isFailure ? 'bg-yellow-500/10' : 'bg-red-500/10';
  const statusBorder = isSuccess ? 'border-green-500/20' : isFailure ? 'border-yellow-500/20' : 'border-red-500/20';

  return (
    <div className="flex flex-col items-center gap-4 px-2 py-4 sm:flex-row sm:flex-nowrap sm:justify-center sm:gap-6 sm:px-4 sm:py-6">
      {/* PROBER (Left on desktop, Top on mobile) */}
      <div className="flex shrink-0 flex-col items-center gap-2">
        <div className="relative">
          <ClientLogo client={probe.meta_client_implementation || 'Unknown'} size={44} className="sm:size-[52px]" />
          {clientCountryCode && (
            <div className="absolute -right-2 -bottom-1 flex size-5 items-center justify-center rounded-full border border-background bg-surface text-xs shadow-xs sm:size-6 sm:text-sm">
              {getCountryFlag(clientCountryCode)}
            </div>
          )}
        </div>
        <div className="text-center">
          <div className="text-sm font-bold tracking-tight text-foreground sm:text-base">
            {probe.meta_client_implementation || 'Prober'}
          </div>
          <div className="max-w-[120px] truncate text-[10px] text-muted sm:max-w-none sm:text-xs">
            {probe.meta_client_geo_city && probe.meta_client_geo_country
              ? `${probe.meta_client_geo_city}, ${probe.meta_client_geo_country}`
              : probe.meta_client_geo_city || probe.meta_client_geo_country || 'Unknown'}
          </div>
        </div>
      </div>

      {/* CONNECTION (Center on desktop, Middle on mobile) */}
      <div className="flex min-w-0 flex-col items-center justify-center gap-2 sm:gap-4">
        {/* Request Flow (Top) - hidden on mobile, shown inline in status */}
        <div className="hidden w-full flex-col items-center gap-0.5 sm:flex">
          <span className="font-mono text-xs font-medium text-foreground">
            {columnsCount} {columnsCount === 1 ? 'Column' : 'Columns'}
          </span>
          <ArrowLongRightIcon className="size-5 text-muted" />
          <span className="text-[10px] font-medium tracking-wider text-muted uppercase">Request</span>
        </div>

        {/* Central Status Node */}
        <div
          className={`relative flex flex-col items-center gap-1.5 rounded-lg border px-3 py-2 shadow-xs backdrop-blur-sm sm:flex-row sm:gap-2 sm:rounded-full sm:px-4 sm:py-1.5 ${statusBorder} ${statusBg}`}
        >
          <div className="flex items-center gap-2">
            {isSuccess ? (
              <CheckCircleIcon className={`size-4 ${statusColor}`} />
            ) : isFailure ? (
              <XCircleIcon className={`size-4 ${statusColor}`} />
            ) : (
              <QuestionMarkCircleIcon className={`size-4 ${statusColor}`} />
            )}
            <span className={`text-xs font-bold tracking-wider uppercase ${statusColor}`}>{probe.result}</span>
          </div>
          <div className="flex items-center gap-2 leading-none">
            <div className="hidden h-3 w-px bg-border/50 sm:block" />
            <span className="font-mono text-[10px] font-medium text-foreground sm:text-xs">
              {probe.response_time_ms ? `${probe.response_time_ms}ms` : '---'}
            </span>
            <div className="h-3 w-px bg-border/50 sm:hidden" />
            <span className="font-mono text-[10px] font-medium text-foreground sm:hidden">
              {columnsCount} col{columnsCount !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Response Flow (Bottom) - hidden on mobile */}
        <div className="hidden w-full flex-col items-center gap-0.5 sm:flex">
          <span className="text-[10px] font-medium tracking-wider text-muted uppercase">Response</span>
          <ArrowLongLeftIcon className="size-5 text-muted" />
          <span className="font-mono text-xs font-medium text-foreground">{sizeDisplay}</span>
        </div>
      </div>

      {/* PEER (Right on desktop, Bottom on mobile) */}
      <div className="flex shrink-0 flex-col items-center gap-2">
        <div className="relative">
          <ClientLogo client={probe.meta_peer_implementation || 'Unknown'} size={44} className="sm:size-[52px]" />
          {peerCountryCode && (
            <div className="absolute -right-2 -bottom-1 flex size-5 items-center justify-center rounded-full border border-background bg-surface text-xs shadow-xs sm:size-6 sm:text-sm">
              {getCountryFlag(peerCountryCode)}
            </div>
          )}
        </div>
        <div className="text-center">
          <div className="text-sm font-bold tracking-tight text-foreground sm:text-base">
            {probe.meta_peer_implementation || 'Peer'}
          </div>
          <div className="max-w-[120px] truncate text-[10px] text-muted sm:max-w-none sm:text-xs">
            {probe.meta_peer_geo_city && probe.meta_peer_geo_country
              ? `${probe.meta_peer_geo_city}, ${probe.meta_peer_geo_country}`
              : probe.meta_peer_geo_city || probe.meta_peer_geo_country || 'Unknown'}
          </div>
        </div>
      </div>
    </div>
  );
}
