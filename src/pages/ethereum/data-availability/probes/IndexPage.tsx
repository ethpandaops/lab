import { type JSX, useMemo, useCallback, useState } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNetwork } from '@/hooks/useNetwork';
import { useTableBounds } from '@/hooks/useBounds';
import { intCustodyProbeServiceList } from '@/api/sdk.gen';
import { encodeTimeCursor, fetchNewestFirst, parseTimeCursor } from '@/utils/widening-window';
import {
  intCustodyProbeServiceListOptions,
  intCustodyProbeOrderBySlotServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import { formatTimeRange, formatTimestamp } from '@/utils/time';
import { useFuluActivation } from '@/pages/ethereum/data-availability/custody/hooks/useFuluActivation';
import type { ProbesSearch } from './IndexPage.types';
import { ProbesView } from './components/ProbesView';
import type { FilterValues } from './components/FilterPanel';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';
import type { IntCustodyProbe } from '@/api/types.gen';
import { useLiveProbeStream } from './hooks';

/** Newest first with tie-breaks, so probes of one second keep their order across pages */
const NEWEST_FIRST_ORDER = 'probe_date_time desc, peer_id_unique_key asc, slot desc';

/** Reach of the other sorts, which read every probe in their range: the last week */
const SORTED_WINDOW_SECONDS = 7 * 24 * 3600;

/**
 * Custody Probes page showing individual probe results
 */
export function IndexPage(): JSX.Element {
  const navigate = useNavigate({ from: '/ethereum/data-availability/probes/' });
  const search = useSearch({ from: '/ethereum/data-availability/probes/' }) as ProbesSearch;
  const { currentNetwork } = useNetwork();
  const { fuluActivation } = useFuluActivation();

  // timeStart/timeEnd scope the list to probes of slots in that window (the custody drill-down's
  // range), read from the slot-ordered table. Without them, every probe since Fulu.
  const hasSlotWindow = search.timeStart !== undefined && search.timeEnd !== undefined;
  // A slot filter also reads the slot-ordered table: int_custody_probe is sorted by probe time, so a slot
  // lookup there scans every probe since Fulu.
  const bySlot = hasSlotWindow || search.slot !== undefined;

  // Bounded by now so ClickHouse can cut off early with ORDER BY; fixed on mount so opening a probe keeps the page
  const [now] = useState(() => Math.floor(Date.now() / 1000));

  // Check if live mode is enabled from URL (needed before query)
  const isLive = search.isLive ?? false;

  // Build order_by string for API
  const orderBy = useMemo(() => {
    // Default to probe_date_time desc if no sort specified
    const field = search.sortBy ?? 'probe_date_time';
    const order = search.sortOrder ?? 'desc';
    return `${field} ${order}`;
  }, [search.sortBy, search.sortOrder]);
  const isNewestFirst = orderBy === 'probe_date_time desc';

  const windowLabel = hasSlotWindow
    ? `Slots ${formatTimeRange(search.timeStart!, search.timeEnd!)}`
    : !bySlot && !isNewestFirst
      ? 'Last 7 days'
      : fuluActivation
        ? `Since ${formatTimestamp(fuluActivation.dateTime, { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })}`
        : undefined;

  // Fetch data from the API with server-side filtering and sorting
  // Disabled in live mode - live mode uses its own polling
  const pageSize = search.pageSize ?? 25;
  const listFilters = {
    ...(search.result && { result_eq: search.result }),
    ...(search.prober && { meta_client_implementation_eq: search.prober }),
    ...(search.peer && { meta_peer_implementation_eq: search.peer }),
    ...(search.peerId && { peer_id_unique_key_in_values: search.peerId }),
    ...(search.nodeId && { node_id_eq: search.nodeId }),
    ...(search.proberCountry && { meta_client_geo_country_eq: search.proberCountry }),
    ...(search.peerCountry && { meta_peer_geo_country_eq: search.peerCountry }),
    ...(search.proberCity && { meta_client_geo_city_eq: search.proberCity }),
    ...(search.peerCity && { meta_peer_geo_city_eq: search.peerCity }),
    ...(search.proberVersion && { meta_client_version_eq: search.proberVersion }),
    ...(search.peerVersion && { meta_peer_version_eq: search.peerVersion }),
    ...(search.proberAsn && { meta_client_geo_autonomous_system_number_eq: search.proberAsn }),
    ...(search.peerAsn && { meta_peer_geo_autonomous_system_number_eq: search.peerAsn }),
    ...(search.slot !== undefined && { slot_eq: search.slot }),
    ...(search.column !== undefined && { column_indices_has: search.column }),
    ...(search.blobPosters?.length && { blob_submitters_has_any_values: search.blobPosters }),
  };
  const listQuery = { page_size: pageSize, page_token: search.pageToken, order_by: orderBy, ...listFilters };

  // Probes by time start at Fulu, or the table's start if later. Newest first reads widening windows back from now
  // or the page cursor (`pageToken` holds a time cursor in this sort); other sorts cover the last week.
  const { data: probeBounds, isLoading: boundsLoading } = useTableBounds('int_custody_probe');
  const probeFloor = fuluActivation ? Math.max(fuluActivation.dateTime, probeBounds?.min ?? 0) : undefined;
  const cursor = parseTimeCursor(search.pageToken);
  const newestQuery = useQuery({
    queryKey: [
      'probes',
      'newest',
      currentNetwork?.name,
      listFilters,
      fuluActivation?.slot,
      probeFloor,
      now,
      cursor,
      pageSize,
    ],
    queryFn: ({ signal }) =>
      fetchNewestFirst<IntCustodyProbe>({
        pageSize,
        end: cursor?.end ?? now + 1,
        skip: cursor?.skip,
        floor: probeFloor,
        timeOf: probe => probe.probe_date_time,
        fetchWindow: async (window, limit) => {
          const { data } = await intCustodyProbeServiceList({
            query: {
              probe_date_time_gte: window.gte,
              probe_date_time_lt: window.lt,
              // Filter out pre-Fulu slots server-side (PeerDAS only exists after Fulu)
              slot_gte: fuluActivation!.slot,
              ...listFilters,
              order_by: NEWEST_FIRST_ORDER,
              page_size: limit,
            },
            signal,
            throwOnError: true,
          });
          return data.int_custody_probe ?? [];
        },
      }),
    enabled: !!currentNetwork && !!fuluActivation && !isLive && !bySlot && isNewestFirst && !boundsLoading,
    placeholderData: keepPreviousData,
  });
  const probeTimeQuery = useQuery({
    ...intCustodyProbeServiceListOptions({
      query: {
        probe_date_time_gte: Math.max(now - SORTED_WINDOW_SECONDS, probeFloor ?? 0),
        probe_date_time_lte: now,
        // Filter out pre-Fulu slots server-side (PeerDAS only exists after Fulu)
        ...(fuluActivation && { slot_gte: fuluActivation.slot }),
        ...listQuery,
      },
    }),
    enabled: !!currentNetwork && !!fuluActivation && !isLive && !bySlot && !isNewestFirst,
    // Keep the table while a filter or page loads, so the page keeps its height and scroll position
    placeholderData: keepPreviousData,
  });
  // The probe-time list, whichever sort reads it
  const probeTimeList = isNewestFirst
    ? {
        isLoading: boundsLoading || newestQuery.isLoading,
        error: newestQuery.error,
        rows: newestQuery.data?.rows,
        next: newestQuery.data?.next && encodeTimeCursor(newestQuery.data.next),
      }
    : {
        isLoading: probeTimeQuery.isLoading,
        error: probeTimeQuery.error,
        rows: probeTimeQuery.data?.int_custody_probe,
        next: probeTimeQuery.data?.next_page_token,
      };
  const slotWindowQuery = useQuery({
    ...intCustodyProbeOrderBySlotServiceListOptions({
      query: {
        // From Fulu on (PeerDAS only exists after it). Bounded by time, not slot_gte: the API drops the
        // slot_start_date_time filters when a slot range filter is present.
        // A slot filter is narrower than the window and becomes a slot_start_date_time filter itself.
        ...(search.slot === undefined && {
          slot_start_date_time_gte: Math.max(search.timeStart ?? 0, fuluActivation?.dateTime ?? 0),
          slot_start_date_time_lt: search.timeEnd,
        }),
        ...listQuery,
      },
    }),
    enabled: !!currentNetwork && !!fuluActivation && !isLive && bySlot,
    placeholderData: keepPreviousData,
  });
  const { isLoading, error } = bySlot ? slotWindowQuery : probeTimeList;
  const nextPageToken = bySlot ? slotWindowQuery.data?.next_page_token : probeTimeList.next;

  // Build current filter values from URL for live mode hook
  const currentFilterValues: FilterValues = useMemo(
    () => ({
      result: search.result,
      prober: search.prober,
      peer: search.peer,
      peerId: search.peerId,
      nodeId: search.nodeId,
      proberCountry: search.proberCountry,
      peerCountry: search.peerCountry,
      proberCity: search.proberCity,
      peerCity: search.peerCity,
      proberVersion: search.proberVersion,
      peerVersion: search.peerVersion,
      proberAsn: search.proberAsn,
      peerAsn: search.peerAsn,
      slot: search.slot,
      column: search.column,
      blobPosters: search.blobPosters,
    }),
    [search]
  );

  // Live streaming mode - fetches on bounds change and animates items in
  const {
    displayedItems: liveItems,
    newItemIdsRef,
    hitPageLimitRef,
    error: liveError,
  } = useLiveProbeStream({
    enabled: isLive && !!currentNetwork && !!fuluActivation,
    filters: currentFilterValues,
    fuluSlot: fuluActivation?.slot,
  });

  // Use API data directly (for non-live mode)
  const paginatedData = useMemo(
    (): IntCustodyProbe[] =>
      (bySlot ? slotWindowQuery.data?.int_custody_probe_order_by_slot : probeTimeList.rows) ?? [],
    [bySlot, slotWindowQuery.data, probeTimeList.rows]
  );

  // Choose which data to display based on mode
  const data = isLive ? liveItems : paginatedData;

  // Normalize probePeerId by stripping quotes (clipboard URLs have quotes, navigate() doesn't)
  const normalizedProbePeerId = useMemo(() => {
    if (!search.probePeerId) return null;
    return search.probePeerId.replace(/^"|"$/g, '');
  }, [search.probePeerId]);

  // Check if probe exists in current page data (to avoid unnecessary deep-link fetch)
  const probeInCurrentData = useMemo(() => {
    if (!search.probeTime || !normalizedProbePeerId) return null;
    return (
      data.find(
        probe =>
          probe.probe_date_time === search.probeTime && String(probe.peer_id_unique_key) === normalizedProbePeerId
      ) ?? null
    );
  }, [data, search.probeTime, normalizedProbePeerId]);

  // Fetch probes for deep-linking (when probeTime and probePeerId are in URL but NOT in current data)
  const { data: deepLinkedProbeData } = useQuery({
    ...intCustodyProbeServiceListOptions({
      query: {
        probe_date_time_gte: search.probeTime,
        probe_date_time_lte: search.probeTime,
        ...(normalizedProbePeerId && { peer_id_unique_key_in_values: normalizedProbePeerId }),
        page_size: 100,
        // Filter out pre-Fulu slots server-side (PeerDAS only exists after Fulu)
        ...(fuluActivation && { slot_gte: fuluActivation.slot }),
      },
    }),
    // Only fetch if probe is not already in current page data
    enabled: !!currentNetwork && !!fuluActivation && !!search.probeTime && !!search.probePeerId && !probeInCurrentData,
  });

  // Handle pagination change
  const handlePaginationChange = useCallback(
    (pageIndex: number, pageSize: number): void => {
      const currentPageIndex = (search.page ?? 1) - 1;
      const isGoingForward = pageIndex > currentPageIndex;
      const isChangingPageSize = pageSize !== (search.pageSize ?? 25);

      navigate({
        resetScroll: false,
        search: prev => ({
          ...prev,
          page: pageIndex + 1,
          pageSize,
          // Use next_page_token when going forward, reset when going back or changing page size
          pageToken: isChangingPageSize ? undefined : isGoingForward ? nextPageToken : undefined,
        }),
      });
    },
    [navigate, search.page, search.pageSize, nextPageToken]
  );

  // Handle sorting change
  const handleSortingChange = useCallback(
    (sorting: SortingState): void => {
      const [sort] = sorting;
      if (!sort) {
        // Reset to default sort
        navigate({
          resetScroll: false,
          search: prev => ({
            ...prev,
            sortBy: undefined,
            sortOrder: undefined,
            pageToken: undefined, // Reset pagination when sorting changes
          }),
        });
      } else {
        const { id, desc } = sort;
        navigate({
          resetScroll: false,
          search: prev => ({
            ...prev,
            sortBy: id,
            sortOrder: desc ? 'desc' : 'asc',
            pageToken: undefined, // Reset pagination when sorting changes
          }),
        });
      }
    },
    [navigate]
  );

  // Handle column filter change
  const handleColumnFiltersChange = useCallback(
    (filters: ColumnFiltersState): void => {
      // Build new search params from filters
      const newSearch: Partial<ProbesSearch> = {
        page: 1, // Reset to first page when filtering
        pageToken: undefined, // Reset pagination when filtering
      };

      for (const filter of filters) {
        const value = filter.value as string;
        switch (filter.id) {
          case 'result':
            newSearch.result = value || undefined;
            break;
          case 'meta_client_implementation':
            newSearch.prober = value || undefined;
            break;
          case 'meta_peer_implementation':
            newSearch.peer = value || undefined;
            break;
          case 'peer_id_unique_key':
            newSearch.peerId = value || undefined;
            break;
          case 'meta_client_geo_country':
            newSearch.proberCountry = value || undefined;
            break;
          case 'meta_peer_geo_country':
            newSearch.peerCountry = value || undefined;
            break;
        }
      }

      navigate({
        resetScroll: false,
        search: prev => ({
          ...prev,
          ...newSearch,
        }),
      });
    },
    [navigate]
  );

  // Handle filter click from table cell values
  const handleFilterClick = useCallback(
    (field: string, value: string | number): void => {
      const newSearch: Partial<ProbesSearch> = {
        page: 1,
        pageToken: undefined,
      };

      switch (field) {
        case 'result':
          newSearch.result = value as string;
          break;
        case 'meta_client_implementation':
          newSearch.prober = value as string;
          break;
        case 'meta_peer_implementation':
          newSearch.peer = value as string;
          break;
        case 'peer_id_unique_key':
          newSearch.peerId = String(value);
          break;
        case 'node_id':
          newSearch.nodeId = value as string;
          break;
        case 'meta_client_geo_country':
          newSearch.proberCountry = value as string;
          break;
        case 'meta_peer_geo_country':
          newSearch.peerCountry = value as string;
          break;
        case 'meta_client_geo_city':
          newSearch.proberCity = value as string;
          break;
        case 'meta_peer_geo_city':
          newSearch.peerCity = value as string;
          break;
        case 'meta_client_version':
          newSearch.proberVersion = value as string;
          break;
        case 'meta_peer_version':
          newSearch.peerVersion = value as string;
          break;
        case 'meta_client_geo_autonomous_system_number':
          newSearch.proberAsn = value as number;
          break;
        case 'meta_peer_geo_autonomous_system_number':
          newSearch.peerAsn = value as number;
          break;
        case 'slot':
          newSearch.slot = value as number;
          break;
        case 'column':
          newSearch.column = value as number;
          break;
        case 'blob_submitters':
          // Add to existing array or create new one
          newSearch.blobPosters = [...(search.blobPosters ?? []), value as string].filter(
            (v, i, a) => a.indexOf(v) === i // dedupe
          );
          break;
      }

      navigate({
        resetScroll: false,
        search: prev => ({
          ...prev,
          ...newSearch,
        }),
      });
    },
    [navigate, search.blobPosters]
  );

  // Build current sorting state from URL
  const currentSorting: SortingState = useMemo(() => {
    if (!search.sortBy) return [{ id: 'probe_date_time', desc: true }];
    return [{ id: search.sortBy, desc: search.sortOrder === 'desc' }];
  }, [search.sortBy, search.sortOrder]);

  // Build current column filters from URL
  const currentFilters: ColumnFiltersState = useMemo(() => {
    const filters: ColumnFiltersState = [];
    if (search.result) filters.push({ id: 'result', value: search.result });
    if (search.prober) filters.push({ id: 'meta_client_implementation', value: search.prober });
    if (search.peer) filters.push({ id: 'meta_peer_implementation', value: search.peer });
    if (search.peerId) filters.push({ id: 'peer_id_unique_key', value: String(search.peerId) });
    if (search.proberCountry) filters.push({ id: 'meta_client_geo_country', value: search.proberCountry });
    if (search.peerCountry) filters.push({ id: 'meta_peer_geo_country', value: search.peerCountry });
    return filters;
  }, [search.result, search.prober, search.peer, search.peerId, search.proberCountry, search.peerCountry]);

  // Handle live mode toggle
  const handleLiveModeToggle = useCallback((): void => {
    navigate({
      resetScroll: false,
      search: prev => ({
        ...prev,
        isLive: !prev.isLive,
        // Reset pagination when toggling live mode
        page: 1,
        pageToken: undefined,
      }),
    });
  }, [navigate]);

  // Handle filter panel changes
  const handleFiltersChange = useCallback(
    (filters: FilterValues): void => {
      navigate({
        resetScroll: false,
        search: prev => ({
          ...prev,
          page: 1,
          pageToken: undefined,
          result: filters.result,
          prober: filters.prober,
          peer: filters.peer,
          peerId: filters.peerId,
          nodeId: filters.nodeId,
          proberCountry: filters.proberCountry,
          peerCountry: filters.peerCountry,
          proberCity: filters.proberCity,
          peerCity: filters.peerCity,
          proberVersion: filters.proberVersion,
          peerVersion: filters.peerVersion,
          proberAsn: filters.proberAsn,
          peerAsn: filters.peerAsn,
          slot: filters.slot,
          column: filters.column,
          blobPosters: filters.blobPosters,
        }),
      });
    },
    [navigate]
  );

  // Handle clear all filters
  const handleClearFilters = useCallback((): void => {
    navigate({
      resetScroll: false,
      search: prev => ({
        ...prev,
        page: 1,
        pageToken: undefined,
        result: undefined,
        prober: undefined,
        peer: undefined,
        peerId: undefined,
        nodeId: undefined,
        proberCountry: undefined,
        peerCountry: undefined,
        proberCity: undefined,
        peerCity: undefined,
        proberVersion: undefined,
        peerVersion: undefined,
        proberAsn: undefined,
        peerAsn: undefined,
        slot: undefined,
        column: undefined,
        blobPosters: undefined,
      }),
    });
  }, [navigate]);

  // Handle opening probe details - updates URL
  // Note: probePeerId is wrapped in quotes so TanStack Router preserves it as a string (not a number that loses Int64 precision)
  const handleProbeSelect = useCallback(
    (probe: IntCustodyProbe | null): void => {
      if (probe) {
        navigate({
          resetScroll: false,
          search: prev => ({
            ...prev,
            probeTime: probe.probe_date_time,
            probePeerId: probe.peer_id_unique_key !== undefined ? `"${probe.peer_id_unique_key}"` : undefined,
          }),
        });
      } else {
        navigate({
          resetScroll: false,
          search: prev => ({
            ...prev,
            probeTime: undefined,
            probePeerId: undefined,
          }),
        });
      }
    },
    [navigate]
  );

  // Find selected probe from URL params
  // First check current page data, then fall back to deep-linked query result
  const selectedProbe = useMemo(() => {
    if (!search.probeTime || !normalizedProbePeerId) return null;

    // Return probe from current page if found
    if (probeInCurrentData) return probeInCurrentData;

    // Fall back to deep-linked probes
    const deepLinkedProbes = deepLinkedProbeData?.int_custody_probe ?? [];
    return deepLinkedProbes.find(probe => String(probe.peer_id_unique_key) === normalizedProbePeerId) ?? null;
  }, [search.probeTime, normalizedProbePeerId, probeInCurrentData, deepLinkedProbeData]);

  return (
    <ProbesView
      data={data}
      isLoading={isLoading && !isLive}
      error={isLive ? liveError : (error as Error | null)}
      pagination={{
        pageIndex: (search.page ?? 1) - 1,
        pageSize: search.pageSize ?? 25,
        onPaginationChange: handlePaginationChange,
      }}
      sorting={currentSorting}
      onSortingChange={handleSortingChange}
      columnFilters={currentFilters}
      onColumnFiltersChange={handleColumnFiltersChange}
      onFilterClick={handleFilterClick}
      hasNextPage={!!nextPageToken}
      filters={currentFilterValues}
      onFiltersChange={handleFiltersChange}
      onClearFilters={handleClearFilters}
      selectedProbe={selectedProbe}
      onProbeSelect={handleProbeSelect}
      windowLabel={windowLabel}
      // Live mode props
      isLive={isLive}
      onLiveModeToggle={handleLiveModeToggle}
      newItemIdsRef={newItemIdsRef}
      liveHitPageLimitRef={hitPageLimitRef}
    />
  );
}
