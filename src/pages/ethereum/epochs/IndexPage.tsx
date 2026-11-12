import { type JSX, useCallback, useMemo } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import clsx from 'clsx';

import { Alert } from '@/components/Feedback/Alert';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { DataTable, type DataTableColumn } from '@/components/DataTable';
import { Epoch } from '@/components/Ethereum/Epoch';
import { Timestamp } from '@/components/DataDisplay/Timestamp';

import { useEpochsData } from './hooks';
import { EpochsFilters } from './components/EpochsFilters';
import type { EpochRow } from './utils/epoch-query';
import { DEFAULT_PAGE_SIZE, EPOCH_FILTER_KEYS, type EpochFilters, type EpochsSearch } from './IndexPage.types';

/**
 * Epochs list: the latest epochs by default, narrowed by range, participation and missed-slot filters that live
 * in the URL.
 */
export function IndexPage(): JSX.Element {
  const navigate = useNavigate({ from: '/ethereum/epochs/' });
  const search = useSearch({ from: '/ethereum/epochs/' }) as EpochsSearch;

  const filters = useMemo(
    () => Object.fromEntries(EPOCH_FILTER_KEYS.map(key => [key, search[key]])) as EpochFilters,
    [search]
  );
  const pageSize = search.pageSize ?? DEFAULT_PAGE_SIZE;
  const pageIndex = search.page ?? 0;

  const { data, isLoading, isPlaceholderData, error, currentEpoch } = useEpochsData({
    filters,
    pageSize,
    cursor: search.cursor,
  });
  const rows = data?.rows ?? [];

  const setFilters = useCallback(
    (next: EpochFilters) =>
      navigate({
        search: prev => ({
          ...prev,
          ...Object.fromEntries(EPOCH_FILTER_KEYS.map(key => [key, next[key]])),
          page: undefined,
          cursor: undefined,
        }),
      }),
    [navigate]
  );

  const goToPage = useCallback(
    (page: number, cursor: string | undefined) =>
      navigate({ search: prev => ({ ...prev, page: page || undefined, cursor: page ? cursor : undefined }) }),
    [navigate]
  );

  const handlePagination = useCallback(
    (nextIndex: number, nextSize: number) => {
      if (nextSize !== pageSize) {
        navigate({
          search: prev => ({
            ...prev,
            pageSize: nextSize === DEFAULT_PAGE_SIZE ? undefined : nextSize,
            page: undefined,
            cursor: undefined,
          }),
        });
      } else if (nextIndex > pageIndex && data?.nextCursor) {
        goToPage(pageIndex + 1, data.nextCursor);
      } else if (nextIndex < pageIndex) {
        goToPage(pageIndex - 1, data?.prevCursor);
      }
    },
    [navigate, pageSize, pageIndex, data, goToPage]
  );

  const columns = useMemo(
    (): DataTableColumn<EpochRow>[] => [
      {
        accessorKey: 'epoch',
        header: 'Epoch',
        enableSorting: false,
        cell: ({ row }) => (
          <span className={row.original.epoch === currentEpoch ? 'text-primary' : undefined}>
            <Epoch epoch={row.original.epoch} />
          </span>
        ),
        meta: { cellClassName: 'font-medium text-foreground' },
        enableHiding: false,
      },
      {
        accessorKey: 'startTime',
        id: 'start',
        header: 'Start time',
        enableSorting: false,
        cell: ({ row }) => <Timestamp timestamp={row.original.startTime} format="short" />,
        // Age gives the same time in less width
        meta: { columnClassName: 'hidden sm:table-cell' },
      },
      {
        accessorKey: 'startTime',
        id: 'age',
        header: 'Age',
        enableSorting: false,
        cell: ({ row }) => <Timestamp timestamp={row.original.startTime} format="relative" />,
      },
      {
        accessorKey: 'proposed',
        header: 'Proposed',
        enableSorting: false,
        cell: ({ row }) => row.original.proposed,
      },
      {
        accessorKey: 'missed',
        header: 'Missed',
        enableSorting: false,
        cell: ({ row }) => (
          <span className={row.original.missed > 0 ? 'text-warning' : 'text-muted'}>{row.original.missed}</span>
        ),
      },
      {
        accessorKey: 'participation',
        header: 'Participation',
        enableSorting: false,
        cell: ({ row }) => {
          const rate = row.original.participation;
          if (rate === null) return <span className="text-muted">-</span>;
          return `${(rate * 100).toFixed(2)}%`;
        },
      },
    ],
    [currentEpoch]
  );

  return (
    <Container>
      <Header title="Epochs" />

      <div className="mb-4">
        <EpochsFilters
          filters={filters}
          onChange={setFilters}
          onGoToEpoch={epoch => setFilters({ ...filters, epochMax: epoch })}
        />
      </div>

      {error && <Alert variant="error" title="Error loading epochs" description={error.message} className="mb-4" />}

      <div className={clsx('flex flex-col gap-6 transition-opacity', isPlaceholderData && 'opacity-60')}>
        <div>
          <DataTable
            data={rows}
            columns={columns}
            isLoading={isLoading}
            pageIndex={pageIndex}
            pageSize={pageSize}
            onPaginationChange={handlePagination}
            hasNextPage={Boolean(data?.nextCursor)}
            manualPagination
            onRowClick={row => navigate({ to: '/ethereum/epochs/$epoch', params: { epoch: String(row.epoch) } })}
            getRowId={row => String(row.epoch)}
            emptyMessage="No epochs match these filters"
            hideGlobalFilter
            hideColumnVisibility
            paginationPosition="both"
          />
        </div>
      </div>
    </Container>
  );
}
