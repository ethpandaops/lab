import { type JSX, useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/DataTable';
import type { DataTableColumn } from '@/components/DataTable';
import { Badge } from '@/components/Elements/Badge';
import { Slot } from '@/components/Ethereum/Slot';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { SelectMenu } from '@/components/Forms/SelectMenu';
import { fctSyncCommitteeParticipationByValidatorServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { FctSyncCommitteeParticipationByValidator } from '@/api/types.gen';
import { useCursorPagination } from '../../hooks/useCursorPagination';
import { SYNC_REWARD_PER_SLOT_GWEI } from '../../utils/rewards';
import { TableCard, TableSearch, ValidatorFilter } from '../TableCard';
import { formatGwei } from './format';

type SyncResult = 'all' | 'missed';

interface SyncDutiesProps {
  indices: number[];
  validator: number | null;
  onValidatorChange: (validator: number | null) => void;
  from: number;
  to: number;
}

/**
 * Sync committee duties, one row per validator per slot, newest first.
 */
export function SyncDuties({ indices, validator, onValidatorChange, from, to }: SyncDutiesProps): JSX.Element {
  const [result, setResult] = useState<SyncResult>('all');
  const [slotQuery, setSlotQuery] = useState('');
  const slot = /^\d+$/.test(slotQuery.trim()) ? Number(slotQuery.trim()) : null;
  const filtered = validator !== null || result !== 'all' || slot !== null;

  const page = useCursorPagination(JSON.stringify([indices, from, to, validator, result, slot]));
  const { data, isLoading, isPlaceholderData, error } = useQuery({
    ...fctSyncCommitteeParticipationByValidatorServiceListOptions({
      query: {
        validator_index_in_values: (validator === null ? indices : [validator]).join(','),
        slot_start_date_time_gte: from,
        slot_start_date_time_lte: to + 86_400,
        order_by: 'slot DESC, validator_index ASC',
        page_size: page.pageSize,
        page_token: page.pageToken,
        ...(slot !== null && { slot_eq: slot }),
        ...(result === 'missed' && { participated_eq: false }),
      },
    }),
    enabled: indices.length > 0,
    placeholderData: keepPreviousData,
  });
  const rows = data?.fct_sync_committee_participation_by_validator ?? [];
  const nextPageToken = data?.next_page_token || undefined;

  const { recordNextToken } = page;
  useEffect(() => {
    if (!isLoading && !isPlaceholderData) recordNextToken(nextPageToken);
  }, [isLoading, isPlaceholderData, nextPageToken, recordNextToken]);

  const columns: DataTableColumn<FctSyncCommitteeParticipationByValidator>[] = [
    {
      id: 'slot',
      header: 'Slot',
      cell: ({ row }) => <Slot slot={row.original.slot ?? 0} />,
      meta: { cellClassName: 'text-foreground tabular-nums' },
    },
    {
      id: 'time',
      header: 'Time',
      cell: ({ row }) => <Timestamp timestamp={row.original.slot_start_date_time ?? 0} className="text-xs" />,
    },
    ...(indices.length > 1
      ? [
          {
            id: 'validator',
            header: 'Validator',
            cell: ({ row }) => row.original.validator_index,
            meta: { cellClassName: 'text-foreground tabular-nums' },
          } satisfies DataTableColumn<FctSyncCommitteeParticipationByValidator>,
        ]
      : []),
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) =>
        row.original.participated ? (
          <Badge color="green" size="small">
            Signed
          </Badge>
        ) : (
          <Badge color="red" size="small">
            Missed
          </Badge>
        ),
    },
    {
      id: 'reward',
      header: 'Reward (est.)',
      cell: ({ row }) => {
        const gwei = row.original.participated ? SYNC_REWARD_PER_SLOT_GWEI : -SYNC_REWARD_PER_SLOT_GWEI;
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
          <SelectMenu
            value={result}
            onChange={setResult}
            options={[
              { value: 'all', label: 'All outcomes' },
              { value: 'missed', label: 'Missed' },
            ]}
            expandToFit
          />
        </>
      }
    >
      {error ? (
        <p className="px-5 py-8 text-center text-sm text-danger">{error.message}</p>
      ) : (
        <DataTable
          data={rows}
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
          getRowId={r => `${r.validator_index}:${r.slot}`}
          emptyMessage={
            filtered ? 'No sync committee duties match these filters' : 'Not in a sync committee during this range'
          }
        />
      )}
    </TableCard>
  );
}
