import type { JSX } from 'react';
import { ForkOverview } from '../ForkOverview';
import { ClientReadinessCard } from '../ClientReadinessCard';
import type { ForkSectionProps } from './ForkSection.types';

export function ForkSection({ fork }: ForkSectionProps): JSX.Element {
  return (
    <div className="space-y-6">
      {/* Fork overview stats */}
      <ForkOverview
        forkName={fork.forkName}
        forkEpoch={fork.forkEpoch}
        timeRemaining={fork.timeRemaining}
        overallReadyPercentage={fork.overallReadyPercentage}
        totalNodes={fork.totalNodes}
        readyNodes={fork.readyNodes}
        actionNeededCount={fork.actionNeededCount}
        readyClientsCount={fork.readyClientsCount}
        totalClientsCount={fork.totalClientsCount}
      />

      {/* Client breakdown grid - only show clients with nodes */}
      <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
        {fork.clientReadiness
          .filter(clientData => clientData.totalNodes > 0)
          .map(clientData => (
            <ClientReadinessCard key={clientData.clientName} data={clientData} />
          ))}
      </div>
    </div>
  );
}
