import { type JSX, useCallback, useMemo } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { createColumnHelper } from '@tanstack/react-table';
import clsx from 'clsx';

import { Alert } from '@/components/Feedback/Alert';
import { Button } from '@/components/Elements/Button';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { DataTable } from '@/components/DataTable';
import { Epoch } from '@/components/Ethereum/Epoch';
import { TopEntitiesChart } from '@/components/Ethereum/TopEntitiesChart';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { formatEpoch } from '@/utils';

import { useEpochsData } from './hooks';
import { EpochsFilters } from './components/EpochsFilters';
import { OfflineValidatorsTable } from './components/OfflineValidatorsTable';
import type { EpochRow } from './utils/epoch-query';
import { DEFAULT_PAGE_SIZE, EPOCH_FILTER_KEYS, type EpochFilters, type EpochsSearch } from './IndexPage.types';

const column = createColumnHelper<EpochRow>();

/**
 * Epochs list: the latest epochs by default, narrowed by range, participation and missed-slot filters that live
 * in the URL, with the offline validators for the epochs on the page.
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

  const { data, missedAttestationsByEntity, isLoading, isPlaceholderData, error, currentEpoch } = useEpochsData({
    filters,
    pageSize,
    cursor: search.cursor,
  });
  const rows = data?.rows ?? [];
  const epochs = rows.map(row => row.epoch);

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
    () => [
      column.accessor('epoch', {
        header: 'Epoch',
        enableSorting: false,
        cell: info => (
          <span className={info.getValue() === currentEpoch ? 'text-primary' : undefined}>
            <Epoch epoch={info.getValue()} />
          </span>
        ),
        meta: { cellClassName: 'font-medium text-foreground' },
        enableHiding: false,
      }),
      column.accessor('startTime', {
        id: 'start',
        header: 'Start time',
        enableSorting: false,
        cell: info => <Timestamp timestamp={info.getValue()} format="short" />,
        // Age gives the same time in less width
        meta: { columnClassName: 'hidden sm:table-cell' },
      }),
      column.accessor('startTime', {
        id: 'age',
        header: 'Age',
        enableSorting: false,
        cell: info => <Timestamp timestamp={info.getValue()} format="relative" />,
      }),
      column.accessor('proposed', {
        header: 'Proposed',
        enableSorting: false,
        cell: info => info.getValue(),
      }),
      column.accessor('missed', {
        header: 'Missed',
        enableSorting: false,
        cell: info => <span className={info.getValue() > 0 ? 'text-warning' : 'text-muted'}>{info.getValue()}</span>,
      }),
      column.accessor('participation', {
        header: 'Participation',
        enableSorting: false,
        cell: info => {
          const rate = info.getValue();
          if (rate === null) return <span className="text-muted">-</span>;
          return `${(rate * 100).toFixed(2)}%`;
        },
      }),
    ],
    [currentEpoch]
  );

  const emptyMessage =
    data?.searchedTo !== undefined
      ? `No matches down to epoch ${formatEpoch(data.searchedTo)}`
      : 'No epochs match these filters';

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
            emptyMessage={emptyMessage}
            hideGlobalFilter
            hideColumnVisibility
            paginationPosition="both"
          />

          {data?.partial && data.nextCursor && (
            <div className="mt-3 flex flex-wrap items-center justify-end gap-3 text-sm text-muted">
              {data.searchedTo !== undefined && rows.length > 0 && (
                <span className="tabular-nums">Searched down to epoch {formatEpoch(data.searchedTo)}</span>
              )}
              <Button variant="secondary" size="sm" onClick={() => goToPage(pageIndex + 1, data.nextCursor)}>
                Keep searching
              </Button>
            </div>
          )}
        </div>

        {epochs.length > 0 && (
          <>
            <TopEntitiesChart
              data={missedAttestationsByEntity.map(m => ({ x: m.epoch, entity: m.entity, count: m.count }))}
              xAxis={{ name: 'Epoch', min: Math.min(...epochs), max: Math.max(...epochs) }}
              yAxis={{ name: 'Missed' }}
              title="Offline Validators"
              topN={10}
              anchorId="offline-validators-chart"
              emptyMessage="No offline validators in these epochs"
            />

            <OfflineValidatorsTable data={missedAttestationsByEntity} epochs={epochs} />
          </>
        )}
      </div>
    </Container>
  );
}
