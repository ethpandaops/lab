import type { JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { Card } from '@/components/Layout/Card';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { Badge } from '@/components/Elements/Badge';
import { ProgressBar } from '@/components/Navigation/ProgressBar';
import { formatNodeName } from '../../utils/node-name-formatter';
import type { ClientReadinessCardProps } from './ClientReadinessCard.types';

export function ClientReadinessCard({ data }: ClientReadinessCardProps): JSX.Element {
  const { clientName, totalNodes, readyNodes, readyPercentage, minVersion, nodes } = data;

  return (
    <Card className="p-6">
      {/* Header: Client logo + name + ready count */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClientLogo client={clientName} size={48} />
          <div>
            <h3 className="text-lg font-semibold text-foreground capitalize">{clientName}</h3>
            <Badge color="gray" variant="flat">
              v{minVersion}+
            </Badge>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-foreground">
            {readyNodes}/{totalNodes}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="-mt-2 mb-4">
        <ProgressBar
          progress={readyPercentage}
          fillColor={readyPercentage === 100 ? 'bg-success' : 'bg-warning'}
          backgroundColor="bg-zinc-800"
          ariaLabel={`${clientName} readiness`}
        />
      </div>

      {/* Node list - always show all nodes */}
      <div className="mt-4 space-y-2 border-t border-border pt-4">
        {nodes.map(node => (
          <div key={node.nodeName} className="flex items-center gap-3 text-xs/5">
            {node.username ? (
              <Link
                to="/xatu/contributors/$id"
                params={{ id: node.username }}
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
    </Card>
  );
}
