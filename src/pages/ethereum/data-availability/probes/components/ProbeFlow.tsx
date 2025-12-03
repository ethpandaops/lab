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
  const statusColor = isSuccess ? 'text-green-500' : isFailure ? 'text-red-500' : 'text-yellow-500';
  const statusBg = isSuccess ? 'bg-green-500/10' : isFailure ? 'bg-red-500/10' : 'bg-yellow-500/10';
  const statusBorder = isSuccess ? 'border-green-500/20' : isFailure ? 'border-red-500/20' : 'border-yellow-500/20';

  return (
    <div className="flex flex-nowrap items-center justify-center gap-6 px-4 py-6">
      {/* PROBER (Left) */}
      <div className="flex shrink-0 flex-col items-center gap-2">
        <div className="relative">
          <ClientLogo client={probe.meta_client_implementation || 'Unknown'} size={52} />
          {clientCountryCode && (
            <div className="absolute -right-2 -bottom-1 flex size-6 items-center justify-center rounded-full border border-background bg-surface text-sm shadow-sm">
              {getCountryFlag(clientCountryCode)}
            </div>
          )}
        </div>
        <div className="text-center">
          <div className="text-base font-bold tracking-tight text-foreground">
            {probe.meta_client_implementation || 'Prober'}
          </div>
          <div className="text-xs text-muted">
            {probe.meta_client_geo_city && probe.meta_client_geo_country
              ? `${probe.meta_client_geo_city}, ${probe.meta_client_geo_country}`
              : probe.meta_client_geo_city || probe.meta_client_geo_country || 'Unknown'}
          </div>
        </div>
      </div>

      {/* CONNECTION (Center) */}
      <div className="flex min-w-0 flex-col items-center justify-center gap-4">
        {/* Request Flow (Top) */}
        <div className="flex w-full flex-col items-center gap-0.5">
          <span className="font-mono text-xs font-medium text-foreground">
            {columnsCount} {columnsCount === 1 ? 'Column' : 'Columns'}
          </span>
          <ArrowLongRightIcon className="size-5 text-muted" />
          <span className="text-[10px] font-medium tracking-wider text-muted uppercase">Request</span>
        </div>

        {/* Central Status Node */}
        <div
          className={`relative flex items-center gap-2 rounded-full border ${statusBorder} ${statusBg} px-4 py-1.5 shadow-sm backdrop-blur-sm`}
        >
          {isSuccess ? (
            <CheckCircleIcon className={`size-4 ${statusColor}`} />
          ) : isFailure ? (
            <XCircleIcon className={`size-4 ${statusColor}`} />
          ) : (
            <QuestionMarkCircleIcon className={`size-4 ${statusColor}`} />
          )}
          <div className="flex items-center gap-2 leading-none">
            <span className={`text-xs font-bold tracking-wider uppercase ${statusColor}`}>{probe.result}</span>
            <div className="h-3 w-px bg-border/50" />
            <span className="font-mono text-xs font-medium text-foreground">
              {probe.response_time_ms ? `${probe.response_time_ms}ms` : '---'}
            </span>
          </div>
        </div>

        {/* Response Flow (Bottom) */}
        <div className="flex w-full flex-col items-center gap-0.5">
          <span className="text-[10px] font-medium tracking-wider text-muted uppercase">Response</span>
          <ArrowLongLeftIcon className="size-5 text-muted" />
          <span className="font-mono text-xs font-medium text-foreground">{sizeDisplay}</span>
        </div>
      </div>

      {/* PEER (Right) */}
      <div className="flex shrink-0 flex-col items-center gap-2">
        <div className="relative">
          <ClientLogo client={probe.meta_peer_implementation || 'Unknown'} size={52} />
          {peerCountryCode && (
            <div className="absolute -right-2 -bottom-1 flex size-6 items-center justify-center rounded-full border border-background bg-surface text-sm shadow-sm">
              {getCountryFlag(peerCountryCode)}
            </div>
          )}
        </div>
        <div className="text-center">
          <div className="text-base font-bold tracking-tight text-foreground">
            {probe.meta_peer_implementation || 'Peer'}
          </div>
          <div className="text-xs text-muted">
            {probe.meta_peer_geo_city && probe.meta_peer_geo_country
              ? `${probe.meta_peer_geo_city}, ${probe.meta_peer_geo_country}`
              : probe.meta_peer_geo_city || probe.meta_peer_geo_country || 'Unknown'}
          </div>
        </div>
      </div>
    </div>
  );
}
