import type { JSX } from 'react';
import { useReferenceEngine } from '../../hooks';
import { PENDING_SOURCES } from '../../pending';
import { PendingSource } from '../PendingSource';
import { ReferenceEngine } from '../ReferenceEngine';
import type { ClientTabProps } from './ClientTabs.types';

/**
 * How the client performs: execution clients on the EIP-7870 reference nodes; consensus client views to come.
 */
export function PerformanceTab({ client, layer, releases }: ClientTabProps): JSX.Element {
  const reference = useReferenceEngine(client, layer === 'execution');

  if (layer === 'consensus') {
    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <PendingSource {...PENDING_SOURCES.attestations} />
        <PendingSource {...PENDING_SOURCES.proposerBehaviour} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <ReferenceEngine client={client} releases={releases} {...reference} />
      <PendingSource {...PENDING_SOURCES.proposerBehaviour} />
    </div>
  );
}
