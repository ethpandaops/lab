import { type JSX, useMemo, useCallback, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNetwork } from '@/hooks/useNetwork';
import { formatTimeRange } from '@/utils/time';
import { intEngineNewPayloadServiceList } from '@/api/sdk.gen';
import { useTableBounds } from '@/hooks/useBounds';
import { encodeTimeCursor, fetchNewestFirst, nowEnd, parseTimeCursor } from '@/utils/widening-window';
import type { PayloadsSearch, FilterValues } from './IndexPage.types';
import { DEFAULT_DURATION_MIN, DEFAULT_ORDER, DEFAULT_PAGE_SIZE, RANKED_MAX_DAYS } from './IndexPage.types';
import { PayloadsView } from './components/PayloadsView';
import type { IntEngineNewPayload } from '@/api/types.gen';
import type { SortingState } from '@tanstack/react-table';
import { NEWEST_FIRST_ORDER, payloadFilters, payloadTimeBounds, payloadWindowQuery } from './utils/payload-query';

/**
 * Payloads page showing individual engine_newPayload observations, slowest first. Rankings read at most the last
 * week of the URL's time range; newest first reads widening windows back from now.
 */
export function IndexPage(): JSX.Element {
  const navigate = useNavigate({ from: '/ethereum/execution/payloads/' });
  const search = useSearch({ from: '/ethereum/execution/payloads/' }) as PayloadsSearch;
  const { currentNetwork } = useNetwork();

  // Duration threshold (default 500ms)
  const durationMin = search.durationMin ?? DEFAULT_DURATION_MIN;

  // Reference nodes filter (default true)
  const referenceNodes = search.referenceNodes ?? true;

  // Build order_by string for API
  const orderBy = search.orderBy ?? DEFAULT_ORDER;

  const filterQuery = payloadFilters(search, durationMin, referenceNodes);
  const pageSize = search.pageSize ?? DEFAULT_PAGE_SIZE;

  // Newest first reads widening windows back from now or the page cursor (`pageToken` holds a time cursor in this
  // sort), never the whole table at once. A block number has no time to bound a ranking by, so it reads this way too
  // and its few rows are sorted here.
  const isNewestFirst = orderBy === 'slot desc' || search.blockNumber !== undefined;
  const { data: tableBounds, isLoading: boundsLoading } = useTableBounds('int_engine_new_payload');
  const timeBounds = payloadTimeBounds(search, currentNetwork?.genesis_time ?? 0, tableBounds?.min);
  const cursor = parseTimeCursor(search.pageToken);
  const newestQuery = useQuery({
    queryKey: ['payloads', 'newest', currentNetwork?.name, filterQuery, timeBounds, cursor, pageSize],
    queryFn: ({ signal }) =>
      fetchNewestFirst<IntEngineNewPayload>({
        pageSize,
        end: cursor?.end ?? timeBounds.end ?? nowEnd(),
        skip: cursor?.skip,
        floor: timeBounds.floor,
        timeOf: row => row.slot_start_date_time,
        fetchWindow: async (window, limit) => {
          const { data } = await intEngineNewPayloadServiceList({
            query: payloadWindowQuery(filterQuery, window, NEWEST_FIRST_ORDER, limit),
            signal,
            throwOnError: true,
          });
          return data.int_engine_new_payload ?? [];
        },
      }),
    enabled: !!currentNetwork && isNewestFirst && !boundsLoading,
    placeholderData: keepPreviousData,
  });

  // Any other sort ranks within the URL's time range, at most its last RANKED_MAX_DAYS days, so it never sorts the
  // whole table
  // Pinned at page load, so the query stays put; a reload ranks up to the new now
  const [loadedAt] = useState(nowEnd);
  const rankedEnd = timeBounds.end ?? loadedAt;
  const rankedEarliest = rankedEnd - RANKED_MAX_DAYS * 86_400;
  const rankedWindow = { gte: Math.max(timeBounds.floor ?? 0, rankedEarliest), lt: rankedEnd };
  const rankedCapped = !search.slot && (timeBounds.floor ?? 0) < rankedEarliest;
  const sortedQuery = useQuery({
    queryKey: [
      'payloads',
      'ranked',
      currentNetwork?.name,
      filterQuery,
      rankedWindow,
      orderBy,
      pageSize,
      search.pageToken,
    ],
    queryFn: async ({ signal }) => {
      const { data } = await intEngineNewPayloadServiceList({
        query: {
          ...payloadWindowQuery(filterQuery, rankedWindow, `${orderBy}, ${NEWEST_FIRST_ORDER}`, pageSize),
          page_token: search.pageToken,
        },
        signal,
        throwOnError: true,
      });
      return data;
    },
    enabled: !!currentNetwork && !isNewestFirst && !boundsLoading,
    // Keep the table in place while a filter change loads, so the page keeps its scroll position
    placeholderData: keepPreviousData,
  });
  const windowLabel =
    !isNewestFirst && rankedCapped
      ? `Slowest in the last ${RANKED_MAX_DAYS} days`
      : search.timeStart !== undefined && search.timeEnd !== undefined && search.blockNumber === undefined
        ? formatTimeRange(search.timeStart, search.timeEnd)
        : undefined;
  const isLoading = isNewestFirst ? boundsLoading || newestQuery.isLoading : sortedQuery.isLoading;
  const error = isNewestFirst ? newestQuery.error : sortedQuery.error;

  // Current filter values from the URL, for the filter panel
  const currentFilterValues: FilterValues = useMemo(
    () => ({
      timeStart: search.timeStart,
      timeEnd: search.timeEnd,
      durationMin: search.durationMin,
      gasUsedMin: search.gasUsedMin,
      txCountMin: search.txCountMin,
      status: search.status,
      elClient: search.elClient,
      slot: search.slot,
      blockNumber: search.blockNumber,
      referenceNodes,
    }),
    [search, referenceNodes]
  );

  const data = useMemo(() => {
    if (!isNewestFirst) return sortedQuery.data?.int_engine_new_payload ?? [];
    const rows = newestQuery.data?.rows ?? [];
    if (orderBy === 'slot desc') return rows;
    // A block number's rows, sorted by the chosen column
    const [field, direction] = orderBy.split(' ') as [keyof IntEngineNewPayload, string];
    const sign = direction === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const left = a[field];
      const right = b[field];
      if (left === right) return 0;
      if (left === undefined || left === null) return 1;
      if (right === undefined || right === null) return -1;
      return (left > right ? 1 : -1) * sign;
    });
  }, [isNewestFirst, orderBy, newestQuery.data, sortedQuery.data]);

  // Store the next page token for pagination
  const nextPageToken = isNewestFirst
    ? newestQuery.data?.next && encodeTimeCursor(newestQuery.data.next)
    : sortedQuery.data?.next_page_token;

  // Current page from URL (0-indexed)
  const currentPage = search.page ?? 0;

  // Handle pagination change
  const handlePaginationChange = useCallback(
    (newPageIndex: number, pageSize: number): void => {
      const isChangingPageSize = pageSize !== (search.pageSize ?? DEFAULT_PAGE_SIZE);

      // If changing page size, reset to first page
      if (isChangingPageSize) {
        navigate({
          search: prev => ({
            ...prev,
            pageSize,
            page: 0,
            pageToken: undefined,
          }),
          resetScroll: false,
        });
        return;
      }

      // Going to next page
      if (newPageIndex > currentPage && nextPageToken) {
        navigate({
          search: prev => ({
            ...prev,
            page: newPageIndex,
            pageToken: nextPageToken,
          }),
          resetScroll: false,
        });
        return;
      }

      // Going back to first page (cursor pagination doesn't support arbitrary back navigation)
      if (newPageIndex === 0) {
        navigate({
          search: prev => ({
            ...prev,
            page: 0,
            pageToken: undefined,
          }),
          resetScroll: false,
        });
      }
    },
    [navigate, search.pageSize, nextPageToken, currentPage]
  );

  // Handle sorting change
  const handleSortingChange = useCallback(
    (sorting: SortingState): void => {
      const [sort] = sorting;
      if (!sort) {
        navigate({
          search: prev => ({
            ...prev,
            orderBy: undefined,
            page: 0,
            pageToken: undefined,
          }),
          resetScroll: false,
        });
      } else {
        const { id, desc } = sort;
        navigate({
          search: prev => ({
            ...prev,
            orderBy: `${id} ${desc ? 'desc' : 'asc'}`,
            page: 0,
            pageToken: undefined,
          }),
          resetScroll: false,
        });
      }
    },
    [navigate]
  );

  // Handle filter click from table cell values
  const handleFilterClick = useCallback(
    (field: string, value: string | number): void => {
      const newSearch: Partial<PayloadsSearch> = {
        page: 0,
        pageToken: undefined,
      };

      switch (field) {
        case 'status':
          newSearch.status = value as string;
          break;
        case 'meta_execution_implementation':
          newSearch.elClient = value as string;
          break;
        case 'slot':
          newSearch.slot = value as number;
          break;
      }

      navigate({
        search: prev => ({
          ...prev,
          ...newSearch,
        }),
        resetScroll: false,
      });
    },
    [navigate]
  );

  // Build current sorting state from URL
  const currentSorting: SortingState = useMemo(() => {
    const [id = '', direction] = orderBy.split(' ');
    return [{ id, desc: direction === 'desc' }];
  }, [orderBy]);

  // Handle filter panel changes
  const handleFiltersChange = useCallback(
    (filters: FilterValues): void => {
      navigate({
        search: prev => ({
          ...prev,
          page: 0,
          pageToken: undefined,
          timeStart: filters.timeStart,
          timeEnd: filters.timeEnd,
          durationMin: filters.durationMin,
          gasUsedMin: filters.gasUsedMin,
          txCountMin: filters.txCountMin,
          status: filters.status,
          elClient: filters.elClient,
          slot: filters.slot,
          blockNumber: filters.blockNumber,
          referenceNodes: filters.referenceNodes,
        }),
        resetScroll: false,
      });
    },
    [navigate]
  );

  // Handle clear all filters (keeps referenceNodes at default true)
  const handleClearFilters = useCallback((): void => {
    navigate({
      search: prev => ({
        ...prev,
        page: 0,
        pageToken: undefined,
        timeStart: undefined,
        timeEnd: undefined,
        durationMin: undefined,
        gasUsedMin: undefined,
        txCountMin: undefined,
        status: undefined,
        elClient: undefined,
        slot: undefined,
        blockNumber: undefined,
        referenceNodes: undefined, // Will default to true
      }),
      resetScroll: false,
    });
  }, [navigate]);

  // Handle opening block details - updates URL
  const handleBlockSelect = useCallback(
    (block: IntEngineNewPayload | null): void => {
      if (block) {
        navigate({
          search: prev => ({
            ...prev,
            detailSlot: block.slot,
            detailNodeName: block.meta_client_name,
          }),
          resetScroll: false,
        });
      } else {
        navigate({
          search: prev => ({
            ...prev,
            detailSlot: undefined,
            detailNodeName: undefined,
          }),
          resetScroll: false,
        });
      }
    },
    [navigate]
  );

  // Find selected block from URL params
  const selectedBlock = useMemo(() => {
    if (!search.detailSlot || !search.detailNodeName) return null;
    return (
      data.find(block => block.slot === search.detailSlot && block.meta_client_name === search.detailNodeName) ?? null
    );
  }, [data, search.detailSlot, search.detailNodeName]);

  // Get tracoor URL from network config for external links
  const tracoorUrl = currentNetwork?.service_urls?.tracoor;

  return (
    <PayloadsView
      data={data}
      isLoading={isLoading}
      error={error as Error | null}
      pagination={{
        pageIndex: currentPage,
        pageSize: search.pageSize ?? DEFAULT_PAGE_SIZE,
        onPaginationChange: handlePaginationChange,
      }}
      sorting={currentSorting}
      onSortingChange={handleSortingChange}
      onFilterClick={handleFilterClick}
      hasNextPage={!!nextPageToken}
      filters={currentFilterValues}
      onFiltersChange={handleFiltersChange}
      onClearFilters={handleClearFilters}
      selectedBlock={selectedBlock}
      onBlockSelect={handleBlockSelect}
      durationThreshold={durationMin}
      windowLabel={windowLabel}
      tracoorUrl={tracoorUrl}
    />
  );
}
