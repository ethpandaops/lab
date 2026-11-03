import type { JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { Card } from '@/components/Layout/Card';
import { Badge } from '@/components/Elements/Badge';
import type { DimClientRelease, FctNodeActiveLast24h } from '@/api/types.gen';
import { meetsMinVersion } from '@/utils/version';
import { CENSUS_TABLES, RESOLVED_STATUSES, type FctPeerCountByElClientDaily } from '../../api/client-models';
import { useCensus } from '../../hooks/useCensus';
import { sum } from '../../utils/census';
import type { ClientLayer } from '../../utils/client-share';
import { displayVersion, type VersionCount } from '../../utils/client-versions';
import type { ForkRequirement } from '../../utils/fork-requirements';

export interface ForkReadinessCardProps {
  client: string;
  layer: ClientLayer;
  fork: string;
  /** The fork's minimum version for the client, when the config sets one */
  requirement?: ForkRequirement;
  /** Version counts over the last 24 hours */
  blocks: VersionCount[];
  /** Xatu nodes running the client, active in the last 24 hours */
  nodes: FctNodeActiveLast24h[];
  releases: DimClientRelease[];
  /** Version the page is about, checked against the minimum */
  version?: string;
}

/** Formats a share, or a dash when nothing was counted */
function formatShare(part: number, total: number): string {
  return total > 0 ? `${((part / total) * 100).toFixed(1)}%` : '-';
}

/**
 * Whether a client is ready for a fork: its minimum version from the network config, and how many of its proposed
 * blocks, P2P peers on the latest full census day and Xatu nodes already run it or newer. P2P peers count only when
 * their build resolved to a release.
 */
export function ForkReadinessCard({
  client,
  layer,
  fork,
  requirement,
  blocks,
  nodes,
  releases,
  version,
}: ForkReadinessCardProps): JSX.Element {
  const peers = useCensus<FctPeerCountByElClientDaily>(
    layer === 'consensus' ? CENSUS_TABLES.clPeers : CENSUS_TABLES.elPeers,
    requirement ? { client_eq: client } : null
  );
  const forkLink = (
    <Link to="/ethereum/forks/$fork" params={{ fork }} className="font-medium text-primary capitalize hover:underline">
      {fork}
    </Link>
  );

  if (!requirement) {
    return (
      <Card rounded title={<span className="flex items-center gap-1">{forkLink} readiness</span>}>
        <p className="text-sm/6 text-muted">This fork sets no minimum version for this client.</p>
      </Card>
    );
  }

  const recent = blocks.filter(block => block.version);
  const recentTotal = recent.reduce((sum, row) => sum + row.count, 0);
  const readyBlocks = recent
    .filter(block => meetsMinVersion(block.version!, requirement.minVersion))
    .reduce((sum, row) => sum + row.count, 0);
  const nodeVersions = nodes.map(node =>
    displayVersion(layer === 'consensus' ? node.meta_consensus_version : undefined, releases)
  );
  const countedNodes = nodeVersions.filter(Boolean);
  const readyNodes = countedNodes.filter(nodeVersion => meetsMinVersion(nodeVersion, requirement.minVersion)).length;
  const versionReady = version ? meetsMinVersion(version, requirement.minVersion) : undefined;
  const resolvedPeers = peers.latest.filter(row => row.version && RESOLVED_STATUSES.has(row.release_status ?? ''));
  const readyPeers = sum(
    resolvedPeers.filter(row => meetsMinVersion(row.version!, requirement.minVersion)),
    row => row.peer_count
  );

  return (
    <Card
      rounded
      title={<span className="flex items-center gap-1">{forkLink} readiness</span>}
      actions={
        <Link to="/xatu/fork-readiness" className="text-sm text-primary hover:underline">
          All clients
        </Link>
      }
    >
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <div>
          <dt className="text-xs/5 text-muted">Minimum version</dt>
          <dd className="font-mono text-sm/6 font-medium text-foreground">{requirement.minVersion}</dd>
        </div>
        {version && (
          <div>
            <dt className="text-xs/5 text-muted">This version</dt>
            <dd>
              <Badge color={versionReady ? 'green' : 'red'} size="small" variant="flat">
                {versionReady ? 'Ready' : 'Below minimum'}
              </Badge>
            </dd>
          </div>
        )}
        <div>
          <dt className="text-xs/5 text-muted">Blocks on a ready version, last 24h</dt>
          <dd className="text-sm/6 font-medium text-foreground tabular-nums">
            {formatShare(readyBlocks, recentTotal)}
          </dd>
        </div>
        <div>
          <dt className="text-xs/5 text-muted">P2P peers on a ready version{peers.day ? `, ${peers.day}` : ''}</dt>
          <dd className="text-sm/6 font-medium text-foreground tabular-nums">
            {peers.isLoading
              ? '…'
              : formatShare(
                  readyPeers,
                  sum(resolvedPeers, row => row.peer_count)
                )}
          </dd>
        </div>
        <div>
          <dt className="text-xs/5 text-muted">Xatu nodes on a ready version, last 24h</dt>
          <dd className="text-sm/6 font-medium text-foreground tabular-nums">
            {layer === 'consensus' ? formatShare(readyNodes, countedNodes.length) : '-'}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
