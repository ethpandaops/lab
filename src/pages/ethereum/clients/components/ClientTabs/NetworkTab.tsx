import type { JSX } from 'react';
import { usePeerSupport } from '../../hooks';
import { PENDING_SOURCES } from '../../pending';
import { PeerSupport } from '../PeerSupport';
import { PendingSource } from '../PendingSource';
import type { ClientTabProps } from './ClientTabs.types';

/**
 * The client on the P2P network: what our sentries and probers see of its peers, and the census views to come.
 */
export function NetworkTab({ client, layer, releases }: ClientTabProps): JSX.Element {
  const peers = usePeerSupport(client, layer === 'consensus');

  return (
    <div className="flex flex-col gap-6">
      {layer === 'consensus' && (
        <PeerSupport
          client={client}
          releases={releases}
          partial={peers.partial}
          partialDay={peers.partialDay}
          probes={peers.probes}
          isLoading={peers.isLoading}
        />
      )}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {layer === 'consensus' && <PendingSource {...PENDING_SOURCES.nodeCensus} />}
        <PendingSource {...PENDING_SOURCES.enrCrawl} />
        <PendingSource {...PENDING_SOURCES.enrForkReadiness} />
        {layer === 'consensus' ? (
          <PendingSource {...PENDING_SOURCES.custodyCompliance} />
        ) : (
          <PendingSource {...PENDING_SOURCES.ipPairings} />
        )}
      </div>
    </div>
  );
}
