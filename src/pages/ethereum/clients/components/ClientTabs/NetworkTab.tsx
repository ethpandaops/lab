import type { JSX } from 'react';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { SHARE_WINDOW_DAYS, SHARE_WINDOW_OPTIONS } from '../../constants';
import { usePeerSupport } from '../../hooks';
import { windowStart } from '../../utils/client-versions';
import { CustodyCompliance, EnrReadiness, PeerCensus } from '../Census';
import { PeerSupport } from '../PeerSupport';
import type { ClientTabProps } from './ClientTabs.types';

/**
 * The client on the network: its P2P peers, the next fork its ENRs advertise, and for consensus clients, whether its
 * peers serve the columns they custody and send partial columns.
 */
export function NetworkTab({ client, layer, releases, shareWindow, onShareWindowChange }: ClientTabProps): JSX.Element {
  const peers = usePeerSupport(client, layer === 'consensus');
  const days = SHARE_WINDOW_DAYS[shareWindow];
  // 0 loads the census from its first day; undefined would load only the latest days
  const from = days === null ? 0 : windowStart(days);
  const windowControl = (
    <SegmentedControl
      options={SHARE_WINDOW_OPTIONS}
      value={shareWindow}
      onChange={onShareWindowChange}
      ariaLabel="Window"
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <PeerCensus client={client} layer={layer} from={from} windowControl={windowControl} />
      <EnrReadiness client={client} layer={layer} />
      {layer === 'consensus' && (
        <>
          <CustodyCompliance client={client} from={from} windowControl={windowControl} />
          <PeerSupport
            client={client}
            releases={releases}
            partial={peers.partial}
            partialDay={peers.partialDay}
            isLoading={peers.isLoading}
          />
        </>
      )}
    </div>
  );
}
