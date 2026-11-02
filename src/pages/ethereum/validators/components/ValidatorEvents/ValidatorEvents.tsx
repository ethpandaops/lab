import { type JSX, useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { DataTable } from '@/components/DataTable';
import type { DataTableColumn } from '@/components/DataTable';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { Slot } from '@/components/Ethereum/Slot';
import { SelectMenu } from '@/components/Forms/SelectMenu';
import { fctValidatorEventServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { FctValidatorEvent } from '@/api/types.gen';
import { useTableBounds } from '@/hooks/useBounds';
import { useCursorPagination } from '../../hooks/useCursorPagination';
import { TableCard, TableSearch, ValidatorFilter } from '../TableCard';

const EVENT_LABELS: Record<string, string> = {
  deposit: 'Deposit',
  top_up: 'Top-up',
  bls_to_execution_change: 'Credential change to 0x01',
  switch_to_compounding: 'Switch to 0x02',
  consolidation_source: 'Consolidated into',
  consolidation_target: 'Consolidated from',
  withdrawal_partial: 'Partial withdrawal',
  withdrawal_full: 'Full withdrawal',
  withdrawal_request: 'Partial withdrawal request',
  exit_request: 'Exit request (EL)',
  voluntary_exit: 'Voluntary exit',
  slashed: 'Slashed',
};

const EVENT_OPTIONS = [
  { value: 'all', label: 'All events' },
  ...Object.entries(EVENT_LABELS).map(([value, label]) => ({ value, label })),
];

const formatEth = (gwei: number): string =>
  `${(gwei / 1e9).toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })} ETH`;

interface ValidatorEventsProps {
  indices: number[];
  /** Range start and end day (unix seconds, start of day UTC); the end day is included */
  from: number;
  to: number;
  validator: number | null;
  onValidatorChange: (validator: number | null) => void;
}

/**
 * Lifecycle events from the beacon chain: deposits, credential changes, consolidations, withdrawals,
 * exits and slashings, newest first.
 */
export function ValidatorEvents({
  indices,
  from,
  to,
  validator,
  onValidatorChange,
}: ValidatorEventsProps): JSX.Element {
  const [kind, setKind] = useState('all');
  const [slotQuery, setSlotQuery] = useState('');
  const slot = /^\d+$/.test(slotQuery.trim()) ? Number(slotQuery.trim()) : null;

  const page = useCursorPagination(JSON.stringify([indices, from, to, validator, kind, slot]));
  const { data, isLoading, isPlaceholderData, error } = useQuery({
    ...fctValidatorEventServiceListOptions({
      query: {
        validator_index_in_values: (validator === null ? indices : [validator]).join(','),
        slot_start_date_time_gte: from,
        slot_start_date_time_lte: to + 86_400,
        order_by: 'slot DESC, event_position ASC',
        page_size: page.pageSize,
        page_token: page.pageToken,
        ...(kind !== 'all' && { event_type_eq: kind }),
        ...(slot !== null && { slot_eq: slot }),
      },
    }),
    enabled: indices.length > 0,
    placeholderData: keepPreviousData,
  });
  const rows = data?.fct_validator_event ?? [];
  // The event table is still filling backwards; an empty result before its start means no data, not no events
  const bounds = useTableBounds('fct_validator_event');
  const coverageStart =
    bounds.data && bounds.data.min > from
      ? new Date(bounds.data.min * 1000).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          timeZone: 'UTC',
        })
      : null;
  const nextPageToken = data?.next_page_token || undefined;

  const { recordNextToken } = page;
  useEffect(() => {
    if (!isLoading && !isPlaceholderData) recordNextToken(nextPageToken);
  }, [isLoading, isPlaceholderData, nextPageToken, recordNextToken]);

  const columns: DataTableColumn<FctValidatorEvent>[] = [
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
          } satisfies DataTableColumn<FctValidatorEvent>,
        ]
      : []),
    {
      id: 'event',
      header: 'Event',
      cell: ({ row }) => EVENT_LABELS[row.original.event_type ?? ''] ?? row.original.event_type,
      meta: { cellClassName: 'text-foreground' },
    },
    {
      id: 'amount',
      header: 'Amount',
      cell: ({ row }) => (row.original.amount == null ? '—' : formatEth(Number(row.original.amount))),
      meta: { cellClassName: 'text-foreground tabular-nums' },
    },
    {
      id: 'counterparty',
      header: 'Counterparty',
      cell: ({ row }) => row.original.counterparty_validator_index ?? '—',
      meta: { cellClassName: 'text-foreground tabular-nums' },
    },
    {
      id: 'address',
      header: 'Address',
      cell: ({ row }) => {
        const address = row.original.address;
        if (!address) return '—';
        return (
          <span className="font-mono" title={address}>
            {address.slice(0, 8)}…{address.slice(-6)}
          </span>
        );
      },
    },
  ];

  return (
    <TableCard
      filters={
        <>
          <TableSearch value={slotQuery} onChange={setSlotQuery} placeholder="Slot" />
          <ValidatorFilter indices={indices} value={validator} onChange={onValidatorChange} />
          <SelectMenu value={kind} onChange={setKind} options={EVENT_OPTIONS} expandToFit />
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
          getRowId={e => `${e.validator_index}:${e.slot}:${e.event_type}:${e.event_position}`}
          emptyMessage={
            coverageStart
              ? `Event data starts ${coverageStart}. No events since then.`
              : 'No events match these filters'
          }
        />
      )}
    </TableCard>
  );
}
