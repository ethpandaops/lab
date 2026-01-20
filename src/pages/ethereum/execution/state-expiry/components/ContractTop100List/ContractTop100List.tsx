import { type JSX, useState, useMemo } from 'react';
import clsx from 'clsx';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/16/solid';
import { Card } from '@/components/Layout/Card';
import { ScrollArea } from '@/components/Layout/ScrollArea';
import { useContractTop100Data, type ContractTop100Item } from '../../hooks';
import { ContractRow, ContractCard } from '../ContractRow';
import { ContractTop100ListSkeleton, ContractTop100ListSkeletonMobile } from './ContractTop100ListSkeleton';
import { TableColGroup } from './TableColGroup';

/** Sortable columns */
type SortColumn = 'size' | 'slots' | 'expiry1y' | 'expiry2y';
type SortDirection = 'asc' | 'desc';

interface ContractTop100ListProps {
  /** Display variant - 'contained' uses Card with fixed height ScrollArea, 'full' renders without container */
  variant?: 'contained' | 'full';
}

/**
 * Key overhead per storage slot in geth's snapshot structure.
 * Each slot key = 1 (prefix) + 32 (account hash) + 32 (storage hash) = 65 bytes
 */
const SLOT_KEY_OVERHEAD_BYTES = 65;

/** Calculate savings percentage */
function calculateSavings(baseBytes: number | undefined, expiryBytes: number | undefined): number | null {
  if (baseBytes === undefined || expiryBytes === undefined || baseBytes === 0) return null;
  return ((baseBytes - expiryBytes) / baseBytes) * 100;
}

/** Sort data by column */
function sortData(data: ContractTop100Item[], column: SortColumn, direction: SortDirection): ContractTop100Item[] {
  return [...data].sort((a, b) => {
    let aVal: number | null = null;
    let bVal: number | null = null;

    switch (column) {
      case 'size':
        // Include key overhead in size calculation
        aVal = (a.contract.active_slots ?? 0) * SLOT_KEY_OVERHEAD_BYTES + (a.contract.effective_bytes ?? 0);
        bVal = (b.contract.active_slots ?? 0) * SLOT_KEY_OVERHEAD_BYTES + (b.contract.effective_bytes ?? 0);
        break;
      case 'slots':
        aVal = a.contract.active_slots ?? 0;
        bVal = b.contract.active_slots ?? 0;
        break;
      case 'expiry1y':
        aVal = calculateSavings(a.contract.effective_bytes, a.expiry12m?.effective_bytes);
        bVal = calculateSavings(b.contract.effective_bytes, b.expiry12m?.effective_bytes);
        break;
      case 'expiry2y':
        aVal = calculateSavings(a.contract.effective_bytes, a.expiry24m?.effective_bytes);
        bVal = calculateSavings(b.contract.effective_bytes, b.expiry24m?.effective_bytes);
        break;
    }

    // Handle nulls - put them at the end
    if (aVal === null && bVal === null) return 0;
    if (aVal === null) return 1;
    if (bVal === null) return -1;

    const result = aVal - bVal;
    return direction === 'asc' ? result : -result;
  });
}

/** Sortable header button */
function SortHeader({
  column,
  currentSort,
  currentDirection,
  onSort,
  align = 'right',
  title,
  children,
}: {
  column: SortColumn;
  currentSort: SortColumn;
  currentDirection: SortDirection;
  onSort: (column: SortColumn) => void;
  align?: 'left' | 'right' | 'center';
  title?: string;
  children: React.ReactNode;
}): JSX.Element {
  const isActive = currentSort === column;
  return (
    <th
      className={clsx(
        'px-2 py-1.5 select-none',
        align === 'left' && 'text-left',
        align === 'right' && 'text-right',
        align === 'center' && 'text-center'
      )}
      title={title}
    >
      <div
        className={clsx(
          'flex',
          align === 'left' && 'justify-start',
          align === 'right' && 'justify-end',
          align === 'center' && 'justify-center'
        )}
      >
        <button
          type="button"
          onClick={() => onSort(column)}
          className={clsx(
            'inline-flex items-center gap-0.5 transition-colors',
            isActive ? 'text-foreground' : 'text-muted hover:text-foreground'
          )}
        >
          {isActive ? (
            currentDirection === 'asc' ? (
              <ChevronUpIcon className="size-3" />
            ) : (
              <ChevronDownIcon className="size-3" />
            )
          ) : (
            <span className="size-3" />
          )}
          {children}
        </button>
      </div>
    </th>
  );
}

/**
 * Component displaying the top 100 contracts by storage bytes.
 * Shows a table on desktop and card layout on mobile.
 *
 * @param variant - 'contained' (default) wraps in Card with ScrollArea, 'full' renders directly
 */
export function ContractTop100List({ variant = 'contained' }: ContractTop100ListProps): JSX.Element {
  const { data, isLoading, error } = useContractTop100Data();
  const [sortColumn, setSortColumn] = useState<SortColumn>('size');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (column: SortColumn): void => {
    if (column === sortColumn) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      // Default to descending for metrics (higher is more interesting)
      setSortDirection('desc');
    }
  };

  const sortedData = useMemo(() => {
    if (!data) return null;
    return sortData(data, sortColumn, sortDirection);
  }, [data, sortColumn, sortDirection]);

  // Desktop table content
  const tableContent = (
    <>
      {isLoading && <ContractTop100ListSkeleton />}

      {error && <div className="px-4 py-8 text-center text-sm text-muted">Failed to load contracts</div>}

      {!isLoading && !error && sortedData && sortedData.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-muted">No contracts found</div>
      )}

      {!isLoading && !error && sortedData && sortedData.length > 0 && (
        <table className="w-full min-w-[600px] table-fixed border-collapse">
          <TableColGroup />
          <thead className="sticky top-0 z-10 bg-surface">
            <tr className="border-b border-border/50 text-xs font-medium uppercase">
              <th className="px-2 py-1.5 text-center text-muted">#</th>
              <th className="px-2 py-1.5 text-left text-muted">Contract</th>
              <th className="px-2 py-1.5 text-left text-muted">Owner</th>
              <SortHeader column="size" currentSort={sortColumn} currentDirection={sortDirection} onSort={handleSort}>
                SIZE
              </SortHeader>
              <SortHeader column="slots" currentSort={sortColumn} currentDirection={sortDirection} onSort={handleSort}>
                SLOTS
              </SortHeader>
              <SortHeader
                column="expiry1y"
                currentSort={sortColumn}
                currentDirection={sortDirection}
                onSort={handleSort}
                title="Savings with 1 year expiry policy"
              >
                1Y EXP.
              </SortHeader>
              <SortHeader
                column="expiry2y"
                currentSort={sortColumn}
                currentDirection={sortDirection}
                onSort={handleSort}
                title="Savings with 2 year expiry policy"
              >
                2Y EXP.
              </SortHeader>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {sortedData.map((item, idx) => (
              <ContractRow key={item.contract.contract_address ?? idx} item={item} index={idx + 1} />
            ))}
          </tbody>
        </table>
      )}
    </>
  );

  // Mobile card content
  const mobileContent = (
    <>
      {isLoading && <ContractTop100ListSkeletonMobile />}

      {error && <div className="px-4 py-8 text-center text-sm text-muted">Failed to load contracts</div>}

      {!isLoading && !error && data && data.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-muted">No contracts found</div>
      )}

      {!isLoading && !error && sortedData && sortedData.length > 0 && (
        <div>
          {sortedData.map((item, idx) => (
            <ContractCard key={item.contract.contract_address ?? idx} item={item} index={idx + 1} />
          ))}
        </div>
      )}
    </>
  );

  if (variant === 'full') {
    return (
      <>
        {/* Mobile: Card layout */}
        <div className="md:hidden">{mobileContent}</div>
        {/* Desktop: Table layout */}
        <div className="hidden overflow-x-auto md:block">{tableContent}</div>
      </>
    );
  }

  return (
    <Card className="h-120 overflow-hidden rounded-sm">
      {/* Title */}
      <div className="bg-card border-b border-border px-3 py-2">
        <h3 className="text-base font-semibold text-foreground">Top 100 Contracts</h3>
      </div>

      {/* Mobile: Card layout */}
      <ScrollArea orientation="vertical" className="h-[calc(30rem-52px)] md:hidden">
        <div className="pb-10">{mobileContent}</div>
      </ScrollArea>

      {/* Desktop: Table layout */}
      <ScrollArea orientation="both" className="hidden h-[calc(30rem-52px)] md:block">
        <div className="pb-10">{tableContent}</div>
      </ScrollArea>
    </Card>
  );
}
