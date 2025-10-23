import { type JSX, useMemo, useCallback, type ReactNode } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import type { Column } from '@/components/Lists/Table/Table.types';
import { useSlotsData } from './hooks';
import type { SlotData } from './hooks';
import clsx from 'clsx';

/**
 * Slots list page component.
 *
 * Displays a table of recent Ethereum consensus layer slots with:
 * - Slot number
 * - Epoch number
 * - Proposer validator index
 * - Blob count
 * - Status (canonical, orphaned, missed)
 *
 * Rows are clickable to navigate to slot detail page if data is available.
 */
export function IndexPage(): JSX.Element {
  const { slots, isLoading, error } = useSlotsData();
  const navigate = useNavigate();

  /**
   * Handle row click to navigate to slot detail page
   */
  const handleRowClick = useCallback(
    (slot: SlotData) => {
      if (slot.hasData && slot.slot > 0) {
        navigate({ to: '/ethereum/slots/$slot', params: { slot: slot.slot.toString() } });
      }
    },
    [navigate]
  );

  /**
   * Table column definitions
   */
  const columns = useMemo<Column<SlotData>[]>(
    () => [
      {
        header: 'Slot',
        accessor: 'slot',
        cellClassName: 'text-foreground font-semibold',
      },
      {
        header: 'Epoch',
        accessor: 'epoch',
        cellClassName: 'text-muted',
      },
      {
        header: 'Proposer Index',
        accessor: row => (row.proposerIndex !== null ? row.proposerIndex : '-'),
        cellClassName: 'text-muted',
      },
      {
        header: 'Blob Count',
        accessor: row => (row.blobCount !== null ? row.blobCount : '-'),
        cellClassName: 'text-muted',
      },
      {
        header: 'Status',
        accessor: row => {
          if (!row.status) return '-';

          // Style based on status
          const statusColors = {
            canonical: 'text-success',
            orphaned: 'text-warning',
            missed: 'text-danger',
          };

          const colorClass = statusColors[row.status as keyof typeof statusColors] || 'text-muted';

          return <span className={clsx('font-medium capitalize', colorClass)}>{row.status}</span>;
        },
        cellClassName: 'text-muted',
      },
    ],
    []
  );

  // Loading state
  if (isLoading) {
    return (
      <Container>
        <Header
          title="Slots"
          description="Browse Ethereum consensus layer slots with detailed block, proposer, and blob information"
        />
        <div className="mt-8">
          <LoadingContainer className="h-96 w-full rounded-sm" />
        </div>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container>
        <Header
          title="Slots"
          description="Browse Ethereum consensus layer slots with detailed block, proposer, and blob information"
        />
        <div className="mt-8 rounded-sm border border-danger/20 bg-danger/10 p-4 text-danger">
          Error loading slots: {error.message}
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <Header
        title="Slots"
        description="Browse Ethereum consensus layer slots with detailed block, proposer, and blob information"
      />

      {/* Custom table wrapper to add clickable rows */}
      <div className="mt-8">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden rounded-sm border border-border">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-surface">
                  <tr>
                    {columns.map((column, index) => (
                      <th
                        key={index}
                        scope="col"
                        className={`py-3.5 text-left text-sm/6 font-semibold whitespace-nowrap text-foreground ${
                          index === 0 ? 'pr-3 pl-4 sm:pl-6' : 'px-3'
                        } ${column.headerClassName || ''}`}
                      >
                        {column.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-background">
                  {slots.map((row, rowIndex) => (
                    <tr
                      key={rowIndex}
                      onClick={() => handleRowClick(row)}
                      className={clsx(
                        'transition-colors',
                        row.hasData ? 'cursor-pointer hover:bg-surface/50' : 'cursor-not-allowed opacity-50'
                      )}
                    >
                      {columns.map((column, colIndex) => {
                        const getCellValue = (): ReactNode => {
                          if (typeof column.accessor === 'function') {
                            return column.accessor(row);
                          }
                          return (row as unknown as Record<string, unknown>)[column.accessor as string] as ReactNode;
                        };

                        return (
                          <td
                            key={colIndex}
                            className={`py-4 text-sm/6 whitespace-nowrap ${
                              colIndex === 0 ? 'pr-3 pl-4 sm:pl-6' : 'px-3'
                            } ${column.cellClassName || 'text-muted'}`}
                          >
                            {getCellValue()}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {slots.length === 0 && (
        <div className="mt-8 rounded-sm border border-border bg-surface p-8 text-center text-muted">
          No slots found.
        </div>
      )}
    </Container>
  );
}
