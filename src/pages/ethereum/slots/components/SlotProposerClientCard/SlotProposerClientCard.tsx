import type { JSX, ReactNode } from 'react';
import clsx from 'clsx';
import { Card } from '@/components/Layout/Card';
import { Badge } from '@/components/Elements/Badge';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { useNetwork } from '@/hooks/useNetwork';
import {
  GRAFFITI_FORMAT_LABELS,
  UNKNOWN_CLIENT,
  formatClientName,
  type ClientReleaseResolution,
} from '@/utils/graffiti';
import { useSlotProposerClient, type GraffitiCoverage } from '../../hooks/useSlotProposerClient';

export interface SlotProposerClientCardProps {
  slot: number;
  /** Proposer validator index from the slot's proposer data */
  proposerIndex?: number | null;
  /** No block was proposed in the slot */
  isMissedSlot: boolean;
  /** The block was orphaned, so it has no canonical graffiti row */
  isOrphaned: boolean;
  className?: string;
}

/** Formats a unix timestamp as YYYY-MM-DD */
function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

/** Version line for one client: graffiti version, resolved release, or the raw commit with why it did not resolve */
function VersionDetail({
  version,
  commit,
  resolution,
}: {
  version?: string;
  commit?: string;
  resolution: ClientReleaseResolution;
}): JSX.Element {
  const commitText = commit ? <span className="font-mono text-xs/5 text-muted">commit {commit}</span> : null;

  if (version) {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-sm/6 font-semibold text-foreground">{version}</span>
        <span className="text-xs/5 text-muted">from graffiti</span>
        {commitText}
      </div>
    );
  }
  if (resolution.status === 'resolved') {
    const { release } = resolution;
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-sm/6 font-semibold text-foreground">{release.version}</span>
        {release.prerelease && (
          <Badge color="yellow" size="small" variant="flat">
            pre-release
          </Badge>
        )}
        {release.release_date ? (
          <span className="text-xs/5 text-muted">released {formatDate(release.release_date)}</span>
        ) : null}
        {commitText}
      </div>
    );
  }

  let note = 'No version or commit in the graffiti';
  if (resolution.status === 'ambiguous') note = `matches ${resolution.candidates} releases`;
  if (resolution.status === 'unmatched') note = 'no release with this commit';
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      {commitText}
      <span className="text-xs/5 text-muted">{note}</span>
    </div>
  );
}

/** One client column: logo, name and version details */
function ClientPanel({
  layer,
  client,
  version,
  commit,
  resolution,
}: {
  layer: string;
  client: string;
  version?: string;
  commit?: string;
  resolution: ClientReleaseResolution;
}): JSX.Element {
  const isUnknown = client === UNKNOWN_CLIENT;
  return (
    <div className="flex items-start gap-3">
      <ClientLogo client={client} size={32} />
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-xs font-medium text-muted">{layer}</span>
        <span className={clsx('text-base/6 font-semibold', isUnknown ? 'text-muted' : 'text-foreground')}>
          {formatClientName(client)}
        </span>
        {isUnknown ? (
          <span className="text-xs/5 text-muted">The graffiti does not name one</span>
        ) : (
          <VersionDetail version={version} commit={commit} resolution={resolution} />
        )}
      </div>
    </div>
  );
}

/** Message for slots without a parsed graffiti row */
function emptyMessage(
  isMissedSlot: boolean,
  isOrphaned: boolean,
  coverage: GraffitiCoverage,
  network?: string
): string {
  if (isMissedSlot) return 'No block was proposed in this slot, so there is no graffiti.';
  if (coverage === 'not_collected') return `Block graffiti is not collected for ${network ?? 'this network'}.`;
  if (isOrphaned) return 'Graffiti is only parsed for canonical blocks, and this block was orphaned.';
  if (coverage === 'not_yet_processed')
    return 'This block has not been processed yet. Graffiti lands about 30 minutes after the slot.';
  if (coverage === 'before_backfill') return 'Graffiti for this slot has not been backfilled yet.';
  return 'No graffiti was found for this block.';
}

/** Proposer clients and versions parsed from the block graffiti, the raw graffiti, and node name and tags where published. */
export function SlotProposerClientCard({
  slot,
  proposerIndex,
  isMissedSlot,
  isOrphaned,
  className,
}: SlotProposerClientCardProps): JSX.Element {
  const { currentNetwork } = useNetwork();
  const { graffiti, consensusRelease, executionRelease, node, coverage, isLoading, error } = useSlotProposerClient(
    slot,
    proposerIndex
  );

  let body: ReactNode;
  if (isLoading && !isMissedSlot) {
    body = (
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <LoadingContainer className="size-8 rounded-sm" />
            <div className="flex flex-1 flex-col gap-2">
              <LoadingContainer className="h-3 w-20 rounded-xs" />
              <LoadingContainer className="h-5 w-32 rounded-xs" />
              <LoadingContainer className="h-3 w-40 rounded-xs" />
            </div>
          </div>
        ))}
      </div>
    );
  } else if (error) {
    body = <p className="text-sm text-danger">Failed to load the proposer client: {error}</p>;
  } else if (!graffiti) {
    body = (
      <p className="text-sm/6 text-muted">
        {emptyMessage(isMissedSlot, isOrphaned, coverage, currentNetwork?.display_name)}
      </p>
    );
  } else {
    const format = graffiti.graffiti_format ?? '';
    body = (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <ClientPanel
            layer="Consensus client"
            client={graffiti.consensus_client ?? UNKNOWN_CLIENT}
            version={graffiti.consensus_client_version || undefined}
            commit={graffiti.consensus_client_commit || undefined}
            resolution={consensusRelease}
          />
          <ClientPanel
            layer="Execution client"
            client={graffiti.execution_client ?? UNKNOWN_CLIENT}
            commit={graffiti.execution_client_commit || undefined}
            resolution={executionRelease}
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted">Graffiti</span>
            <Badge
              color={format.startsWith('codes') ? 'green' : format === 'none' || format === 'empty' ? 'gray' : 'blue'}
              size="small"
              variant="flat"
            >
              {GRAFFITI_FORMAT_LABELS[format] ?? format}
            </Badge>
          </div>
          {graffiti.graffiti_text ? (
            <code className="rounded-xs bg-background px-3 py-2 font-mono text-sm/6 break-all text-foreground">
              {graffiti.graffiti_text}
            </code>
          ) : (
            <span className="text-sm/6 text-muted">The proposer left the graffiti empty.</span>
          )}
        </div>

        {node?.name && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium text-muted">Node</span>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm/6 text-foreground">{node.name}</span>
              {(node.tags ?? [])
                .filter(tag => !tag.startsWith('source:'))
                .map(tag => (
                  <Badge key={tag} color="indigo" size="small" variant="flat">
                    {tag}
                  </Badge>
                ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card
      rounded
      className={className}
      header={
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base/7 font-semibold text-foreground">Proposer Client</h3>
          <span className="text-xs/5 text-muted">Parsed from the block graffiti</span>
        </div>
      }
    >
      {body}
    </Card>
  );
}
