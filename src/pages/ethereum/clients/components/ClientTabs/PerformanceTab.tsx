import type { JSX } from 'react';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { Disclosure } from '@/components/Layout/Disclosure';
import { SHARE_WINDOW_DAYS, SHARE_WINDOW_OPTIONS } from '../../constants';
import { useReferenceEngine } from '../../hooks';
import { windowStart } from '../../utils/client-versions';
import { AttestationPerformance, PerformanceHeadline, ProposerBehaviour } from '../ClientBehaviour';
import { PartnerPerformance } from '../PartnerBreakdown';
import { ReferenceEngine } from '../ReferenceEngine';
import type { ClientTabProps } from './ClientTabs.types';

/**
 * How the client performs: its own proposal and attestation numbers against the network, broken down by its
 * partner on the other layer; then the other clients of its layer for comparison, and for execution clients,
 * builds on the EIP-7870 reference nodes.
 */
export function PerformanceTab({
  client,
  layer,
  releases,
  shareWindow,
  onShareWindowChange,
}: ClientTabProps): JSX.Element {
  const days = SHARE_WINDOW_DAYS[shareWindow];
  const reference = useReferenceEngine(client, layer === 'execution', days ?? undefined);
  const from = days === null ? undefined : windowStart(days);
  const label = layer === 'consensus' ? 'consensus' : 'execution';

  return (
    <div className="flex flex-col gap-4">
      <div className="self-start">
        <SegmentedControl
          options={SHARE_WINDOW_OPTIONS}
          value={shareWindow}
          onChange={onShareWindowChange}
          ariaLabel="Window"
        />
      </div>
      <PerformanceHeadline client={client} layer={layer} from={from} />
      <PartnerPerformance client={client} layer={layer} shareWindow={shareWindow} from={from} />
      <Disclosure title={`Against the other ${label} clients`}>
        <div className="flex flex-col gap-4">
          <ProposerBehaviour client={client} layer={layer} from={from} />
          <AttestationPerformance client={client} layer={layer} from={from} />
        </div>
      </Disclosure>
      {layer === 'execution' && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base/7 font-semibold text-foreground">On reference hardware</h2>
          <ReferenceEngine client={client} releases={releases} {...reference} />
        </section>
      )}
    </div>
  );
}
