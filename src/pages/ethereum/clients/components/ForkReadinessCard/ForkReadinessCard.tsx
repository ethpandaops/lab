import type { JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { Card } from '@/components/Layout/Card';
import { Badge } from '@/components/Elements/Badge';
import type { DimClientRelease, FctNodeActiveLast24h } from '@/api/types.gen';
import { meetsMinVersion } from '@/utils/version';
import { formatClientName } from '@/utils/graffiti';
import type { ClientLayer } from '../../utils/client-share';
import { displayVersion, type ResolvedBlock } from '../../utils/client-versions';
import type { ForkRequirement } from '../../utils/fork-requirements';

export interface ForkReadinessCardProps {
  client: string;
  layer: ClientLayer;
  fork: string;
  /** The fork's minimum version for the client, when the config sets one */
  requirement?: ForkRequirement;
  /** The client's blocks; the latest 24 hours are counted */
  blocks: ResolvedBlock[];
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
 * Whether a client is ready for a fork: its minimum version from the network config, and how many blocks and
 * nodes already run it or newer.
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
  const forkLink = (
    <Link to="/ethereum/forks/$fork" params={{ fork }} className="font-medium text-primary capitalize hover:underline">
      {fork}
    </Link>
  );

  if (!requirement) {
    return (
      <Card rounded title={<span className="flex items-center gap-1">{forkLink} readiness</span>}>
        <p className="text-sm/6 text-muted">
          The network config sets no minimum {formatClientName(client)} version for this fork.
        </p>
      </Card>
    );
  }

  const latestBlock = blocks.length > 0 ? blocks[blocks.length - 1].time : 0;
  const recent = blocks.filter(block => block.version && block.time > latestBlock - 24 * 3600);
  const readyBlocks = recent.filter(block => meetsMinVersion(block.version!, requirement.minVersion)).length;
  const nodeVersions = nodes.map(node =>
    displayVersion(layer === 'consensus' ? node.meta_consensus_version : undefined, releases)
  );
  const countedNodes = nodeVersions.filter(Boolean);
  const readyNodes = countedNodes.filter(nodeVersion => meetsMinVersion(nodeVersion, requirement.minVersion)).length;
  const versionReady = version ? meetsMinVersion(version, requirement.minVersion) : undefined;

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
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <dt className="text-xs/5 text-muted">Minimum version</dt>
          <dd className="font-mono text-sm/6 font-medium text-foreground">{requirement.minVersion}</dd>
        </div>
        {version && (
          <div>
            <dt className="text-xs/5 text-muted">{version}</dt>
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
            {formatShare(readyBlocks, recent.length)}
          </dd>
        </div>
        <div>
          <dt className="text-xs/5 text-muted">Our nodes on a ready version</dt>
          <dd className="text-sm/6 font-medium text-foreground tabular-nums">
            {layer === 'consensus' ? formatShare(readyNodes, countedNodes.length) : '-'}
          </dd>
        </div>
      </dl>
    </Card>
  );
}
