import { type JSX, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useNetwork } from '@/hooks/useNetwork';
import { intEngineNewPayloadServiceListOptions } from '@/api/@tanstack/react-query.gen';
import type { SlowBlocksSearch, FilterValues } from './IndexPage.types';
import { DEFAULT_DURATION_MIN, DEFAULT_PAGE_SIZE, DEFAULT_TIME_RANGE_HOURS } from './IndexPage.types';
import { SlowBlocksView } from './components/SlowBlocksView';
import type { IntEngineNewPayload } from '@/api/types.gen';
import type { SortingState } from '@tanstack/react-table';
import { useLiveSlowBlocksStream } from './hooks';

/**
 * Slow Blocks Analysis page showing individual engine_newPayload observations
 * Focuses on blocks that took abnormally long to validate
 */
export function IndexPage(): JSX.Element {
  const navigate = useNavigate({ from: '/ethereum/execution/slow-blocks/' });
  const search = useSearch({ from: '/ethereum/execution/slow-blocks/' }) as SlowBlocksSearch;
  const { currentNetwork } = useNetwork();

  // Capture initial detail params from URL on mount (for deep-linking)
  const initialDetailSlotRef = useRef<number | undefined>(search.detailSlot);

  // Calculate time range in seconds
  // Use URL params if provided, otherwise default to last hour
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

    // Default: NOW - 1h to NOW
    return {
      start: nowSeconds - defaultRangeSeconds,
      end: nowSeconds,
    };
  }, [search.timeStart, search.timeEnd]);

  // Check if live mode is enabled from URL
  const isLive = search.isLive ?? false;

  // Duration threshold (default 500ms)
  const durationMin = search.durationMin ?? DEFAULT_DURATION_MIN;

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
        slot_start_date_time_lte: timeRange.end,
        duration_ms_gte: durationMin,
        page_size: search.pageSize ?? DEFAULT_PAGE_SIZE,
        page_token: search.pageToken,
        order_by: orderBy,
        // Server-side filters
        ...(search.durationMax && { duration_ms_lte: search.durationMax }),
        ...(search.status && { status_eq: search.status }),
        ...(search.elClient && { meta_execution_implementation_eq: search.elClient }),
        ...(search.clClient && { meta_client_implementation_eq: search.clClient }),
        ...(search.nodeName && { meta_client_name_eq: search.nodeName }),
        ...(search.blockStatus && { block_status_eq: search.blockStatus }),
        ...(search.slot && { slot_eq: search.slot }),
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
      durationMax: search.durationMax,
      status: search.status,
      elClient: search.elClient,
      clClient: search.clClient,
      nodeName: search.nodeName,
      blockStatus: search.blockStatus,
      slot: search.slot,
    }),
    [search]
  );

  // Live streaming mode - fetches on bounds change and animates items in
  const {
    displayedItems: liveItems,
    newItemIdsRef,
    hitPageLimitRef,
    error: liveError,
  } = useLiveSlowBlocksStream({
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

  // Handle pagination change
  const handlePaginationChange = useCallback(
    (_pageIndex: number, pageSize: number): void => {
      const isChangingPageSize = pageSize !== (search.pageSize ?? DEFAULT_PAGE_SIZE);

      navigate({
        search: prev => ({
          ...prev,
          pageSize,
          pageToken: isChangingPageSize ? undefined : nextPageToken,
        }),
      });
    },
    [navigate, search.pageSize, nextPageToken]
  );

  // Handle sorting change
  const handleSortingChange = useCallback(
    (sorting: SortingState): void => {
      if (sorting.length === 0) {
        navigate({
          search: prev => ({
            ...prev,
            orderBy: undefined,
            pageToken: undefined,
          }),
        });
      } else {
        const { id, desc } = sorting[0];
        navigate({
          search: prev => ({
            ...prev,
            orderBy: `${id} ${desc ? 'desc' : 'asc'}`,
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
      const newSearch: Partial<SlowBlocksSearch> = {
        pageToken: undefined,
      };

      switch (field) {
        case 'status':
          newSearch.status = value as string;
          break;
        case 'meta_execution_implementation':
          newSearch.elClient = value as string;
          break;
        case 'meta_client_implementation':
          newSearch.clClient = value as string;
          break;
        case 'meta_client_name':
          newSearch.nodeName = value as string;
          break;
        case 'block_status':
          newSearch.blockStatus = value as string;
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
          pageToken: undefined,
          timeStart: filters.timeStart,
          timeEnd: filters.timeEnd,
          durationMin: filters.durationMin,
          durationMax: filters.durationMax,
          status: filters.status,
          elClient: filters.elClient,
          clClient: filters.clClient,
          nodeName: filters.nodeName,
          blockStatus: filters.blockStatus,
          slot: filters.slot,
        }),
      });
    },
    [navigate]
  );

  // Handle clear all filters
  const handleClearFilters = useCallback((): void => {
    navigate({
      search: prev => ({
        ...prev,
        pageToken: undefined,
        timeStart: undefined,
        timeEnd: undefined,
        durationMin: undefined,
        durationMax: undefined,
        status: undefined,
        elClient: undefined,
        clClient: undefined,
        nodeName: undefined,
        blockStatus: undefined,
        slot: undefined,
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
    <SlowBlocksView
      data={data}
      isLoading={isLoading && !isLive}
      error={isLive ? liveError : (error as Error | null)}
      pagination={{
        pageIndex: 0,
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
      // Live mode props
      isLive={isLive}
      onLiveModeToggle={handleLiveModeToggle}
      newItemIdsRef={newItemIdsRef}
      liveHitPageLimitRef={hitPageLimitRef}
    />
  );
}
