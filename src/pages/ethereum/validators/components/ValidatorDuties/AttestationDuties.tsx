import { type JSX, useEffect, useState } from 'react';
import clsx from 'clsx';
import { CheckIcon, XMarkIcon } from '@heroicons/react/20/solid';
import { DataTable } from '@/components/DataTable';
import type { DataTableColumn } from '@/components/DataTable';
import { Badge } from '@/components/Elements/Badge';
import { Slot } from '@/components/Ethereum/Slot';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { SelectMenu } from '@/components/Forms/SelectMenu';
import { useAttestationDuties, type AttestationDuty, type AttestationOutcome } from '../../hooks/useAttestationDuties';
import { useCursorPagination } from '../../hooks/useCursorPagination';
import { attestationRewardGwei } from '../../utils/rewards';
import { TableCard, TableSearch, ValidatorFilter } from '../TableCard';
import { formatGwei, shortRoot } from './format';

const OUTCOME_OPTIONS: { value: AttestationOutcome; label: string }[] = [
  { value: 'all', label: 'All outcomes' },
  { value: 'missed', label: 'Missed' },
  { value: 'head', label: 'Wrong head' },
  { value: 'target', label: 'Wrong target' },
  { value: 'source', label: 'Wrong source' },
  { value: 'late', label: 'Included late' },
];

function Flag({ value }: { value: boolean | null }): JSX.Element {
  if (value === null) return <span className="text-muted">—</span>;
  return value ? (
    <CheckIcon className="size-4 text-success" aria-label="Correct" />
  ) : (
    <XMarkIcon className="size-4 text-danger" aria-label="Wrong" />
  );
}

interface AttestationDutiesProps {
  indices: number[];
  validator: number | null;
  onValidatorChange: (validator: number | null) => void;
  from: number;
  to: number;
  effectiveBalanceEth: (validatorIndex: number, timestamp: number) => number;
}

/**
 * Attestation duties, newest first: the validator's votes next to the committee's majority head.
 */
export function AttestationDuties({
  indices,
  validator,
  onValidatorChange,
  from,
  to,
  effectiveBalanceEth,
}: AttestationDutiesProps): JSX.Element {
  const [outcome, setOutcome] = useState<AttestationOutcome>('all');
  const [slotQuery, setSlotQuery] = useState('');
  const slot = /^\d+$/.test(slotQuery.trim()) ? Number(slotQuery.trim()) : null;

  const page = useCursorPagination(JSON.stringify([indices, from, to, validator, outcome, slot]));
  const { duties, nextPageToken, isLoading, isPlaceholderData, error } = useAttestationDuties({
    indices: validator === null ? indices : [validator],
    from,
    to,
    outcome,
    slot,
    pageSize: page.pageSize,
    pageToken: page.pageToken,
  });

  const { recordNextToken } = page;
  useEffect(() => {
    if (!isLoading && !isPlaceholderData) recordNextToken(nextPageToken);
  }, [isLoading, isPlaceholderData, nextPageToken, recordNextToken]);

  const columns: DataTableColumn<AttestationDuty>[] = [
    {
      id: 'slot',
      header: 'Slot',
      cell: ({ row }) => <Slot slot={row.original.slot} />,
      meta: { cellClassName: 'text-foreground tabular-nums' },
    },
    {
      id: 'time',
      header: 'Time',
      cell: ({ row }) => <Timestamp timestamp={row.original.timestamp} className="text-xs" />,
    },
    ...(indices.length > 1
      ? [
          {
            id: 'validator',
            header: 'Validator',
            cell: ({ row }) => row.original.validatorIndex,
            meta: { cellClassName: 'text-foreground tabular-nums' },
          } satisfies DataTableColumn<AttestationDuty>,
        ]
      : []),
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) =>
        row.original.attested ? (
          <Badge color="green" size="small">
            Included
          </Badge>
        ) : (
          <Badge color="red" size="small">
            Missed
          </Badge>
        ),
    },
    { id: 'head', header: 'Head', cell: ({ row }) => <Flag value={row.original.headCorrect} /> },
    { id: 'target', header: 'Target', cell: ({ row }) => <Flag value={row.original.targetCorrect} /> },
    { id: 'source', header: 'Source', cell: ({ row }) => <Flag value={row.original.sourceCorrect} /> },
    {
      id: 'delay',
      header: 'Inclusion',
      cell: ({ row }) => {
        const d = row.original.inclusionDistance;
        if (d === null) return '—';
        return <span className={clsx(d > 1 && 'text-warning')}>{d === 1 ? '1 slot' : `${d} slots`}</span>;
      },
      meta: { cellClassName: 'text-muted tabular-nums' },
    },
    {
      id: 'voted',
      header: 'Voted head',
      cell: ({ row }) => {
        const { votedRoot, canonicalRoot } = row.original;
        if (!votedRoot) return '—';
        const differs = canonicalRoot !== null && votedRoot !== canonicalRoot;
        return (
          <span className={clsx('font-mono', differs ? 'text-danger' : 'text-foreground')} title={votedRoot}>
            {shortRoot(votedRoot)}
          </span>
        );
      },
    },
    {
      id: 'network',
      header: 'Network head',
      cell: ({ row }) => {
        const { canonicalRoot, votedRoot } = row.original;
        if (!canonicalRoot) return '—';
        return (
          <span className={clsx('font-mono', votedRoot !== canonicalRoot && 'text-foreground')} title={canonicalRoot}>
            {shortRoot(canonicalRoot)}
          </span>
        );
      },
    },
    {
      id: 'agreement',
      header: 'Committee on network head',
      cell: ({ row }) => {
        const { votesHead, votesMax } = row.original;
        if (votesHead === null || !votesMax) return '—';
        return (
          <span title={`${votesHead.toLocaleString()} of ${votesMax.toLocaleString()} votes`}>
            {((votesHead / votesMax) * 100).toFixed(1)}%
          </span>
        );
      },
      meta: { cellClassName: 'text-muted tabular-nums' },
    },
    {
      id: 'reward',
      header: 'Reward (est.)',
      cell: ({ row }) => {
        const d = row.original;
        const gwei = attestationRewardGwei({
          effectiveBalanceEth: effectiveBalanceEth(d.validatorIndex, d.timestamp),
          attested: d.attested,
          sourceCorrect: d.sourceCorrect,
          targetCorrect: d.targetCorrect,
          headCorrect: d.headCorrect,
          inclusionDistance: d.inclusionDistance,
        });
        return <span className={gwei < 0 ? 'text-danger' : 'text-foreground'}>{formatGwei(gwei)}</span>;
      },
      meta: { cellClassName: 'tabular-nums' },
    },
  ];

  return (
    <TableCard
      filters={
        <>
          <TableSearch value={slotQuery} onChange={setSlotQuery} placeholder="Slot" />
          <ValidatorFilter indices={indices} value={validator} onChange={onValidatorChange} />
          <SelectMenu value={outcome} onChange={setOutcome} options={OUTCOME_OPTIONS} expandToFit />
        </>
      }
    >
      {error ? (
        <p className="px-5 py-8 text-center text-sm text-danger">{error.message}</p>
      ) : (
        <DataTable
          data={duties}
          columns={columns.map(c => ({ ...c, enableSorting: false }))}
          isLoading={isLoading}
          pageIndex={page.pageIndex}
          pageSize={page.pageSize}
          onPaginationChange={page.onPaginationChange}
          hasNextPage={nextPageToken !== undefined}
          manualPagination
          manualFiltering
          manualSorting
          hideGlobalFilter
          hideColumnVisibility
          getRowId={d => `${d.validatorIndex}:${d.slot}`}
          emptyMessage="No attestations match these filters"
        />
      )}
    </TableCard>
  );
}
