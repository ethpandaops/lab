import { type JSX, useState } from 'react';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import type {
  FctBlockProposerByValidator,
  FctSyncCommitteeParticipationByValidatorDaily,
  FctValidatorBalanceDaily,
} from '@/api/types.gen';
import type { ValidatorIdentity } from '../../hooks/useValidatorIdentity';
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
  balances: FctValidatorBalanceDaily[];
  sync: FctSyncCommitteeParticipationByValidatorDaily[];
  identities: ValidatorIdentity[];
}

/**
 * Individual duties (attestations, proposals, sync committee) and lifecycle events for the inspected validators.
 */
export function ValidatorDuties({
  indices,
  from,
  to,
  proposals,
  balances,
  sync,
  identities,
}: ValidatorDutiesProps): JSX.Element {
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

  // Latest balance row on or before the duty's day; rows may be daily or weekly
  const effectiveBalanceEth = (validatorIndex: number, timestamp: number): number => {
    const day = new Date(timestamp * 1000).toISOString().slice(0, 10);
    let best: FctValidatorBalanceDaily | undefined;
    for (const b of balances) {
      if (b.validator_index !== validatorIndex || (b.day_start_date ?? '') > day) continue;
      if (!best || (b.day_start_date ?? '') > (best.day_start_date ?? '')) best = b;
    }
    return best?.effective_balance ? best.effective_balance / 1e9 : 32;
  };

  const shared = { indices, validator, onValidatorChange: setValidator };
  return (
    <InspectSection title="Activity" actions={tabs}>
      {tab === 'events' ? (
        <ValidatorEvents {...shared} identities={identities} balances={balances} sync={sync} proposals={proposals} />
      ) : tab === 'proposals' ? (
        <ProposalDuties {...shared} proposals={proposals} />
      ) : tab === 'sync' ? (
        <SyncDuties {...shared} from={from} to={to} />
      ) : (
        <AttestationDuties {...shared} from={from} to={to} effectiveBalanceEth={effectiveBalanceEth} />
      )}
    </InspectSection>
  );
}
