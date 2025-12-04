import { type JSX, useMemo, useCallback, useRef } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useNetwork } from '@/hooks/useNetwork';
import { intCustodyProbeServiceListOptions } from '@/api/@tanstack/react-query.gen';
import { useFuluActivation } from '@/pages/ethereum/data-availability/custody/hooks/useFuluActivation';
import type { ProbesSearch } from './IndexPage.types';
import { ProbesView } from './components/ProbesView';
import type { FilterValues } from './components/FilterPanel';
import type { ColumnFiltersState, SortingState } from '@tanstack/react-table';
import type { IntCustodyProbe } from '@/api/types.gen';

/**
 * Custody Probes page showing individual probe results
 */
export function IndexPage(): JSX.Element {
  const navigate = useNavigate({ from: '/ethereum/data-availability/probes/' });
  const search = useSearch({ from: '/ethereum/data-availability/probes/' }) as ProbesSearch;
  const { currentNetwork } = useNetwork();
  const { fuluActivation } = useFuluActivation();

  // Capture the initial probeTime from URL on mount (for deep-linking)
  // This prevents time range recalculation when user clicks on rows to view details
  const initialProbeTimeRef = useRef<number | undefined>(search.probeTime);

  // Calculate time range in seconds for the probe_date_time filter
  // Use URL params if provided, otherwise default to last 7 days
  // If probeTime was in URL on initial load (deep-linking), ensure the time range includes it
  const timeRange = useMemo(() => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const sevenDaysSeconds = 7 * 24 * 60 * 60;

    if (search.timeStart !== undefined && search.timeEnd !== undefined) {
      return {
        start: search.timeStart,
        end: search.timeEnd,
      };
    }

    // Only use initial probeTime for deep-linking (not when user clicks rows)
    const initialProbeTime = initialProbeTimeRef.current;
    if (initialProbeTime !== undefined) {
      // Extend range to include the probe time with a 1-day buffer on each side
      const oneDaySeconds = 24 * 60 * 60;
      const rangeStart = Math.min(nowSeconds - sevenDaysSeconds, initialProbeTime - oneDaySeconds);
      const rangeEnd = Math.max(nowSeconds, initialProbeTime + oneDaySeconds);
      return {
        start: rangeStart,
        end: rangeEnd,
      };
    }

    // Default: NOW - 7d to NOW for bounded query (helps ClickHouse early cutoff with ORDER BY)
    return {
      start: nowSeconds - sevenDaysSeconds,
      end: nowSeconds,
    };
  }, [search.timeStart, search.timeEnd]);

  // Build order_by string for API
  const orderBy = useMemo(() => {
    // Default to probe_date_time desc if no sort specified
    const field = search.sortBy ?? 'probe_date_time';
    const order = search.sortOrder ?? 'desc';
    return `${field} ${order}`;
  }, [search.sortBy, search.sortOrder]);

  // Fetch data from the API with server-side filtering and sorting
  const {
    data: apiData,
    isLoading,
    error,
  } = useQuery({
    ...intCustodyProbeServiceListOptions({
      query: {
        probe_date_time_gte: timeRange.start,
        probe_date_time_lte: timeRange.end,
        page_size: search.pageSize ?? 25,
        page_token: search.pageToken,
        order_by: orderBy,
        // Filter out pre-Fulu slots server-side (PeerDAS only exists after Fulu)
        ...(fuluActivation && { slot_gte: fuluActivation.slot }),
        // Server-side filters
        ...(search.result && { result_eq: search.result }),
        ...(search.prober && { meta_client_implementation_eq: search.prober }),
        ...(search.peer && { meta_peer_implementation_eq: search.peer }),
        ...(search.peerId && { peer_id_unique_key_eq: Number(search.peerId) }),
        ...(search.nodeId && { node_id_eq: search.nodeId }),
        ...(search.proberCountry && { meta_client_geo_country_eq: search.proberCountry }),
        ...(search.peerCountry && { meta_peer_geo_country_eq: search.peerCountry }),
        ...(search.proberCity && { meta_client_geo_city_eq: search.proberCity }),
        ...(search.peerCity && { meta_peer_geo_city_eq: search.peerCity }),
        ...(search.proberVersion && { meta_client_version_eq: search.proberVersion }),
        ...(search.peerVersion && { meta_peer_version_eq: search.peerVersion }),
        ...(search.proberAsn && { meta_client_geo_autonomous_system_number_eq: search.proberAsn }),
        ...(search.peerAsn && { meta_peer_geo_autonomous_system_number_eq: search.peerAsn }),
        ...(search.slot && { slot_eq: search.slot }),
        ...(search.column && { column_indices_has: search.column }),
        ...(search.blobPosters?.length && { blob_submitters_has_any_values: search.blobPosters }),
      },
    }),
    enabled: !!currentNetwork && !!fuluActivation,
  });

  // Use API data directly
  const data = useMemo(() => {
    return apiData?.int_custody_probe ?? [];
  }, [apiData]);

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
  // Note: We can't use peer_id_unique_key_eq because Int64 values lose precision in JavaScript.
  // Instead, query by timestamp and filter client-side by comparing the (equally corrupted) string values.
  const { data: deepLinkedProbeData } = useQuery({
    ...intCustodyProbeServiceListOptions({
      query: {
        probe_date_time_gte: search.probeTime,
        probe_date_time_lte: search.probeTime,
        page_size: 100, // Fetch enough to find the matching probe
        // Filter out pre-Fulu slots server-side (PeerDAS only exists after Fulu)
        ...(fuluActivation && { slot_gte: fuluActivation.slot }),
      },
    }),
    // Only fetch if probe is not already in current page data
    enabled: !!currentNetwork && !!fuluActivation && !!search.probeTime && !!search.probePeerId && !probeInCurrentData,
  });

  // Store the next page token for pagination
  const nextPageToken = apiData?.next_page_token;

  // Handle pagination change
  const handlePaginationChange = useCallback(
    (pageIndex: number, pageSize: number): void => {
      const currentPageIndex = (search.page ?? 1) - 1;
      const isGoingForward = pageIndex > currentPageIndex;
      const isChangingPageSize = pageSize !== (search.pageSize ?? 25);

      navigate({
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
      if (sorting.length === 0) {
        // Reset to default sort
        navigate({
          search: prev => ({
            ...prev,
            sortBy: undefined,
            sortOrder: undefined,
            pageToken: undefined, // Reset pagination when sorting changes
          }),
        });
      } else {
        const { id, desc } = sorting[0];
        navigate({
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

  // Build current filter values from URL for FilterPanel
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

  // Handle filter panel changes
  const handleFiltersChange = useCallback(
    (filters: FilterValues): void => {
      navigate({
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
          search: prev => ({
            ...prev,
            probeTime: probe.probe_date_time,
            probePeerId: probe.peer_id_unique_key !== undefined ? `"${probe.peer_id_unique_key}"` : undefined,
          }),
        });
      } else {
        navigate({
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

    // Fall back to deep-linked probes (compare peer_id as strings due to Int64 precision issues)
    const deepLinkedProbes = deepLinkedProbeData?.int_custody_probe ?? [];
    return deepLinkedProbes.find(probe => String(probe.peer_id_unique_key) === normalizedProbePeerId) ?? null;
  }, [search.probeTime, normalizedProbePeerId, probeInCurrentData, deepLinkedProbeData]);

  return (
    <ProbesView
      data={data}
      isLoading={isLoading}
      error={error as Error | null}
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
      hasNextPage={!!apiData?.next_page_token}
      filters={currentFilterValues}
      onFiltersChange={handleFiltersChange}
      onClearFilters={handleClearFilters}
      selectedProbe={selectedProbe}
      onProbeSelect={handleProbeSelect}
    />
  );
}
