import { type JSX, useState } from 'react';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import type { FctBlockProposerByValidator } from '@/api/types.gen';
import { ValidatorEvents } from '../ValidatorEvents';
import { AttestationDuties } from './AttestationDuties';
import { ProposalDuties } from './ProposalDuties';
import { SyncDuties } from './SyncDuties';
import { InspectSection } from '../InspectSection';

type ActivityTab = 'attestations' | 'proposals' | 'sync' | 'events';

interface ValidatorDutiesProps {
  indices: number[];
  /** Range start and end day (unix seconds, start of day UTC) */
  from: number;
  to: number;
  proposals: FctBlockProposerByValidator[];
}

/**
 * Individual duties (attestations, proposals, sync committee) and lifecycle events for the inspected validators.
 */
export function ValidatorDuties({ indices, from, to, proposals }: ValidatorDutiesProps): JSX.Element {
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
        <ValidatorEvents {...shared} from={from} to={to} />
      ) : tab === 'proposals' ? (
        <ProposalDuties {...shared} proposals={proposals} />
      ) : tab === 'sync' ? (
        <SyncDuties {...shared} from={from} to={to} />
      ) : (
        <AttestationDuties {...shared} from={from} to={to} />
      )}
    </InspectSection>
  );
}
