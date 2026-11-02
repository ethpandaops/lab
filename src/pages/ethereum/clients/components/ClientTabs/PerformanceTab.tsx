import type { JSX } from 'react';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { SHARE_WINDOW_DAYS, SHARE_WINDOW_OPTIONS } from '../../constants';
import { useReferenceEngine } from '../../hooks';
import { windowStart } from '../../utils/client-versions';
import { AttestationPerformance, ProposerBehaviour } from '../ClientBehaviour';
import { ReferenceEngine } from '../ReferenceEngine';
import type { ClientTabProps } from './ClientTabs.types';

/**
 * How the client performs against the others of its layer: blocks proposed with it, attestations of validators
 * running it, and for execution clients, builds on the EIP-7870 reference nodes.
 */
export function PerformanceTab({
  client,
  layer,
  releases,
  shareWindow,
  onShareWindowChange,
}: ClientTabProps): JSX.Element {
  const reference = useReferenceEngine(client, layer === 'execution');
  const days = SHARE_WINDOW_DAYS[shareWindow];
  const from = days === null ? undefined : windowStart(days);
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
      <ProposerBehaviour client={client} layer={layer} from={from} windowControl={windowControl} />
      <AttestationPerformance client={client} layer={layer} from={from} windowControl={windowControl} />
      {layer === 'execution' && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base/7 font-semibold text-foreground">On reference hardware</h2>
          <ReferenceEngine client={client} releases={releases} {...reference} />
        </section>
      )}
    </div>
  );
}
