import type { JSX } from 'react';
import { Link } from '@tanstack/react-router';
import { ChevronRightIcon } from '@heroicons/react/16/solid';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { SHARE_WINDOW_DAYS, SHARE_WINDOW_OPTIONS } from '../../constants';
import { useReferenceEngine } from '../../hooks';
import { windowStart } from '../../utils/client-versions';
import { PerformanceHeadline } from '../ClientBehaviour';
import { PartnerPerformance } from '../PartnerBreakdown';
import { ReferenceEngine } from '../ReferenceEngine';
import type { ClientTabProps } from './ClientTabs.types';

/**
 * How the client performs: its own proposal and attestation numbers against the network, broken down by its
 * partner on the other layer, and for execution clients, builds on the EIP-7870 reference nodes. The other clients
 * of its layer are compared on the clients overview.
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          options={SHARE_WINDOW_OPTIONS}
          value={shareWindow}
          onChange={onShareWindowChange}
          ariaLabel="Window"
        />
        <Link
          to="/ethereum/clients"
          search={{ t: shareWindow, layer }}
          hash="performance"
          className="inline-flex items-center gap-0.5 text-sm/6 text-primary hover:underline"
        >
          Compare with the other {layer} clients
          <ChevronRightIcon className="size-4" />
        </Link>
      </div>
      <PerformanceHeadline client={client} layer={layer} from={from} />
      <PartnerPerformance client={client} layer={layer} shareWindow={shareWindow} from={from} />
      {layer === 'execution' && (
        <section className="flex flex-col gap-3">
          <h2 className="text-base/7 font-semibold text-foreground">On reference hardware</h2>
          <ReferenceEngine client={client} releases={releases} {...reference} />
        </section>
      )}
    </div>
  );
}
