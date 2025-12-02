import { type JSX, useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearch, useNavigate } from '@tanstack/react-router';
import { Container } from '@/components/Layout/Container';
import { DataAvailabilityHeatmap } from '@/pages/ethereum/data-availability/components/DataAvailabilityHeatmap';
import { DataAvailabilityLegend } from '@/pages/ethereum/data-availability/components/DataAvailabilityHeatmap/DataAvailabilityLegend';
import { DataAvailabilitySkeleton } from '@/pages/ethereum/data-availability/components/DataAvailabilitySkeleton';
import { ViewModeToggle } from '@/pages/ethereum/data-availability/components/ViewModeToggle';
import { TimezoneToggle } from '@/components/Elements/TimezoneToggle';
import { LiveProbeEvents } from './components/LiveProbeEvents';
import type { ProbeFilterContext } from './components/LiveProbeEvents';
import type {
  DataAvailabilityGranularity,
  ViewMode,
} from '@/pages/ethereum/data-availability/components/DataAvailabilityHeatmap';
import type { DataAvailabilityFilters } from '@/pages/ethereum/data-availability/components/DataAvailabilityHeatmap/DataAvailabilityFilterPanel.types';
import { useTimezone } from '@/hooks/useTimezone';
import { useNetwork } from '@/hooks/useNetwork';
import { formatEpoch } from '@/utils';
import {
  fctDataColumnAvailabilityDailyServiceListOptions,
  fctDataColumnAvailabilityHourlyServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import {
  fctDataColumnAvailabilityByEpochServiceList,
  fctDataColumnAvailabilityBySlotServiceList,
  fctDataColumnAvailabilityBySlotBlobServiceList,
} from '@/api/sdk.gen';
import type {
  FctDataColumnAvailabilityByEpoch,
  FctDataColumnAvailabilityBySlot,
  FctDataColumnAvailabilityBySlotBlob,
} from '@/api/types.gen';
import {
  transformDailyToRows,
  transformHourlyToRows,
  transformEpochsToRows,
  transformSlotsToRows,
  transformBlobsToRows,
} from '@/pages/ethereum/data-availability/utils/data-availability-transform';
import { fetchAllPages } from '@/utils/api-pagination';
import type { CustodySearch } from './IndexPage.types';
import { validateSearchParamHierarchy, getDefaultThreshold } from './IndexPage.types';
import { useForkBasedInitialView } from './hooks/useForkBasedInitialView';

/**
 * Drill-down level state - each level maintains parent context for breadcrumbs
 */
type DrillDownLevel =
  | { type: 'window' }
  | { type: 'day'; date: string }
  | { type: 'hour'; date: string; hourStartDateTime: number }
  | { type: 'epoch'; date: string; hourStartDateTime: number; epochStartDateTime: number; epoch: number }
  | { type: 'slot'; date: string; hourStartDateTime: number; epochStartDateTime: number; epoch: number; slot: number };

/**
 * Total number of columns in PeerDAS
 */
const TOTAL_COLUMNS = 128;

/**
 * Number of days to show in the window view
 */
const WINDOW_DAYS = 19;

/**
 * Number of hours in a day
 */
const HOURS_PER_DAY = 24;

/**
 * Number of seconds in a day
 */
const SECONDS_PER_DAY = 86400;

/**
 * Number of seconds in an hour
 */
const SECONDS_PER_HOUR = 3600;

/**
 * Number of slots per epoch
 */
const SLOTS_PER_EPOCH = 32;

/**
 * Derives the current drill-down level from URL search parameters
 * Validates hierarchical consistency and falls back to window view on error
 */
function deriveCurrentLevel(search: CustodySearch): DrillDownLevel {
  // Validate hierarchical consistency
  const validationError = validateSearchParamHierarchy(search);
  if (validationError) {
    console.warn('Invalid search params:', validationError, 'Falling back to window view');
    return { type: 'window' };
  }

  // Derive level from deepest available param
  if (
    search.slot !== undefined &&
    search.epoch !== undefined &&
    search.hour !== undefined &&
    search.date !== undefined
  ) {
    return {
      type: 'slot',
      date: search.date,
      hourStartDateTime: search.hour,
      epochStartDateTime: search.hour, // We'll fetch actual epoch start from data
      epoch: search.epoch,
      slot: search.slot,
    };
  }

  if (search.epoch !== undefined && search.hour !== undefined && search.date !== undefined) {
    return {
      type: 'epoch',
      date: search.date,
      hourStartDateTime: search.hour,
      epochStartDateTime: search.hour, // We'll fetch actual epoch start from data
      epoch: search.epoch,
    };
  }

  if (search.hour !== undefined && search.date !== undefined) {
    return {
      type: 'hour',
      date: search.date,
      hourStartDateTime: search.hour,
    };
  }

  if (search.date !== undefined) {
    return {
      type: 'day',
      date: search.date,
    };
  }

  return { type: 'window' };
}

/**
 * Custody page showing PeerDAS data availability across drill-down levels
 */
export function IndexPage(): JSX.Element {
  // URL-based state management
  const navigate = useNavigate({ from: '/ethereum/data-availability/custody/' });
  const search = useSearch({ from: '/ethereum/data-availability/custody/' });

  // Timezone preference
  const { timezone } = useTimezone();

  // Network for default threshold
  const { currentNetwork } = useNetwork();

  // Derive drill-down state from URL
  const currentLevel = deriveCurrentLevel(search);

  // Smart initial view based on fork timing
  const { searchParams: forkBasedParams, isLoading: forkViewLoading } = useForkBasedInitialView();

  // Track if we've performed the initial navigation
  const [hasPerformedInitialNav, setHasPerformedInitialNav] = useState(false);

  // Auto-navigate to fork-based view on initial load (no URL params)
  useEffect(() => {
    // Skip if:
    // - Already performed initial nav
    // - URL already has params (user navigated directly)
    // - Still loading fork data
    // - No fork-based params (window view or non-Fulu network)
    const hasExistingParams =
      search.date !== undefined || search.hour !== undefined || search.epoch !== undefined || search.slot !== undefined;

    if (hasPerformedInitialNav || hasExistingParams || forkViewLoading || !forkBasedParams) {
      return;
    }

    // Navigate to the recommended view
    setHasPerformedInitialNav(true);
    navigate({
      search: forkBasedParams,
      replace: true, // Don't add to history since this is auto-navigation
    });
  }, [hasPerformedInitialNav, search, forkViewLoading, forkBasedParams, navigate]);

  // View mode from URL (default to 'threshold' since it's more robust)
  const viewMode: ViewMode = search.mode ?? 'threshold';

  // Threshold from URL or network default
  const defaultThreshold = getDefaultThreshold(currentNetwork?.name);
  const threshold = search.threshold ?? defaultThreshold;

  // Default filter state (all columns, no filtering)
  const filters: DataAvailabilityFilters = useMemo(
    () => ({
      columnGroups: new Set([0, 1, 2, 3]),
      minAvailability: 0,
      maxAvailability: 100,
      minObservationCount: 0,
    }),
    []
  );

  // Window Level: Last 19 days of daily aggregated data
  const windowQuery = useQuery({
    ...fctDataColumnAvailabilityDailyServiceListOptions({
      query: {
        // Get last WINDOW_DAYS days - generate list of dates
        date_in_values: Array.from({ length: WINDOW_DAYS }, (_, i) => {
          const date = new Date(Date.now() - i * HOURS_PER_DAY * 60 * 60 * 1000);
          return date.toISOString().split('T')[0];
        }).join(','),
        page_size: WINDOW_DAYS * TOTAL_COLUMNS,
        order_by: 'date desc',
      },
    }),
    enabled: currentLevel.type === 'window',
  });

  // Day Level: 24 hours for a specific day
  const dayQuery = useQuery({
    ...fctDataColumnAvailabilityHourlyServiceListOptions({
      query: {
        // Filter by date - need to use the date from currentLevel
        ...(currentLevel.type === 'day' && {
          // Convert date string to Unix timestamp range (start of day to end of day)
          hour_start_date_time_gte: Math.floor(new Date(currentLevel.date).getTime() / 1000),
          hour_start_date_time_lt: Math.floor(new Date(currentLevel.date).getTime() / 1000) + SECONDS_PER_DAY,
          page_size: HOURS_PER_DAY * TOTAL_COLUMNS,
          order_by: 'hour_start_date_time asc',
        }),
      },
    }),
    enabled: currentLevel.type === 'day',
  });

  // Hour Level: Epochs within a specific hour (with pagination for large datasets)
  const hourQuery = useQuery({
    queryKey: [
      'hourData',
      currentLevel.type === 'hour' || currentLevel.type === 'epoch' || currentLevel.type === 'slot'
        ? currentLevel.hourStartDateTime
        : null,
    ],
    queryFn: async ({ signal }) => {
      if (currentLevel.type !== 'hour' && currentLevel.type !== 'epoch' && currentLevel.type !== 'slot') {
        return { fct_data_column_availability_by_epoch: [] };
      }

      const data = await fetchAllPages<FctDataColumnAvailabilityByEpoch>(
        fctDataColumnAvailabilityByEpochServiceList,
        {
          query: {
            epoch_start_date_time_gte: currentLevel.hourStartDateTime,
            epoch_start_date_time_lt: currentLevel.hourStartDateTime + SECONDS_PER_HOUR,
            page_size: 10000,
            order_by: 'epoch asc',
          },
        },
        'fct_data_column_availability_by_epoch',
        signal
      );

      return { fct_data_column_availability_by_epoch: data };
    },
    enabled: currentLevel.type === 'hour' || currentLevel.type === 'epoch' || currentLevel.type === 'slot',
  });

  // Epoch Level: Slots within a specific epoch (with pagination for safety)
  const epochQuery = useQuery({
    queryKey: ['epochData', currentLevel.type === 'epoch' ? currentLevel.epoch : null],
    queryFn: async ({ signal }) => {
      if (currentLevel.type !== 'epoch') return { fct_data_column_availability_by_slot: [] };

      // Calculate slot range for this epoch
      const firstSlot = currentLevel.epoch * SLOTS_PER_EPOCH;
      const lastSlot = (currentLevel.epoch + 1) * SLOTS_PER_EPOCH;

      const data = await fetchAllPages<FctDataColumnAvailabilityBySlot>(
        fctDataColumnAvailabilityBySlotServiceList,
        {
          query: {
            slot_gte: firstSlot,
            slot_lt: lastSlot,
            page_size: 10000,
            order_by: 'slot asc',
          },
        },
        'fct_data_column_availability_by_slot',
        signal
      );

      return { fct_data_column_availability_by_slot: data };
    },
    enabled: currentLevel.type === 'epoch',
  });

  // Slot Level: Blobs within a specific slot (with pagination for safety)
  const slotQuery = useQuery({
    queryKey: ['slotData', currentLevel.type === 'slot' ? currentLevel.slot : null],
    queryFn: async ({ signal }) => {
      if (currentLevel.type !== 'slot') return { fct_data_column_availability_by_slot_blob: [] };

      const data = await fetchAllPages<FctDataColumnAvailabilityBySlotBlob>(
        fctDataColumnAvailabilityBySlotBlobServiceList,
        {
          query: {
            slot_eq: currentLevel.slot,
            page_size: 10000,
            order_by: 'blob_index asc',
          },
        },
        'fct_data_column_availability_by_slot_blob',
        signal
      );

      return { fct_data_column_availability_by_slot_blob: data };
    },
    enabled: currentLevel.type === 'slot',
  });

  /**
   * Transform Window data (daily) to heatmap rows
   */
  const windowRows = useMemo(
    () => transformDailyToRows(windowQuery.data?.fct_data_column_availability_daily, timezone),
    [windowQuery.data, timezone]
  );

  /**
   * Transform Day data (hourly) to heatmap rows
   */
  const dayRows = useMemo(
    () =>
      currentLevel.type === 'day'
        ? transformHourlyToRows(dayQuery.data?.fct_data_column_availability_hourly, timezone)
        : [],
    [dayQuery.data, currentLevel.type, timezone]
  );

  /**
   * Transform Hour data (epochs) to heatmap rows
   */
  const hourRows = useMemo(
    () => transformEpochsToRows(hourQuery.data?.fct_data_column_availability_by_epoch),
    [hourQuery.data]
  );

  /**
   * Transform Epoch data (slots) to heatmap rows
   */
  const epochRows = useMemo(
    () => transformSlotsToRows(epochQuery.data?.fct_data_column_availability_by_slot),
    [epochQuery.data]
  );

  /**
   * Transform Slot data (blobs) to heatmap rows
   */
  const slotRows = useMemo(
    () => transformBlobsToRows(slotQuery.data?.fct_data_column_availability_by_slot_blob),
    [slotQuery.data]
  );

  // Determine current data based on level
  const { rows, granularity, isLoading, error } = useMemo(() => {
    switch (currentLevel.type) {
      case 'window':
        return {
          rows: windowRows,
          granularity: 'window' as DataAvailabilityGranularity,
          isLoading: windowQuery.isLoading,
          error: windowQuery.error,
        };
      case 'day':
        return {
          rows: dayRows,
          granularity: 'day' as DataAvailabilityGranularity,
          isLoading: dayQuery.isLoading,
          error: dayQuery.error,
        };
      case 'hour':
        return {
          rows: hourRows,
          granularity: 'hour' as DataAvailabilityGranularity,
          isLoading: hourQuery.isLoading,
          error: hourQuery.error,
        };
      case 'epoch':
        return {
          rows: epochRows,
          granularity: 'epoch' as DataAvailabilityGranularity,
          isLoading: epochQuery.isLoading,
          error: epochQuery.error,
        };
      case 'slot':
        return {
          rows: slotRows,
          granularity: 'slot' as DataAvailabilityGranularity,
          isLoading: slotQuery.isLoading,
          error: slotQuery.error,
        };
    }
  }, [
    currentLevel,
    windowRows,
    dayRows,
    hourRows,
    epochRows,
    slotRows,
    windowQuery,
    dayQuery,
    hourQuery,
    epochQuery,
    slotQuery,
  ]);

  /**
   * Handle row click to drill down to next level
   * Updates URL search params to navigate to deeper level
   */
  const handleRowClick = (identifier: string): void => {
    switch (currentLevel.type) {
      case 'window':
        // Drill to day level
        navigate({
          search: prev => ({ ...prev, date: identifier }),
        });
        break;
      case 'day':
        // Drill to hour level
        navigate({
          search: prev => ({ ...prev, date: currentLevel.date, hour: Number(identifier) }),
        });
        break;
      case 'hour': {
        // Drill to epoch level
        const epochData = hourQuery.data?.fct_data_column_availability_by_epoch?.find(
          (d: FctDataColumnAvailabilityByEpoch) => String(d.epoch) === identifier
        );
        if (epochData?.epoch !== undefined) {
          navigate({
            search: prev => ({
              ...prev,
              date: currentLevel.date,
              hour: currentLevel.hourStartDateTime,
              epoch: epochData.epoch,
            }),
          });
        }
        break;
      }
      case 'epoch':
        // Drill to slot level
        navigate({
          search: prev => ({
            ...prev,
            date: currentLevel.date,
            hour: currentLevel.hourStartDateTime,
            epoch: currentLevel.epoch,
            slot: Number(identifier),
          }),
        });
        break;
      case 'slot':
        // Already at deepest level
        break;
    }
  };

  /**
   * Handle view mode change
   * Updates URL search params to switch between percentage and threshold modes
   */
  const handleViewModeChange = (mode: ViewMode): void => {
    navigate({
      search: prev => ({
        ...prev,
        mode,
      }),
    });
  };

  /**
   * Build breadcrumb path - shows full drill-down hierarchy
   */
  const breadcrumbs = useMemo(() => {
    const crumbs: Array<{ label: string; onClick: () => void }> = [
      {
        label: `Window (${WINDOW_DAYS} days)`,
        onClick: () => {
          navigate({
            search: {},
            replace: true,
          });
        },
      },
    ];

    if (currentLevel.type === 'window') return crumbs;

    // Add day breadcrumb if we're at day level or deeper
    if (
      currentLevel.type === 'day' ||
      currentLevel.type === 'hour' ||
      currentLevel.type === 'epoch' ||
      currentLevel.type === 'slot'
    ) {
      crumbs.push({
        label: `Day: ${new Date(currentLevel.date).toLocaleDateString('en-US', timezone === 'UTC' ? { timeZone: 'UTC' } : {})}`,
        onClick: () =>
          navigate({
            search: { date: currentLevel.date },
            replace: true,
          }),
      });
    }

    // Add hour breadcrumb if we're at hour level or deeper
    if (currentLevel.type === 'hour' || currentLevel.type === 'epoch' || currentLevel.type === 'slot') {
      crumbs.push({
        label: `Hour: ${new Date(currentLevel.hourStartDateTime * 1000).toLocaleTimeString('en-US', timezone === 'UTC' ? { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' } : { hour: '2-digit', minute: '2-digit', hour12: false })}`,
        onClick: () =>
          navigate({
            search: { date: currentLevel.date, hour: currentLevel.hourStartDateTime },
            replace: true,
          }),
      });
    }

    // Add epoch breadcrumb if we're at epoch level or deeper
    if (currentLevel.type === 'epoch' || currentLevel.type === 'slot') {
      crumbs.push({
        label: `Epoch: ${formatEpoch(currentLevel.epoch)}`,
        onClick: () =>
          navigate({
            search: {
              date: currentLevel.date,
              hour: currentLevel.hourStartDateTime,
              epoch: currentLevel.epoch,
            },
            replace: true,
          }),
      });
    }

    // Add slot breadcrumb if we're at slot level
    if (currentLevel.type === 'slot') {
      crumbs.push({
        label: `Slot: ${currentLevel.slot}`,
        onClick: () =>
          navigate({
            search: {
              date: currentLevel.date,
              hour: currentLevel.hourStartDateTime,
              epoch: currentLevel.epoch,
              slot: currentLevel.slot,
            },
            replace: true,
          }),
      });
    }

    return crumbs;
  }, [currentLevel, navigate, timezone]);

  // Calculate time range for View Probes link (must be before early returns)
  const probesLinkParams = useMemo(() => {
    let timeStart: number | undefined;
    let timeEnd: number | undefined;

    if (currentLevel.type === 'day') {
      timeStart = Math.floor(new Date(currentLevel.date).getTime() / 1000);
      timeEnd = timeStart + SECONDS_PER_DAY;
    } else if (currentLevel.type === 'hour' || currentLevel.type === 'epoch' || currentLevel.type === 'slot') {
      timeStart = currentLevel.hourStartDateTime;
      timeEnd = timeStart + SECONDS_PER_HOUR;
    }

    const hasTimeFilter = timeStart !== undefined && timeEnd !== undefined;
    const hasSlotFilter = currentLevel.type === 'slot';

    return {
      ...(hasSlotFilter && { slot: currentLevel.slot }),
      ...(hasTimeFilter && !hasSlotFilter && { timeStart, timeEnd }),
    };
  }, [currentLevel]);

  // Convert currentLevel to ProbeFilterContext for LiveProbeEvents
  const probeFilterContext: ProbeFilterContext = useMemo(() => {
    switch (currentLevel.type) {
      case 'window':
        return { type: 'window' };
      case 'day':
        return { type: 'day', date: currentLevel.date };
      case 'hour':
        return {
          type: 'hour',
          date: currentLevel.date,
          hourStartDateTime: currentLevel.hourStartDateTime,
        };
      case 'epoch':
        return {
          type: 'epoch',
          date: currentLevel.date,
          hourStartDateTime: currentLevel.hourStartDateTime,
          epoch: currentLevel.epoch,
        };
      case 'slot':
        return {
          type: 'slot',
          date: currentLevel.date,
          hourStartDateTime: currentLevel.hourStartDateTime,
          epoch: currentLevel.epoch,
          slot: currentLevel.slot,
        };
    }
  }, [currentLevel]);

  if (error) {
    return (
      <Container>
        <div className="rounded-sm border border-danger/20 bg-danger/10 p-4 text-danger">
          Error loading data: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </Container>
    );
  }

  return (
    <Container>
      {/* Top panel: Heatmap controls + Live Probes (50/50 on desktop) */}
      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left: Unified heatmap control panel */}
        <div className="rounded-xs border border-border/50 bg-surface/50 p-3">
          {/* Description */}
          <p className="mb-2.5 text-xs text-muted">
            <span className="font-medium text-foreground">Live custody monitoring for PeerDAS.</span> Verifies peers are
            storing claimed data columns. Powered by{' '}
            <a
              href="https://github.com/ethpandaops/dasmon"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-accent hover:underline"
            >
              dasmon
            </a>
            .
          </p>

          {/* Divider */}
          <div className="mb-2.5 border-t border-border/30" />

          {/* Header row: Breadcrumbs + Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1.5 text-sm/5">
              {breadcrumbs.map((crumb, index) => (
                <div key={index} className="flex items-center gap-1.5">
                  {index > 0 && <span className="text-muted">/</span>}
                  <button
                    type="button"
                    onClick={crumb.onClick}
                    className={
                      index === breadcrumbs.length - 1
                        ? 'font-medium text-foreground'
                        : 'text-accent transition-colors hover:text-accent/80'
                    }
                  >
                    {crumb.label}
                  </button>
                </div>
              ))}
            </nav>

            {/* Controls */}
            <div className="flex items-center gap-2">
              <ViewModeToggle viewMode={viewMode} onViewModeChange={handleViewModeChange} size="compact" />
              <TimezoneToggle size="compact" />
            </div>
          </div>

          {/* Divider */}
          <div className="my-2.5 border-t border-border/30" />

          {/* Legend - inline */}
          <DataAvailabilityLegend granularity={granularity} viewMode={viewMode} threshold={threshold} />
        </div>

        {/* Right: Live Probe Events */}
        <LiveProbeEvents
          context={probeFilterContext}
          maxEvents={5}
          pollInterval={30000}
          probesLinkParams={probesLinkParams}
        />
      </div>

      {/* Loading state - show while determining initial view OR while loading data */}
      {isLoading || (forkViewLoading && !hasPerformedInitialNav && currentLevel.type === 'window') ? (
        <DataAvailabilitySkeleton />
      ) : (
        /* Heatmap view */
        <DataAvailabilityHeatmap
          rows={rows}
          granularity={granularity}
          filters={filters}
          viewMode={viewMode}
          threshold={threshold}
          onRowClick={currentLevel.type !== 'slot' ? handleRowClick : undefined}
          onBack={breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2].onClick : undefined}
          cellSize="2xs"
          showColumnHeader
          showLegend={false}
        />
      )}
    </Container>
  );
}
