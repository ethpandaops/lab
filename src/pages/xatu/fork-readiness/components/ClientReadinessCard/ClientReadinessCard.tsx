import type { JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { Card } from '@/components/Layout/Card';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { Badge } from '@/components/Elements/Badge';
import { ProgressBar } from '@/components/Navigation/ProgressBar';
import { formatNodeName } from '../../utils/node-name-formatter';
import type { ClientReadinessCardProps } from './ClientReadinessCard.types';

export function ClientReadinessCard({ data, forkName }: ClientReadinessCardProps): JSX.Element {
  const { clientName, totalNodes, readyNodes, readyPercentage, minVersion, nodes } = data;

  return (
    <Card
      title={
        <Link
          to="/ethereum/clients/$client"
          params={{ client: clientName }}
          search={forkName ? { fork: forkName } : undefined}
          className="flex items-center gap-2 capitalize hover:underline"
        >
          <ClientLogo client={clientName} size={28} noLink />
          {clientName}
        </Link>
      }
      subtitle={
        <Badge color="gray" variant="flat">
          v{minVersion}+
        </Badge>
      }
      actions={
        <span className="text-2xl/8 font-semibold text-foreground">
          {readyNodes}/{totalNodes}
        </span>
      }
    >
      {/* Progress bar */}
      <div className="mb-4">
        <ProgressBar
          progress={readyPercentage}
          fillColor={readyPercentage === 100 ? 'bg-success' : 'bg-warning'}
          backgroundColor="bg-border"
          ariaLabel={`${clientName} readiness`}
        />
      </div>

      {/* Only the Xatu nodes still to upgrade; the count and bar above cover the rest */}
      {nodes.some(node => !node.isReady) && (
        <div className="mt-4 space-y-2 border-t border-border pt-4">
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
                  <Badge color={node.isReady ? 'green' : 'red'} variant="flat">
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
