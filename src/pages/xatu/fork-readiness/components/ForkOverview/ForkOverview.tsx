import type { JSX } from 'react';
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
}: ForkOverviewProps): JSX.Element {
  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-2">
        <h2 className="text-2xl font-bold text-foreground capitalize">{forkName}</h2>
        <span className="text-sm/6 text-muted">Epoch {formatEpoch(forkEpoch)}</span>
      </div>

      <Stats
        stats={[
          {
            id: 'overall-readiness',
            name: 'Overall Readiness',
            value: `${overallReadyPercentage}%`,
            delta: {
              value: `${readyNodes}/${totalNodes} nodes`,
              type: 'neutral',
            },
          },
          {
            id: 'ready-clients',
            name: 'Ready Clients',
            value: `${readyClientsCount}/${totalClientsCount}`,
          },
          {
            id: 'action-needed',
            name: 'Action Needed',
            value: actionNeededCount.toString(),
            delta: {
              value: 'nodes to update',
              type: actionNeededCount > 0 ? 'decrease' : 'neutral',
            },
          },
          {
            id: 'time-to-fork',
            name: 'Time to Fork',
            value: timeRemaining,
          },
        ]}
      />
    </div>
  );
}
