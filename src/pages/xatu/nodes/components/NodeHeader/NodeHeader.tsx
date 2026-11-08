import type { JSX, ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import clsx from 'clsx';
import { CopyToClipboard } from '@/components/Elements/CopyToClipboard';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { Card } from '@/components/Layout/Card';
import { getClassificationBadgeClasses, getClassificationLabel } from '@/utils';
import { CountryFlag } from '@/components/Elements/CountryFlag';
import type { NodeRow } from '../../hooks/useNodeRows';
import { formatMs, formatNodeLocation, shortVersion, type SyncState } from '../../utils/node-stats';
import { NodeStatus } from '../NodeStatus';
import { NodeClientVersion } from '@/pages/ethereum/clients/components/NodeClientVersion';

export interface NodeHeaderProps {
  row: NodeRow;
  /** Execution client seen in the node's engine API calls */
  execution: { implementation: string; version: string } | null;
  /** Whether the node keeps up with the chain over its latest slots; null when unknown or offline */
  sync?: { state: SyncState; lagMs: number | null } | null;
}

const SYNC_LABELS: Record<SyncState, string> = {
  'in-sync': 'In sync',
  'catching-up': 'Catching up',
  'missing-blocks': 'Missing recent blocks',
};

function Detail({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div className="min-w-0">
      <dt className="text-xs/5 font-medium text-muted">{label}</dt>
      <dd className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-sm/6 text-foreground">{children}</dd>
    </div>
  );
}

/**
 * Node identity: client, ID, status and owner, then the node's software, location and network.
 */
export function NodeHeader({ row, execution, sync }: NodeHeaderProps): JSX.Element {
  const { node, nodeId, online } = row;
  const client = node.meta_consensus_implementation;
  const classification = node.classification || 'unclassified';
  // Engine events report geth as "Go-ethereum"
  const executionName = execution?.implementation.toLowerCase().replace('go-ethereum', 'geth') ?? '';

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-4">
        {client && <ClientLogo client={client} size={44} />}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="min-w-0 font-mono text-lg/7 font-semibold wrap-anywhere text-foreground">{nodeId}</h1>
            <CopyToClipboard content={nodeId} />
            <NodeStatus online={online} showLabel />
            {sync && (
              <span
                className={clsx(
                  'inline-flex items-center rounded-xs px-1.5 py-0.5 text-xs font-medium inset-ring',
                  sync.state === 'in-sync'
                    ? 'bg-muted/10 text-muted inset-ring-border'
                    : 'bg-warning/10 text-warning inset-ring-warning/20'
                )}
                title={sync.state === 'catching-up' ? `${formatMs(sync.lagMs)} behind the network median` : undefined}
              >
                {SYNC_LABELS[sync.state]}
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm/6 text-muted">
            {node.username && (
              <>
                <span>Run by</span>
                <Link
                  to="/xatu/nodes"
                  search={{ contributor: node.username }}
                  className="font-medium text-foreground hover:text-primary"
                >
                  {node.username}
                </Link>
              </>
            )}
            <span
              className={clsx(
                'inline-flex items-center rounded-xs px-1.5 py-0.5 text-xs font-medium inset-ring',
                getClassificationBadgeClasses(classification)
              )}
            >
              {getClassificationLabel(classification)}
            </span>
          </div>
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-4 md:grid-cols-3 xl:grid-cols-6">
        <Detail label="Consensus client">
          {client ? <NodeClientVersion client={client} version={node.meta_consensus_version} showNewer /> : '–'}
        </Detail>
        {execution && (
          <Detail label="Execution client">
            <NodeClientVersion client={executionName} version={execution.version} />
          </Detail>
        )}
        <Detail label="Collector">
          <span>{node.meta_client_implementation}</span>
          <span className="text-muted" title={node.meta_client_version}>
            {shortVersion(node.meta_client_version)}
          </span>
        </Detail>
        <Detail label="Location">
          <span>
            <CountryFlag code={node.meta_client_geo_country_code} /> {formatNodeLocation(node)}
          </span>
        </Detail>
        <Detail label="Network">
          <span>{node.meta_client_geo_autonomous_system_organization || '–'}</span>
          {node.meta_client_geo_autonomous_system_number ? (
            <span className="text-muted">AS{node.meta_client_geo_autonomous_system_number}</span>
          ) : null}
        </Detail>
        <Detail label="Last seen">
          {node.last_seen_date_time ? <Timestamp timestamp={node.last_seen_date_time} format="relative" /> : '–'}
        </Detail>
      </dl>
    </Card>
  );
}
