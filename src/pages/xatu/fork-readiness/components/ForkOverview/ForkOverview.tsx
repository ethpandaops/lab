import type { JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { Stats } from '@/components/DataDisplay/Stats';
import { formatEpoch } from '@/utils';
import type { ForkOverviewProps } from './ForkOverview.types';

export function ForkOverview({
  forkName,
  forkEpoch,
  timeRemaining,
  overallReadyPercentage,
  totalNodes,
  readyNodes,
  actionNeededCount,
  readyClientsCount,
  totalClientsCount,
  noMinimumCount,
}: ForkOverviewProps): JSX.Element {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2">
        <h2 className="text-2xl font-bold text-foreground capitalize">
          <Link to="/ethereum/forks/$fork" params={{ fork: forkName }} className="hover:underline">
            {forkName}
          </Link>
        </h2>
        <span className="text-sm/6 text-muted">Epoch {formatEpoch(forkEpoch)}</span>
      </div>

      <Stats
        stats={[
          {
            id: 'overall-readiness',
            name: 'Ready',
            value: `${overallReadyPercentage}%`,
            valueClassName: totalNodes > 0 && actionNeededCount === 0 ? 'text-success' : 'text-warning',
            subtitle: `${readyNodes} of ${totalNodes} Xatu nodes`,
          },
          {
            id: 'ready-clients',
            name: 'Clients ready',
            value: `${readyClientsCount} of ${totalClientsCount}`,
          },
          {
            id: 'action-needed',
            name: 'To upgrade',
            value: actionNeededCount.toString(),
            valueClassName: actionNeededCount === 0 ? 'text-success' : 'text-danger',
            subtitle: 'Xatu nodes',
          },
          ...(noMinimumCount > 0
            ? [
                {
                  id: 'no-minimum',
                  name: 'No minimum version set',
                  value: noMinimumCount.toString(),
                  subtitle: 'Xatu nodes',
                },
              ]
            : []),
          {
            id: 'time-to-fork',
            name: 'Time to fork',
            value: timeRemaining,
          },
        ]}
      />
    </div>
  );
}
