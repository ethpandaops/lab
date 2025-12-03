import { type JSX, useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearch, useNavigate, Link } from '@tanstack/react-router';
import { Container } from '@/components/Layout/Container';
import { DataAvailabilityHeatmap } from '@/pages/ethereum/data-availability/components/DataAvailabilityHeatmap';
import { DataAvailabilityLegend } from '@/pages/ethereum/data-availability/components/DataAvailabilityHeatmap/DataAvailabilityLegend';
import { DataAvailabilitySkeleton } from '@/pages/ethereum/data-availability/components/DataAvailabilitySkeleton';
import { ViewModeToggle } from '@/pages/ethereum/data-availability/components/ViewModeToggle';
import { TimezoneToggle } from '@/components/Elements/TimezoneToggle';
import { InfoBox } from '@/components/Feedback/InfoBox';
import { LiveProbeEvents } from './components/LiveProbeEvents';
import type { ProbeFilterContext } from './components/LiveProbeEvents';
import { CellProbeDialog } from './components/CellProbeDialog';
import type { CellContext, TimeRangeContext } from './components/CellProbeDialog';
import type {
  DataAvailabilityGranularity,
  ViewMode,
} from '@/pages/ethereum/data-availability/components/DataAvailabilityHeatmap';
import type { DataAvailabilityFilters } from '@/pages/ethereum/data-availability/components/DataAvailabilityHeatmap/DataAvailabilityFilterPanel.types';
import { useTimezone } from '@/hooks/useTimezone';
import { useNetwork } from '@/hooks/useNetwork';
import { formatEpoch, formatSlot } from '@/utils';
import {
  ChevronRightIcon,
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  Squares2X2Icon,
  CalendarDaysIcon,
  ClockIcon,
  CubeIcon,
  Square2StackIcon,
} from '@heroicons/react/24/outline';
import {
  fctDataColumnAvailabilityDailyServiceListOptions,
  fctDataColumnAvailabilityHourlyServiceListOptions,
  intCustodyProbeOrderBySlotServiceListOptions,
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
 * Get a human-readable title for the current viewing level
 * Main title = where you are, subtitle = what you're viewing
 */
function getLevelTitle(level: DrillDownLevel, timezone: 'UTC' | 'local'): { main: string; sub: string } {
  const tzOptions = timezone === 'UTC' ? { timeZone: 'UTC' } : {};

  switch (level.type) {
    case 'window':
      return { main: 'Custody Window', sub: `Viewing last ${WINDOW_DAYS} days by day` };
    case 'day': {
      const dateStr = new Date(level.date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        ...tzOptions,
      });
      return { main: dateStr, sub: 'Viewing hours in this day' };
    }
    case 'hour': {
      const dateStr = new Date(level.date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        ...tzOptions,
      });
      const timeStr = new Date(level.hourStartDateTime * 1000).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        ...tzOptions,
      });
      return { main: `${dateStr} at ${timeStr}`, sub: 'Viewing epochs in this hour' };
    }
    case 'epoch':
      return { main: `Epoch ${formatEpoch(level.epoch)}`, sub: 'Viewing slots in this epoch' };
    case 'slot':
      return { main: `Slot ${formatSlot(level.slot)}`, sub: 'Viewing blobs in this slot' };
  }
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

  // View mode from URL (default to 'percentage')
  const viewMode: ViewMode = search.mode ?? 'percentage';

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

  // Cell probe dialog state
  const [cellDialogOpen, setCellDialogOpen] = useState(false);
  const [cellContext, setCellContext] = useState<CellContext | null>(null);
  const [timeRangeContext, setTimeRangeContext] = useState<TimeRangeContext | null>(null);

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

  // Fetch blob submitters for the slot (array index = blob index)
  const blobSubmittersQuery = useQuery({
    ...intCustodyProbeOrderBySlotServiceListOptions({
      query: {
        slot_eq: currentLevel.type === 'slot' ? currentLevel.slot : undefined,
        page_size: 1,
      },
    }),
    enabled: currentLevel.type === 'slot',
  });
  const blobSubmitters = useMemo(
    () => blobSubmittersQuery.data?.int_custody_probe_order_by_slot?.[0]?.blob_submitters ?? [],
    [blobSubmittersQuery.data]
  );

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
    () => transformBlobsToRows(slotQuery.data?.fct_data_column_availability_by_slot_blob, blobSubmitters),
    [slotQuery.data, blobSubmitters]
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
   * Handle cell click to show probe details for a specific row/column
   * Opens a dialog with probes filtered by the time range and column
   */
  const handleCellClick = useCallback(
    (rowIdentifier: string, columnIndex: number): void => {
      // Find the row to get its label
      const row = rows.find(r => r.identifier === rowIdentifier);
      const rowLabel = row?.label ?? rowIdentifier;

      // Build parent context from currentLevel for full hierarchy display
      const parentContext: CellContext['parentContext'] = {};
      if (currentLevel.type !== 'window') {
        parentContext.date = currentLevel.date;
      }
      if (currentLevel.type !== 'window' && currentLevel.type !== 'day') {
        parentContext.hourStartDateTime = currentLevel.hourStartDateTime;
      }
      if (currentLevel.type === 'epoch' || currentLevel.type === 'slot') {
        parentContext.epoch = currentLevel.epoch;
      }
      if (currentLevel.type === 'slot') {
        parentContext.slot = currentLevel.slot;
      }

      // Build cell context
      const cellCtx: CellContext = {
        rowIdentifier,
        columnIndex,
        granularity,
        rowLabel,
        parentContext,
      };

      // Build time range context based on granularity
      let timeRange: TimeRangeContext = {};

      switch (currentLevel.type) {
        case 'window': {
          // Row is a date - filter by that day
          const dayStart = Math.floor(new Date(rowIdentifier).getTime() / 1000);
          timeRange = {
            timeStart: dayStart,
            timeEnd: dayStart + SECONDS_PER_DAY,
          };
          break;
        }
        case 'day': {
          // Row is hour start timestamp - filter by that hour
          const hourStart = Number(rowIdentifier);
          timeRange = {
            timeStart: hourStart,
            timeEnd: hourStart + SECONDS_PER_HOUR,
          };
          break;
        }
        case 'hour': {
          // Row is epoch number - filter by slots in that epoch
          const epoch = Number(rowIdentifier);
          const epochStartSlot = epoch * SLOTS_PER_EPOCH;
          const slots = Array.from({ length: SLOTS_PER_EPOCH }, (_, i) => epochStartSlot + i);
          // Use the hour's time range but filter by specific slots
          timeRange = {
            timeStart: currentLevel.hourStartDateTime,
            timeEnd: currentLevel.hourStartDateTime + SECONDS_PER_HOUR,
            slots,
          };
          break;
        }
        case 'epoch': {
          // Row is slot number - filter by that specific slot
          const slot = Number(rowIdentifier);
          timeRange = {
            slot,
            timeStart: currentLevel.hourStartDateTime,
            timeEnd: currentLevel.hourStartDateTime + SECONDS_PER_HOUR,
          };
          break;
        }
        case 'slot': {
          // Row is blob index - use the slot from currentLevel
          timeRange = {
            slot: currentLevel.slot,
            timeStart: currentLevel.hourStartDateTime,
            timeEnd: currentLevel.hourStartDateTime + SECONDS_PER_HOUR,
          };
          break;
        }
      }

      setCellContext(cellCtx);
      setTimeRangeContext(timeRange);
      setCellDialogOpen(true);
    },
    [rows, granularity, currentLevel]
  );

  /**
   * Handle cell dialog close
   */
  const handleCellDialogClose = useCallback(() => {
    setCellDialogOpen(false);
  }, []);

  /**
   * Handle column click to show probe details for an entire column (all rows)
   * Opens the same dialog but with column-only context (no row filtering)
   */
  const handleColumnClick = useCallback(
    (columnIndex: number): void => {
      // Build context label based on current drill-down level
      let contextLabel: string;
      switch (currentLevel.type) {
        case 'window':
          contextLabel = `Last ${WINDOW_DAYS} Days`;
          break;
        case 'day': {
          const dateStr = new Date(currentLevel.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            ...(timezone === 'UTC' ? { timeZone: 'UTC' } : {}),
          });
          contextLabel = dateStr;
          break;
        }
        case 'hour': {
          const dateStr = new Date(currentLevel.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            ...(timezone === 'UTC' ? { timeZone: 'UTC' } : {}),
          });
          const timeStr = new Date(currentLevel.hourStartDateTime * 1000).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            ...(timezone === 'UTC' ? { timeZone: 'UTC' } : {}),
          });
          contextLabel = `${dateStr} at ${timeStr}`;
          break;
        }
        case 'epoch':
          contextLabel = `Epoch ${formatEpoch(currentLevel.epoch)}`;
          break;
        case 'slot':
          contextLabel = `Slot ${formatSlot(currentLevel.slot)}`;
          break;
      }

      // Build cell context for column-only view
      const cellCtx: CellContext = {
        columnIndex,
        granularity,
        isColumnOnly: true,
        contextLabel,
      };

      // Build time range context based on current view level (full range)
      let timeRange: TimeRangeContext = {};
      const now = Math.floor(Date.now() / 1000);

      switch (currentLevel.type) {
        case 'window': {
          // Full 19-day window
          timeRange = {
            timeStart: now - WINDOW_DAYS * SECONDS_PER_DAY,
            timeEnd: now,
          };
          break;
        }
        case 'day': {
          // Full day
          const dayStart = Math.floor(new Date(currentLevel.date).getTime() / 1000);
          timeRange = {
            timeStart: dayStart,
            timeEnd: dayStart + SECONDS_PER_DAY,
          };
          break;
        }
        case 'hour': {
          // Full hour
          timeRange = {
            timeStart: currentLevel.hourStartDateTime,
            timeEnd: currentLevel.hourStartDateTime + SECONDS_PER_HOUR,
          };
          break;
        }
        case 'epoch': {
          // All slots in the epoch
          const epochStartSlot = currentLevel.epoch * SLOTS_PER_EPOCH;
          const slots = Array.from({ length: SLOTS_PER_EPOCH }, (_, i) => epochStartSlot + i);
          timeRange = {
            timeStart: currentLevel.hourStartDateTime,
            timeEnd: currentLevel.hourStartDateTime + SECONDS_PER_HOUR,
            slots,
          };
          break;
        }
        case 'slot': {
          // Just the slot
          timeRange = {
            slot: currentLevel.slot,
            timeStart: currentLevel.hourStartDateTime,
            timeEnd: currentLevel.hourStartDateTime + SECONDS_PER_HOUR,
          };
          break;
        }
      }

      setCellContext(cellCtx);
      setTimeRangeContext(timeRange);
      setCellDialogOpen(true);
    },
    [granularity, currentLevel, timezone]
  );

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
   * Preserves mode and threshold settings across navigation
   */
  const breadcrumbs = useMemo(() => {
    // Settings to preserve across navigation
    const preservedSettings = {
      ...(search.mode && { mode: search.mode }),
      ...(search.threshold && { threshold: search.threshold }),
    };

    const crumbs: Array<{
      label: string;
      onClick: () => void;
      icon: React.ComponentType<{ className?: string }>;
    }> = [
      {
        label: `Window`,
        icon: Squares2X2Icon,
        onClick: () => {
          navigate({
            search: { ...preservedSettings },
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
        label: new Date(currentLevel.date).toLocaleDateString(
          'en-US',
          timezone === 'UTC' ? { month: 'short', day: 'numeric', timeZone: 'UTC' } : { month: 'short', day: 'numeric' }
        ),
        icon: CalendarDaysIcon,
        onClick: () =>
          navigate({
            search: { ...preservedSettings, date: currentLevel.date },
            replace: true,
          }),
      });
    }

    // Add hour breadcrumb if we're at hour level or deeper
    if (currentLevel.type === 'hour' || currentLevel.type === 'epoch' || currentLevel.type === 'slot') {
      crumbs.push({
        label: new Date(currentLevel.hourStartDateTime * 1000).toLocaleTimeString(
          'en-US',
          timezone === 'UTC'
            ? { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }
            : { hour: '2-digit', minute: '2-digit', hour12: false }
        ),
        icon: ClockIcon,
        onClick: () =>
          navigate({
            search: { ...preservedSettings, date: currentLevel.date, hour: currentLevel.hourStartDateTime },
            replace: true,
          }),
      });
    }

    // Add epoch breadcrumb if we're at epoch level or deeper
    if (currentLevel.type === 'epoch' || currentLevel.type === 'slot') {
      crumbs.push({
        label: formatEpoch(currentLevel.epoch),
        icon: CubeIcon,
        onClick: () =>
          navigate({
            search: {
              ...preservedSettings,
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
        label: formatSlot(currentLevel.slot),
        icon: Square2StackIcon,
        onClick: () =>
          navigate({
            search: {
              ...preservedSettings,
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
  }, [currentLevel, navigate, timezone, search.mode, search.threshold]);

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
      {/* Page Header */}
      <InfoBox className="mb-6">
        <p>
          <span className="font-medium text-foreground">
            PeerDAS transforms Ethereum&apos;s data availability layer.
          </span>{' '}
          Instead of every node storing every blob, data is erasure coded with 2x redundancy and split into 128 columns.
          Each node commits to storing a subset based on its identity and validator balance. 64 distinct columns are
          required to reconstruct the full blob matrix, enabling dramatic scalability improvements.
        </p>
        <p>
          This dashboard answers a critical question:{' '}
          <span className="italic">are peers actually storing the data they claim?</span>
        </p>
        <p>
          To answer this question we continuously sample other nodes in the network, validate their responses against
          KZG commitments, and piece this all together tobuild a real-time picture of custody compliance.
        </p>
      </InfoBox>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Main Content: Heatmap (3/4 width) */}
        <div className="lg:col-span-3">
          <div className="bg-card text-card-foreground overflow-hidden rounded-lg border border-border shadow-sm">
            {/* Header with Level Title */}
            <div className="border-b border-border bg-muted/20 px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                {/* Level Title */}
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {getLevelTitle(currentLevel, timezone).main}
                  </h2>
                  <p className="text-sm text-muted">{getLevelTitle(currentLevel, timezone).sub}</p>
                </div>

                {/* Controls */}
                <div className="flex shrink-0 items-center gap-2">
                  {/* Detail page links */}
                  {currentLevel.type === 'epoch' && (
                    <Link
                      to="/ethereum/epochs/$epoch"
                      params={{ epoch: String(currentLevel.epoch) }}
                      className="flex items-center gap-1.5 rounded-sm border border-accent/30 bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-accent transition-all hover:border-accent/50 hover:bg-accent/20"
                    >
                      <CubeIcon className="size-3.5" />
                      <span>Epoch Deep Dive</span>
                      <ArrowTopRightOnSquareIcon className="size-3" />
                    </Link>
                  )}
                  {currentLevel.type === 'slot' && (
                    <Link
                      to="/ethereum/slots/$slot"
                      params={{ slot: String(currentLevel.slot) }}
                      className="flex items-center gap-1.5 rounded-sm border border-accent/30 bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-accent transition-all hover:border-accent/50 hover:bg-accent/20"
                    >
                      <Square2StackIcon className="size-3.5" />
                      <span>Slot Deep Dive</span>
                      <ArrowTopRightOnSquareIcon className="size-3" />
                    </Link>
                  )}
                  <ViewModeToggle viewMode={viewMode} onViewModeChange={handleViewModeChange} size="compact" />
                  <TimezoneToggle size="compact" />
                </div>
              </div>
            </div>

            {/* Breadcrumb Navigation */}
            {breadcrumbs.length > 1 && (
              <div className="flex items-center gap-2 border-b border-border px-4 py-2">
                <span className="text-xs font-medium tracking-wide text-muted uppercase">Navigate:</span>
                <nav className="flex items-center gap-1 text-sm">
                  {breadcrumbs.slice(0, -1).map((crumb, index) => {
                    const Icon = crumb.icon;
                    return (
                      <div key={index} className="flex items-center">
                        {index > 0 && <ChevronRightIcon className="mx-1 size-3 text-muted" />}
                        <button
                          type="button"
                          onClick={crumb.onClick}
                          className="group flex items-center gap-1.5 rounded-sm px-2 py-1 text-muted transition-all hover:bg-accent/10 hover:text-accent"
                        >
                          <Icon className="size-3.5 opacity-60 group-hover:opacity-100" />
                          <span className="underline decoration-muted/50 underline-offset-2 group-hover:decoration-accent">
                            {crumb.label}
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </nav>

                <div className="flex-1" />

                {/* Back button */}
                <button
                  type="button"
                  onClick={breadcrumbs[breadcrumbs.length - 2].onClick}
                  className="group flex items-center gap-1.5 rounded-sm bg-muted/30 px-2.5 py-1.5 text-xs font-medium text-muted transition-all hover:bg-accent/10 hover:text-accent"
                >
                  <ArrowLeftIcon className="size-3.5" />
                  <span>Back</span>
                </button>
              </div>
            )}

            {/* Legend Strip */}
            <div className="border-b border-border bg-muted/30 px-4 py-2">
              <DataAvailabilityLegend
                granularity={granularity}
                viewMode={viewMode}
                threshold={threshold}
                orientation="horizontal"
              />
            </div>

            {/* Heatmap Area */}
            <div className="p-4">
              {isLoading || (forkViewLoading && !hasPerformedInitialNav && currentLevel.type === 'window') ? (
                <DataAvailabilitySkeleton />
              ) : (
                <DataAvailabilityHeatmap
                  rows={rows}
                  granularity={granularity}
                  filters={filters}
                  viewMode={viewMode}
                  threshold={threshold}
                  onRowClick={currentLevel.type !== 'slot' ? handleRowClick : undefined}
                  onCellClick={handleCellClick}
                  onColumnClick={handleColumnClick}
                  cellSize="3xs"
                  showColumnHeader
                  showLegend={false}
                />
              )}
            </div>
          </div>
        </div>

        {/* Sidebar: Live Probes (1/4 width) */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 space-y-4">
            <LiveProbeEvents context={probeFilterContext} probesLinkParams={probesLinkParams} />
          </div>
        </div>
      </div>

      {/* Cell Probe Dialog */}
      <CellProbeDialog
        isOpen={cellDialogOpen}
        onClose={handleCellDialogClose}
        cellContext={cellContext}
        timeRangeContext={timeRangeContext}
      />
    </Container>
  );
}
