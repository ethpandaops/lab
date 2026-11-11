import { type JSX, useState } from 'react';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import type { FctBlockProposerByValidator } from '@/api/types.gen';
import { ValidatorEvents } from '@/pages/ethereum/validators/components/ValidatorEvents';
import { AttestationDuties } from './AttestationDuties';
import { ProposalDuties } from './ProposalDuties';
import { SyncDuties } from './SyncDuties';
import { InspectSection } from '@/pages/ethereum/validators/components/InspectSection';

type ActivityTab = 'attestations' | 'proposals' | 'sync' | 'events';

interface ValidatorDutiesProps {
  indices: number[];
  /** Range start (unix seconds, start of day UTC) */
  from: number;
  /** Exclusive end of the per-slot reads (unix seconds) */
  end: number;
  proposals: FctBlockProposerByValidator[];
}

/**
 * Individual duties (attestations, proposals, sync committee) and lifecycle events for the inspected validators.
 */
export function ValidatorDuties({ indices, from, end, proposals }: ValidatorDutiesProps): JSX.Element {
  const [tab, setTab] = useState<ActivityTab>('attestations');
  const [validator, setValidator] = useState<number | null>(null);
  const tabs = (
    <SegmentedControl
      options={[
        { value: 'attestations', label: 'Attestations' },
        { value: 'proposals', label: 'Proposals' },
        { value: 'sync', label: 'Sync committee' },
        { value: 'events', label: 'Events' },
      ]}
      value={tab}
      onChange={setTab}
      ariaLabel="Activity type"
    />
  );

  const shared = { indices, validator, onValidatorChange: setValidator };
  return (
    <InspectSection title="Activity" actions={tabs}>
      {tab === 'events' ? (
        <ValidatorEvents {...shared} from={from} end={end} />
      ) : tab === 'proposals' ? (
        <ProposalDuties {...shared} proposals={proposals} from={from} />
      ) : tab === 'sync' ? (
        <SyncDuties {...shared} from={from} end={end} />
      ) : (
        <AttestationDuties {...shared} from={from} end={end} />
      )}
    </InspectSection>
  );
}
