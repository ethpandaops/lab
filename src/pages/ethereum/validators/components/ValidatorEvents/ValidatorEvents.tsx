import { type JSX, useMemo, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import type { DataTableColumn } from '@/components/DataTable';
import { SelectMenu } from '@/components/Forms/SelectMenu';
import { useNetwork } from '@/hooks/useNetwork';
import { epochToTimestamp } from '@/utils';
import type {
  FctBlockProposerByValidator,
  FctSyncCommitteeParticipationByValidatorDaily,
  FctValidatorBalanceDaily,
} from '@/api/types.gen';
import type { ValidatorIdentity } from '../../hooks/useValidatorIdentity';
import { estimateRewards } from '../../utils/rewards';
import { MockBadge } from '../MockBadge';
import { TableCard, TableSearch, ValidatorFilter } from '../TableCard';

const CAPELLA_EPOCH = 194_048;
const ELECTRA_EPOCH = 364_032;

interface ValidatorEventsProps {
  identities: ValidatorIdentity[];
  balances: FctValidatorBalanceDaily[];
  sync: FctSyncCommitteeParticipationByValidatorDaily[];
  proposals: FctBlockProposerByValidator[];
  validator: number | null;
  onValidatorChange: (validator: number | null) => void;
}

interface ActivityEvent {
  key: string;
  timestamp: number;
  validatorIndex: number;
  kind: string;
  detail: string;
  amount?: string;
}

/** Stable pseudo-random fraction per validator for mocked event timing */
const hashFraction = (n: number, salt: number): number =>
  (((Math.sin(n * 12.9898 + salt * 78.233) * 43758.5453) % 1) + 1) % 1;

const dateLabel = (ts: number): string =>
  new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/** Lifecycle events for the validators, newest first */
function buildEvents(
  identities: ValidatorIdentity[],
  balances: FctValidatorBalanceDaily[],
  sync: FctSyncCommitteeParticipationByValidatorDaily[],
  proposals: FctBlockProposerByValidator[],
  genesis: number
): ActivityEvent[] {
  const at = (epoch: number): number => epochToTimestamp(epoch, genesis);
  const { withdrawals } = estimateRewards(balances, sync, proposals);

  const events: ActivityEvent[] = [];
  for (const v of identities) {
    if (v.activationEligibilityEpoch !== null) {
      events.push({
        key: `${v.index}-deposit`,
        timestamp: at(Math.max(0, v.activationEligibilityEpoch - 1)),
        validatorIndex: v.index,
        kind: 'Deposit',
        detail: '',
        amount: '32 ETH',
      });
    }
    if (v.activationEpoch !== null) {
      events.push({
        key: `${v.index}-active`,
        timestamp: at(v.activationEpoch),
        validatorIndex: v.index,
        kind: 'Activated',
        detail: `Epoch ${v.activationEpoch}`,
      });
    }
    if (v.credentialType !== '0x00' && (v.activationEpoch ?? 0) < CAPELLA_EPOCH) {
      events.push({
        key: `${v.index}-bls`,
        timestamp: at(CAPELLA_EPOCH + Math.floor(hashFraction(v.index, 1) * 15_000)),
        validatorIndex: v.index,
        kind: 'Credential change',
        detail: '0x00 → 0x01',
      });
    }
    if (v.credentialType === '0x02') {
      const ts = at(ELECTRA_EPOCH + Math.floor(hashFraction(v.index, 2) * 80_000));
      events.push({
        key: `${v.index}-compound`,
        timestamp: ts,
        validatorIndex: v.index,
        kind: 'Credential change',
        detail: '0x01 → 0x02',
      });
      const merged = Math.floor((v.effectiveBalanceEth - 32) / 32);
      for (let i = 0; i < Math.min(merged, 3); i++) {
        events.push({
          key: `${v.index}-consolidation-${i}`,
          timestamp: ts + (i + 1) * 86_400 * 3,
          validatorIndex: v.index,
          kind: 'Consolidation',
          detail: `From validator ${v.index + 1 + Math.floor(hashFraction(v.index, i + 3) * 400_000)}`,
          amount: '32 ETH',
        });
      }
    }
    if (v.exitEpoch !== null) {
      events.push({
        key: `${v.index}-exit`,
        timestamp: at(v.exitEpoch),
        validatorIndex: v.index,
        kind: 'Exit',
        detail: `Epoch ${v.exitEpoch}`,
      });
    }
  }
  for (const w of withdrawals) {
    events.push({
      key: `${w.validatorIndex}-wd-${w.day}`,
      timestamp: Date.parse(`${w.day}T12:00:00Z`) / 1000,
      validatorIndex: w.validatorIndex,
      kind: 'Withdrawal',
      detail: '',
      amount: `${w.amountEth.toFixed(4)} ETH`,
    });
  }
  events.sort((a, b) => b.timestamp - a.timestamp);
  return events;
}

/**
 * Lifecycle events: deposits, activations, credential changes, consolidations, withdrawals and exits.
 */
export function ValidatorEvents({
  identities,
  balances,
  sync,
  proposals,
  validator,
  onValidatorChange,
}: ValidatorEventsProps): JSX.Element {
  const [kind, setKind] = useState('all');
  const [search, setSearch] = useState('');
  const { currentNetwork } = useNetwork();
  const genesis = currentNetwork?.genesis_time ?? 1606824023;
  const multi = identities.length > 1;
  // Memoised: DataTable returns to page 1 whenever its data array changes
  const events = useMemo(
    () => buildEvents(identities, balances, sync, proposals, genesis),
    [identities, balances, sync, proposals, genesis]
  );

  const kinds = [...new Set(events.map(e => e.kind))].sort();
  const query = search.trim().toLowerCase();
  const rows = useMemo(
    () =>
      events.filter(
        e =>
          (validator === null || e.validatorIndex === validator) &&
          (kind === 'all' || e.kind === kind) &&
          (query === '' || `${e.kind} ${e.detail} ${e.amount ?? ''} ${e.validatorIndex}`.toLowerCase().includes(query))
      ),
    [events, validator, kind, query]
  );

  const columns: DataTableColumn<ActivityEvent>[] = [
    {
      id: 'date',
      header: 'Date',
      accessorFn: e => e.timestamp,
      cell: ({ row }) => dateLabel(row.original.timestamp),
    },
    ...(multi
      ? [
          {
            id: 'validator',
            header: 'Validator',
            accessorFn: e => e.validatorIndex,
            meta: { cellClassName: 'text-foreground tabular-nums' },
          } satisfies DataTableColumn<ActivityEvent>,
        ]
      : []),
    { id: 'kind', header: 'Event', accessorKey: 'kind', meta: { cellClassName: 'text-foreground' } },
    { id: 'detail', header: 'Detail', accessorKey: 'detail', enableSorting: false },
    {
      id: 'amount',
      header: 'Amount',
      accessorFn: e => e.amount ?? '',
      enableSorting: false,
      meta: { cellClassName: 'text-foreground tabular-nums' },
    },
  ];

  return (
    <TableCard
      filters={
        <>
          <TableSearch value={search} onChange={setSearch} placeholder="Search events" />
          <ValidatorFilter indices={identities.map(i => i.index)} value={validator} onChange={onValidatorChange} />
          <SelectMenu
            value={kind}
            onChange={setKind}
            options={[{ value: 'all', label: 'All events' }, ...kinds.map(k => ({ value: k, label: k }))]}
            expandToFit
          />
          <span className="ml-auto">
            <MockBadge />
          </span>
        </>
      }
    >
      <DataTable
        data={rows}
        columns={columns}
        pageSize={25}
        hideGlobalFilter
        hideColumnVisibility
        getRowId={e => e.key}
        emptyMessage="No events match these filters"
      />
    </TableCard>
  );
}
