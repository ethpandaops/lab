import { type JSX, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useNetwork } from '@/hooks/useNetwork';
import { intEngineNewPayloadServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { PayloadsSearch, FilterValues } from './IndexPage.types';
import {
  DEFAULT_DURATION_MIN,
  DEFAULT_PAGE_SIZE,
  DEFAULT_TIME_RANGE_HOURS,
  LIVE_MODE_ENABLED,
} from './IndexPage.types';
import { PayloadsView } from './components/PayloadsView';
import type { IntEngineNewPayload } from '@/api/types.gen';
import type { SortingState } from '@tanstack/react-table';
import { useLivePayloadsStream } from './hooks';

/**
 * Payloads page showing individual engine_newPayload observations
 * Focuses on blocks that took abnormally long to validate
 */
export function IndexPage(): JSX.Element {
  const navigate = useNavigate({ from: '/ethereum/execution/payloads/' });
  const search = useSearch({ from: '/ethereum/execution/payloads/' }) as PayloadsSearch;
  const { currentNetwork } = useNetwork();

  // Capture initial detail params from URL on mount (for deep-linking)
  const initialDetailSlotRef = useRef<number | undefined>(search.detailSlot);

  // Calculate time range in seconds
  // Use URL params if provided, otherwise default to last hour with no upper bound
  const timeRange = useMemo(() => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const defaultRangeSeconds = DEFAULT_TIME_RANGE_HOURS * 60 * 60;

    if (search.timeStart !== undefined && search.timeEnd !== undefined) {
      return {
        start: search.timeStart,
        end: search.timeEnd,
      };
    }

    // Only use initial detail slot for deep-linking
    const initialDetailSlot = initialDetailSlotRef.current;
    if (initialDetailSlot !== undefined) {
      // Extend range to include the slot time with buffer
      const oneHourSeconds = 60 * 60;
      const rangeStart = Math.min(nowSeconds - defaultRangeSeconds, initialDetailSlot - oneHourSeconds);
      const rangeEnd = Math.max(nowSeconds, initialDetailSlot + oneHourSeconds);
      return {
        start: rangeStart,
        end: rangeEnd,
      };
    }

    // Default: NOW - 1h with no upper bound (undefined lets API use current time)
    return {
      start: nowSeconds - defaultRangeSeconds,
      end: undefined,
    };
  }, [search.timeStart, search.timeEnd]);

  // Check if live mode is enabled from URL (only if feature is enabled)
  const isLive = LIVE_MODE_ENABLED && (search.isLive ?? false);

  // Duration threshold (default 500ms)
  const durationMin = search.durationMin ?? DEFAULT_DURATION_MIN;

  // Reference nodes filter (default true)
  const referenceNodes = search.referenceNodes ?? true;

  // Build order_by string for API
  const orderBy = useMemo(() => {
    const field = search.orderBy?.split(' ')[0] ?? 'slot';
    const order = search.orderBy?.split(' ')[1] ?? 'desc';
    return `${field} ${order}`;
  }, [search.orderBy]);

  // Fetch data from the API with server-side filtering and sorting
  // Disabled in live mode - live mode uses its own polling
  const {
    data: apiData,
    isLoading,
    error,
  } = useQuery({
    ...intEngineNewPayloadServiceListOptions({
      query: {
        slot_start_date_time_gte: timeRange.start,
        ...(timeRange.end !== undefined && { slot_start_date_time_lte: timeRange.end }),
        duration_ms_gte: durationMin,
        page_size: search.pageSize ?? DEFAULT_PAGE_SIZE,
        page_token: search.pageToken,
        order_by: orderBy,
        // Server-side filters
        ...(search.status &&
          (search.status.includes(',') ? { status_in_values: search.status } : { status_eq: search.status })),
        ...(search.elClient &&
          (search.elClient.includes(',')
            ? { meta_execution_implementation_in_values: search.elClient }
            : { meta_execution_implementation_eq: search.elClient })),
        ...(search.slot && { slot_eq: search.slot }),
        ...(search.blockNumber && { block_number_eq: search.blockNumber }),
        ...(search.gasUsedMin && { gas_used_gte: search.gasUsedMin }),
        ...(search.txCountMin && { tx_count_gte: search.txCountMin }),
        ...(referenceNodes && { node_class_eq: 'eip7870-block-builder' }),
      },
    }),
    enabled: !!currentNetwork && !isLive,
  });

  // Build current filter values from URL for live mode hook
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

  // Live streaming mode - fetches on bounds change and animates items in
  const {
    displayedItems: liveItems,
    newItemIdsRef,
    hitPageLimitRef,
    error: liveError,
  } = useLivePayloadsStream({
    enabled: isLive && !!currentNetwork,
    filters: currentFilterValues,
    durationMin,
  });

  // Use API data directly (for non-live mode)
  const paginatedData = useMemo(() => {
    return apiData?.int_engine_new_payload ?? [];
  }, [apiData]);

  // Choose which data to display based on mode
  const data = isLive ? liveItems : paginatedData;

  // Store the next page token for pagination
  const nextPageToken = apiData?.next_page_token;

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
        });
      }
    },
    [navigate, search.pageSize, nextPageToken, currentPage]
  );

  // Handle sorting change
  const handleSortingChange = useCallback(
    (sorting: SortingState): void => {
      if (sorting.length === 0) {
        navigate({
          search: prev => ({
            ...prev,
            orderBy: undefined,
            page: 0,
            pageToken: undefined,
          }),
        });
      } else {
        const { id, desc } = sorting[0];
        navigate({
          search: prev => ({
            ...prev,
            orderBy: `${id} ${desc ? 'desc' : 'asc'}`,
            page: 0,
            pageToken: undefined,
          }),
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
      });
    },
    [navigate]
  );

  // Build current sorting state from URL
  const currentSorting: SortingState = useMemo(() => {
    if (!search.orderBy) return [{ id: 'slot', desc: true }];
    const parts = search.orderBy.split(' ');
    return [{ id: parts[0], desc: parts[1] === 'desc' }];
  }, [search.orderBy]);

  // Handle live mode toggle
  const handleLiveModeToggle = useCallback((): void => {
    navigate({
      search: prev => ({
        ...prev,
        isLive: !prev.isLive,
        page: 0,
        pageToken: undefined,
      }),
    });
  }, [navigate]);

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
        });
      } else {
        navigate({
          search: prev => ({
            ...prev,
            detailSlot: undefined,
            detailNodeName: undefined,
          }),
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

  return (
    <PayloadsView
      data={data}
      isLoading={isLoading && !isLive}
      error={isLive ? liveError : (error as Error | null)}
      pagination={{
        pageIndex: currentPage,
        pageSize: search.pageSize ?? DEFAULT_PAGE_SIZE,
        onPaginationChange: handlePaginationChange,
      }}
      sorting={currentSorting}
      onSortingChange={handleSortingChange}
      onFilterClick={handleFilterClick}
      hasNextPage={!!apiData?.next_page_token}
      filters={currentFilterValues}
      onFiltersChange={handleFiltersChange}
      onClearFilters={handleClearFilters}
      selectedBlock={selectedBlock}
      onBlockSelect={handleBlockSelect}
      durationThreshold={durationMin}
      // Live mode props (disabled when LIVE_MODE_ENABLED is false)
      isLive={isLive}
      onLiveModeToggle={LIVE_MODE_ENABLED ? handleLiveModeToggle : undefined}
      newItemIdsRef={newItemIdsRef}
      liveHitPageLimitRef={hitPageLimitRef}
    />
  );
}
