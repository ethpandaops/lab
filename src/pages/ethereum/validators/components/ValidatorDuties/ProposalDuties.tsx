import { type JSX, useMemo, useState } from 'react';
import { DataTable } from '@/components/DataTable';
import type { DataTableColumn } from '@/components/DataTable';
import { Badge } from '@/components/Elements/Badge';
import { Slot } from '@/components/Ethereum/Slot';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { SelectMenu } from '@/components/Forms/SelectMenu';
import type { FctBlockProposerByValidator } from '@/api/types.gen';
import { MockBadge } from '../MockBadge';
import { TableCard, TableSearch, ValidatorFilter } from '../TableCard';

/** Stable pseudo-random fraction for mocked proposer rewards */
const hashFraction = (n: number, salt: number): number =>
  (((Math.sin(n * 12.9898 + salt * 78.233) * 43758.5453) % 1) + 1) % 1;

/** PROTOTYPE: consensus proposer reward until xatu-cbt has per-block rewards */
const mockProposerRewardEth = (slot: number): number =>
  0.032 + hashFraction(slot, 9) * 0.012 + hashFraction(slot, 10) ** 3 * 0.25;

const STATUS_COLORS: Record<string, 'green' | 'red' | 'orange'> = { canonical: 'green', missed: 'red' };

interface ProposalDutiesProps {
  indices: number[];
  validator: number | null;
  onValidatorChange: (validator: number | null) => void;
  proposals: FctBlockProposerByValidator[];
}

/**
 * Block proposal duties in the range.
 */
export function ProposalDuties({ indices, validator, onValidatorChange, proposals }: ProposalDutiesProps): JSX.Element {
  const [status, setStatus] = useState('all');
  const [slotQuery, setSlotQuery] = useState('');
  const statuses = [...new Set(proposals.map(p => p.status ?? ''))].filter(Boolean).sort();

  // Memoised: DataTable returns to page 1 whenever its data array changes
  const rows = useMemo(
    () =>
      proposals
        .filter(
          p =>
            (validator === null || p.validator_index === validator) &&
            (status === 'all' || p.status === status) &&
            String(p.slot ?? '').includes(slotQuery.trim())
        )
        .sort((a, b) => (b.slot ?? 0) - (a.slot ?? 0)),
    [proposals, validator, status, slotQuery]
  );

  const columns: DataTableColumn<FctBlockProposerByValidator>[] = [
    {
      id: 'slot',
      header: 'Slot',
      accessorFn: r => r.slot ?? 0,
      cell: ({ row }) => <Slot slot={row.original.slot ?? 0} />,
      meta: { cellClassName: 'text-foreground tabular-nums' },
    },
    {
      id: 'time',
      header: 'Time',
      enableSorting: false,
      cell: ({ row }) => <Timestamp timestamp={row.original.slot_start_date_time ?? 0} className="text-xs" />,
    },
    ...(indices.length > 1
      ? [
          {
            id: 'validator',
            header: 'Validator',
            accessorFn: r => r.validator_index ?? 0,
            meta: { cellClassName: 'text-foreground tabular-nums' },
          } satisfies DataTableColumn<FctBlockProposerByValidator>,
        ]
      : []),
    {
      id: 'status',
      header: 'Status',
      enableSorting: false,
      cell: ({ row }) => (
        <Badge color={STATUS_COLORS[row.original.status ?? ''] ?? 'orange'} size="small">
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: 'reward',
      header: 'Reward',
      enableSorting: false,
      cell: ({ row }) =>
        row.original.status === 'canonical' ? `${mockProposerRewardEth(row.original.slot ?? 0).toFixed(4)} ETH` : '—',
      meta: { cellClassName: 'text-foreground tabular-nums' },
    },
  ];

  return (
    <TableCard
      filters={
        <>
          <TableSearch value={slotQuery} onChange={setSlotQuery} placeholder="Slot" />
          <ValidatorFilter indices={indices} value={validator} onChange={onValidatorChange} />
          <SelectMenu
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'All statuses' },
              ...statuses.map(s => ({ value: s, label: s[0].toUpperCase() + s.slice(1) })),
            ]}
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
        getRowId={r => String(r.slot)}
        emptyMessage={proposals.length === 0 ? 'No proposals in this range' : 'No proposals match these filters'}
      />
    </TableCard>
  );
}
