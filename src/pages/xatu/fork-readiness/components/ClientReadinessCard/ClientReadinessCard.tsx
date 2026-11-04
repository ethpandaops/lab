import type { JSX } from 'react';
import { Link } from '@tanstack/react-router';
import clsx from 'clsx';
import { Card } from '@/components/Layout/Card';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { Badge } from '@/components/Elements/Badge';
import { ProgressBar } from '@/components/Navigation/ProgressBar';
import { isKnownClient } from '@/utils/ethereum';
import { formatNodeName } from '../../utils/node-name-formatter';
import type { ClientReadinessCardProps } from './ClientReadinessCard.types';

export function ClientReadinessCard({ data, forkName }: ClientReadinessCardProps): JSX.Element {
  const { clientName, totalNodes, readyNodes, readyPercentage, minVersion, nodes } = data;
  const hasMinimum = minVersion !== null;

  return (
    <Card
      title={
        isKnownClient(clientName) ? (
          <Link
            to="/ethereum/clients/$client"
            params={{ client: clientName }}
            search={forkName ? { fork: forkName } : undefined}
            className="flex items-center gap-2 capitalize hover:underline"
          >
            <ClientLogo client={clientName} size={28} noLink />
            {clientName}
          </Link>
        ) : (
          <span className="flex items-center gap-2 capitalize">
            <ClientLogo client={clientName} size={28} noLink />
            {clientName}
          </span>
        )
      }
      subtitle={
        hasMinimum ? (
          <Badge color="gray" variant="flat">
            v{minVersion}+
          </Badge>
        ) : (
          'No minimum version set'
        )
      }
      actions={
        <span className="text-right">
          <span className="block text-2xl/8 font-semibold text-foreground">
            {hasMinimum ? `${readyNodes} of ${totalNodes}` : totalNodes}
          </span>
          <span className="block text-xs/5 text-muted">Xatu nodes</span>
        </span>
      }
    >
      {hasMinimum && (
        <div className="mb-4">
          <ProgressBar
            progress={readyPercentage}
            fillColor={readyPercentage === 100 ? 'bg-success' : 'bg-warning'}
            backgroundColor="bg-border"
            ariaLabel={`${clientName} readiness`}
          />
        </div>
      )}

      {/* Only the Xatu nodes still to upgrade, or every node when there's no minimum to judge them by */}
      {nodes.some(node => !node.isReady) && (
        <div className={clsx('space-y-2', hasMinimum && 'mt-4 border-t border-border pt-4')}>
          {nodes
            .filter(node => !node.isReady)
            .map(node => (
              <div key={node.nodeName} className="flex items-center gap-3 text-xs/5">
                {node.nodeId ? (
                  <Link
                    to="/xatu/nodes/$nodeId"
                    params={{ nodeId: node.nodeId }}
                    className="min-w-0 flex-1 truncate pr-8 text-primary hover:underline"
                  >
                    {formatNodeName(node.nodeName)}
                  </Link>
                ) : (
                  <span className="min-w-0 flex-1 truncate pr-8 text-foreground">{formatNodeName(node.nodeName)}</span>
                )}
                <span className="shrink-0">
                  <Badge color={hasMinimum ? 'red' : 'gray'} variant="flat">
                    {node.version}
                  </Badge>
                </span>
              </div>
            ))}
        </div>
      )}
    </Card>
  );
}
