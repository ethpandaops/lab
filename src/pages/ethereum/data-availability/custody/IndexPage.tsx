import { type JSX, useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearch, useNavigate, Link } from '@tanstack/react-router';
import { Button, buttonClassName } from '@/components/Elements/Button';
import { Card } from '@/components/Layout/Card';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { DataAvailabilityHeatmap } from '@/pages/ethereum/data-availability/components/DataAvailabilityHeatmap';
import { DataAvailabilityLegend } from '@/pages/ethereum/data-availability/components/DataAvailabilityHeatmap/DataAvailabilityLegend';
import { DataAvailabilitySkeleton } from '@/pages/ethereum/data-availability/components/DataAvailabilitySkeleton';
import { Dialog } from '@/components/Overlays/Dialog';
import { CellProbeDialog } from './components/CellProbeDialog';
import type { CellContext, TimeRangeContext } from './components/CellProbeDialog';
import type { DataAvailabilityGranularity } from '@/pages/ethereum/data-availability/components/DataAvailabilityHeatmap';
import { BlobPosterLogo } from '@/components/Ethereum/BlobPosterLogo';
import type { DataAvailabilityFilters } from '@/pages/ethereum/data-availability/components/DataAvailabilityHeatmap/DataAvailabilityFilterPanel.types';
import { useNetwork } from '@/hooks/useNetwork';
import { useTableBounds } from '@/hooks/useBounds';
import { formatEpoch, formatSlot } from '@/utils';
import { SECONDS_PER_SLOT, epochToTimestamp, slotToTimestamp } from '@/utils/beacon';
import { useFuluActivation } from './hooks/useFuluActivation';
import {
  ChevronRightIcon,
  ArrowLeftIcon,
  ArrowTopRightOnSquareIcon,
  Squares2X2Icon,
  CalendarDaysIcon,
  ClockIcon,
  CubeIcon,
  Square2StackIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import {
  fctDataColumnAvailabilityHourlyServiceListOptions,
  intCustodyProbeOrderBySlotServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import {
  fctDataColumnAvailabilityByEpochServiceList,
  fctDataColumnAvailabilityBySlotServiceList,
  fctDataColumnAvailabilityDailyServiceList,
} from '@/api/sdk.gen';
import type {
  FctDataColumnAvailabilityByEpoch,
  FctDataColumnAvailabilityBySlot,
  FctDataColumnAvailabilityDaily,
} from '@/api/types.gen';
import {
  transformDailyToRows,
  transformHourlyToRows,
  transformEpochsToRows,
  transformSlotsToRows,
} from '@/pages/ethereum/data-availability/utils/data-availability-transform';
import { fetchAllPages } from '@/utils/api-pagination';
import { completeBucketEnd, currentUtcDate, toUtcDate } from '@/utils/time';
import type { CustodySearch } from './IndexPage.types';
import { validateSearchParamHierarchy } from './IndexPage.types';

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

/** Button look for router links */
const SECONDARY_LINK_CLASS = buttonClassName({ variant: 'secondary', size: 'sm' });

/** Slot start times of one epoch's slots */
function epochWindow(epoch: number, genesisTime: number): TimeRangeContext {
  return { timeStart: epochToTimestamp(epoch, genesisTime), timeEnd: epochToTimestamp(epoch + 1, genesisTime) };
}

/** Slot start times of the epochs that start in an hour; the last one runs past the hour */
function hourOfEpochsWindow(hourStart: number, genesisTime: number): TimeRangeContext {
  const epochSeconds = SLOTS_PER_EPOCH * SECONDS_PER_SLOT;
  const firstEpoch = Math.ceil((hourStart - genesisTime) / epochSeconds);
  const endEpoch = Math.ceil((hourStart + SECONDS_PER_HOUR - genesisTime) / epochSeconds);
  return { timeStart: epochToTimestamp(firstEpoch, genesisTime), timeEnd: epochToTimestamp(endEpoch, genesisTime) };
}

/** Slot start time window covered by a drill-down level; the window level starts at `windowStart` */
function levelWindow(level: DrillDownLevel, genesisTime: number, windowStart = 0): TimeRangeContext {
  switch (level.type) {
    case 'window':
      return { timeStart: windowStart, timeEnd: completeBucketEnd('day') };
    case 'day': {
      const dayStart = Date.parse(level.date) / 1000;
      return { timeStart: dayStart, timeEnd: dayStart + SECONDS_PER_DAY };
    }
    case 'hour':
      return hourOfEpochsWindow(level.hourStartDateTime, genesisTime);
    case 'epoch':
      return epochWindow(level.epoch, genesisTime);
    case 'slot': {
      const slotStart = slotToTimestamp(level.slot, genesisTime);
      return { timeStart: slotStart, timeEnd: slotStart + SECONDS_PER_SLOT, slot: level.slot };
    }
  }
}

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

/** "Since Dec 3, 2025 (UTC)" for the window level's first day, if known */
function sinceLabel(windowStart: number | undefined): string | undefined {
  if (windowStart === undefined) return undefined;
  const date = new Date(windowStart * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return `Since ${date} (UTC)`;
}

/**
 * Get a human-readable title for the current viewing level
 * Main title = where you are, subtitle = what you're viewing
 * All times are displayed in UTC
 */
function getLevelTitle(level: DrillDownLevel, windowStart: number | undefined): { main: string; sub?: string } {
  switch (level.type) {
    case 'window':
      return { main: 'Custody Window', sub: sinceLabel(windowStart) };
    case 'day': {
      const labelDate = new Date(level.date + 'T00:00:00Z');
      const dateStr = labelDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      });
      return { main: dateStr, sub: 'Hours in this day (UTC)' };
    }
    case 'hour': {
      const labelDate = new Date(level.date + 'T00:00:00Z');
      const dateStr = labelDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      });
      const timeStr = new Date(level.hourStartDateTime * 1000).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC',
      });
      return { main: `${dateStr} at ${timeStr} UTC`, sub: 'Epochs in this hour' };
    }
    case 'epoch':
      return { main: `Epoch ${formatEpoch(level.epoch)}`, sub: 'Slots in this epoch' };
    case 'slot':
      return { main: `Slot ${formatSlot(level.slot)}` };
  }
}

/**
 * Custody page showing PeerDAS data availability across drill-down levels
 */
export function IndexPage(): JSX.Element {
  // URL-based state management
  const navigate = useNavigate({ from: '/ethereum/data-availability/custody/' });
  const search = useSearch({ from: '/ethereum/data-availability/custody/' });

  // Derive drill-down state from URL
  const currentLevel = deriveCurrentLevel(search);

  // All timestamps are displayed in UTC - data is aggregated by UTC boundaries
  const timezone = 'UTC' as const;

  // Network for slot times
  const { currentNetwork } = useNetwork();
  const genesisTime = currentNetwork?.genesis_time ?? 0;

  // Get Fulu activation info for filtering pre-fork data
  // PeerDAS/data columns only exist after Fulu activation
  const { fuluActivation } = useFuluActivation();

  // The window starts on the day Fulu activated, or later where the daily table's history starts
  const { data: dailyBounds } = useTableBounds('fct_data_column_availability_daily');
  const windowStartTime = Math.max(fuluActivation?.dateTime ?? 0, dailyBounds?.min ?? 0);
  const windowStart = windowStartTime > 0 ? Math.floor(windowStartTime / SECONDS_PER_DAY) * SECONDS_PER_DAY : undefined;

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

  // Learn more dialog state
  const [learnMoreOpen, setLearnMoreOpen] = useState(false);

  // Window Level: every complete day of daily aggregated data
  const today = currentUtcDate();
  const windowQuery = useQuery({
    queryKey: ['custody', 'window', currentNetwork?.name, today],
    queryFn: async ({ signal }) => ({
      fct_data_column_availability_daily: await fetchAllPages<FctDataColumnAvailabilityDaily>(
        fctDataColumnAvailabilityDailyServiceList,
        { query: { date_ne: today, page_size: 10000, order_by: 'date desc' } },
        'fct_data_column_availability_daily',
        signal
      ),
    }),
    enabled: currentLevel.type === 'window' && !!currentNetwork,
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

  // Epoch and Slot Levels: Slots within a specific epoch (with pagination for safety)
  const epochQuery = useQuery({
    queryKey: ['epochData', currentLevel.type === 'epoch' || currentLevel.type === 'slot' ? currentLevel.epoch : null],
    queryFn: async ({ signal }) => {
      if (currentLevel.type !== 'epoch' && currentLevel.type !== 'slot') {
        return { fct_data_column_availability_by_slot: [] };
      }

      // Calculate slot range for this epoch
      const firstSlot = currentLevel.epoch * SLOTS_PER_EPOCH;
      const lastSlot = (currentLevel.epoch + 1) * SLOTS_PER_EPOCH;

      const slotData = await fetchAllPages<FctDataColumnAvailabilityBySlot>(
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

      return {
        fct_data_column_availability_by_slot: slotData,
      };
    },
    enabled: currentLevel.type === 'epoch' || currentLevel.type === 'slot',
  });

  // Fetch blob submitters for the slot (array index = blob index)
  const blobSubmittersQuery = useQuery({
    ...intCustodyProbeOrderBySlotServiceListOptions({
      query: {
        slot_eq: currentLevel.type === 'slot' ? currentLevel.slot : undefined,
        page_size: 1,
        // Filter out pre-Fulu slots server-side (PeerDAS only exists after Fulu)
        ...(fuluActivation && { slot_gte: fuluActivation.slot }),
      },
    }),
    enabled: currentLevel.type === 'slot' && !!fuluActivation,
  });
  const blobSubmitters = useMemo(
    () => blobSubmittersQuery.data?.int_custody_probe_order_by_slot?.[0]?.blob_submitters ?? [],
    [blobSubmittersQuery.data]
  );

  /**
   * Transform Window data (daily) to heatmap rows
   * Filters out dates before the window starts (PeerDAS didn't exist before Fulu)
   */
  const windowRows = useMemo(() => {
    const rows = transformDailyToRows(windowQuery.data?.fct_data_column_availability_daily, timezone);
    if (windowStart === undefined) return rows;

    // The day containing the fork is shown
    const startDate = toUtcDate(windowStart);
    return rows.filter(row => row.identifier >= startDate);
  }, [windowQuery.data, timezone, windowStart]);

  /**
   * Transform Day data (hourly) to heatmap rows
   * Filters out hours before Fulu activation (PeerDAS didn't exist)
   */
  const dayRows = useMemo(() => {
    if (currentLevel.type !== 'day') return [];

    const rows = transformHourlyToRows(dayQuery.data?.fct_data_column_availability_hourly, timezone);
    if (!fuluActivation) return rows;

    // Round down to the start of the activation hour so we include partial hours
    // e.g., if fork activated at 7:45, we want to show the 7:00 hour
    const fuluHourStart = Math.floor(fuluActivation.dateTime / SECONDS_PER_HOUR) * SECONDS_PER_HOUR;
    return rows.filter(row => Number(row.identifier) >= fuluHourStart);
  }, [dayQuery.data, currentLevel.type, timezone, fuluActivation]);

  /**
   * Transform Hour data (epochs) to heatmap rows
   * Filters out epochs before Fulu activation (PeerDAS didn't exist)
   */
  const hourRows = useMemo(() => {
    const rows = transformEpochsToRows(hourQuery.data?.fct_data_column_availability_by_epoch);
    if (!fuluActivation) return rows;

    // Filter out epochs before Fulu activation (identifier is epoch number as string)
    return rows.filter(row => Number(row.identifier) >= fuluActivation.epoch);
  }, [hourQuery.data, fuluActivation]);

  /**
   * Transform Epoch data (slots) to heatmap rows
   * Filters out slots before Fulu activation (PeerDAS didn't exist)
   */
  const epochRows = useMemo(() => {
    const rows = transformSlotsToRows(epochQuery.data?.fct_data_column_availability_by_slot);
    if (!fuluActivation) return rows;

    // Filter out slots before Fulu activation (identifier is slot number as string)
    return rows.filter(row => Number(row.identifier) >= fuluActivation.slot);
  }, [epochQuery.data, fuluActivation]);

  /**
   * Slot Level: the slot's own row. A column probe covers every blob in the slot, so there is no per-blob row.
   */
  const slotRows = useMemo(
    () => (currentLevel.type === 'slot' ? epochRows.filter(row => row.identifier === String(currentLevel.slot)) : []),
    [currentLevel, epochRows]
  );
  const slotBlobCount = useMemo(() => {
    if (currentLevel.type !== 'slot') return 0;
    const slotData = epochQuery.data?.fct_data_column_availability_by_slot?.find(d => d.slot === currentLevel.slot);
    return slotData?.blob_count ?? 0;
  }, [currentLevel, epochQuery.data]);

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
        // Rows are slots, as at the epoch level
        return {
          rows: slotRows,
          granularity: 'epoch' as DataAvailabilityGranularity,
          isLoading: epochQuery.isLoading,
          error: epochQuery.error,
        };
    }
  }, [currentLevel, windowRows, dayRows, hourRows, epochRows, slotRows, windowQuery, dayQuery, hourQuery, epochQuery]);

  /**
   * Handle row click to drill down to next level
   * Updates URL search params to navigate to deeper level
   */
  const handleRowClick = (identifier: string): void => {
    switch (currentLevel.type) {
      case 'window':
        // Drill to day level
        navigate({
          resetScroll: false,
          search: prev => ({ ...prev, date: identifier }),
        });
        break;
      case 'day':
        // Drill to hour level
        navigate({
          resetScroll: false,
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
            resetScroll: false,
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
      case 'epoch': {
        // Check if the slot has blobs before drilling down
        const slotRow = epochRows.find(row => row.identifier === identifier);
        if (slotRow?.disabled) {
          // Slot has no blobs, don't drill down
          return;
        }
        // Drill to slot level
        navigate({
          resetScroll: false,
          search: prev => ({
            ...prev,
            date: currentLevel.date,
            hour: currentLevel.hourStartDateTime,
            epoch: currentLevel.epoch,
            slot: Number(identifier),
          }),
        });
        break;
      }
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

      // Probes of the clicked row's own slots
      let timeRange: TimeRangeContext;
      switch (currentLevel.type) {
        case 'window':
          // Row is a date
          timeRange = levelWindow({ type: 'day', date: rowIdentifier }, genesisTime);
          break;
        case 'day': {
          // Row is an hour start timestamp
          const hourStart = Number(rowIdentifier);
          timeRange = { timeStart: hourStart, timeEnd: hourStart + SECONDS_PER_HOUR };
          break;
        }
        case 'hour':
          // Row is an epoch
          timeRange = epochWindow(Number(rowIdentifier), genesisTime);
          break;
        case 'epoch': {
          // Row is a slot
          const slot = Number(rowIdentifier);
          timeRange = levelWindow({ ...currentLevel, type: 'slot', slot }, genesisTime);
          break;
        }
        case 'slot':
          // Row is the current slot
          timeRange = levelWindow(currentLevel, genesisTime);
          break;
      }

      setCellContext(cellCtx);
      setTimeRangeContext(timeRange);
      setCellDialogOpen(true);
    },
    [rows, granularity, currentLevel, genesisTime]
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
      // Build context label based on current drill-down level (all times UTC)
      let contextLabel: string;
      switch (currentLevel.type) {
        case 'window':
          contextLabel = sinceLabel(windowStart) ?? 'All days (UTC)';
          break;
        case 'day': {
          const labelDate = new Date(currentLevel.date + 'T00:00:00Z');
          const dateStr = labelDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC',
          });
          contextLabel = `${dateStr} (UTC)`;
          break;
        }
        case 'hour': {
          const labelDate = new Date(currentLevel.date + 'T00:00:00Z');
          const dateStr = labelDate.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            timeZone: 'UTC',
          });
          const timeStr = new Date(currentLevel.hourStartDateTime * 1000).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'UTC',
          });
          contextLabel = `${dateStr} at ${timeStr} UTC`;
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

      // Probes of every slot the current level covers
      const timeRange = levelWindow(currentLevel, genesisTime, windowStart);

      setCellContext(cellCtx);
      setTimeRangeContext(timeRange);
      setCellDialogOpen(true);
    },
    [granularity, currentLevel, genesisTime, windowStart]
  );

  /**
   * Build breadcrumb path - shows full drill-down hierarchy
   */
  const breadcrumbs = useMemo(() => {
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
            resetScroll: false,
            search: {},
            replace: true,
          });
        },
      },
    ];

    if (currentLevel.type === 'window') return crumbs;

    // Add day breadcrumb if we're at day level or deeper (all times UTC)
    if (
      currentLevel.type === 'day' ||
      currentLevel.type === 'hour' ||
      currentLevel.type === 'epoch' ||
      currentLevel.type === 'slot'
    ) {
      const breadcrumbLabelDate = new Date(currentLevel.date + 'T00:00:00Z');
      crumbs.push({
        label: breadcrumbLabelDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          timeZone: 'UTC',
        }),
        icon: CalendarDaysIcon,
        onClick: () =>
          navigate({
            resetScroll: false,
            search: { date: currentLevel.date },
            replace: true,
          }),
      });
    }

    // Add hour breadcrumb if we're at hour level or deeper
    if (currentLevel.type === 'hour' || currentLevel.type === 'epoch' || currentLevel.type === 'slot') {
      crumbs.push({
        label: new Date(currentLevel.hourStartDateTime * 1000).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
          timeZone: 'UTC',
        }),
        icon: ClockIcon,
        onClick: () =>
          navigate({
            resetScroll: false,
            search: { date: currentLevel.date, hour: currentLevel.hourStartDateTime },
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
            resetScroll: false,
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
        label: formatSlot(currentLevel.slot),
        icon: Square2StackIcon,
        onClick: () =>
          navigate({
            resetScroll: false,
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
  }, [currentLevel, navigate]);

  const levelTitle = getLevelTitle(currentLevel, windowStart);

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
      {/* Header with Learn More */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <Header
          title="Custody Compliance"
          description={
            <>
              Are peers actually storing the data they claim? Powered by{' '}
              <a
                href="https://github.com/ethp2p/dasmon"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Dasmon
              </a>
            </>
          }
          className="mb-0"
        />
        <Button
          variant="soft"
          size="sm"
          className="mt-1 shrink-0"
          leadingIcon={<InformationCircleIcon />}
          onClick={() => setLearnMoreOpen(true)}
        >
          Learn more
        </Button>
      </div>

      {/* Learn More Dialog */}
      <Dialog open={learnMoreOpen} onClose={() => setLearnMoreOpen(false)} title="About PeerDAS Custody" size="lg">
        <div className="space-y-4 text-sm leading-relaxed text-muted">
          <p>
            Instead of every node storing every blob, data is erasure coded with 2x redundancy and split into 128
            columns. Each P2P peer commits to storing a subset based on its identity and validator balance.
          </p>
          <p>64 distinct columns are required to reconstruct the full blob matrix.</p>
          <p>
            We continuously sample P2P peers in the network, validate their responses against KZG commitments, and build
            a real-time picture of custody compliance across all 128 columns.
          </p>
        </div>
      </Dialog>

      <Card
        title={levelTitle.main}
        subtitle={levelTitle.sub}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Detail page links */}
            {currentLevel.type === 'epoch' && (
              <Link
                to="/ethereum/epochs/$epoch"
                params={{ epoch: String(currentLevel.epoch) }}
                className={SECONDARY_LINK_CLASS}
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
                className={SECONDARY_LINK_CLASS}
              >
                <Square2StackIcon className="size-3.5" />
                <span>Slot Deep Dive</span>
                <ArrowTopRightOnSquareIcon className="size-3" />
              </Link>
            )}
          </div>
        }
      >
        <div className="space-y-4">
          {/* Breadcrumb Navigation */}
          {breadcrumbs.length > 1 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Navigate:</span>
              <nav className="flex items-center gap-1 text-sm">
                {breadcrumbs.slice(0, -1).map((crumb, index) => {
                  const Icon = crumb.icon;
                  return (
                    <div key={index} className="flex items-center">
                      {index > 0 && <ChevronRightIcon className="mx-1 size-3 text-muted" />}
                      <button
                        type="button"
                        onClick={crumb.onClick}
                        className="group flex items-center gap-1.5 rounded-sm px-2 py-1 text-muted transition-colors hover:bg-accent/10 hover:text-accent"
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
                className="group flex items-center gap-1.5 rounded-sm bg-muted/30 px-2.5 py-1.5 text-xs font-medium text-muted transition-colors hover:bg-accent/10 hover:text-accent"
              >
                <ArrowLeftIcon className="size-3.5" />
                <span>Back</span>
              </button>
            </div>
          )}

          {/* Legend Strip */}
          <div className="rounded-sm bg-muted/30 px-3 py-2">
            <DataAvailabilityLegend orientation="horizontal" />
          </div>

          {/* Heatmap Area */}
          <div>
            {isLoading ? (
              <DataAvailabilitySkeleton />
            ) : (
              <DataAvailabilityHeatmap
                rows={rows}
                granularity={granularity}
                filters={filters}
                onRowClick={currentLevel.type !== 'slot' ? handleRowClick : undefined}
                onCellClick={handleCellClick}
                onColumnClick={handleColumnClick}
                cellSize="3xs"
                showColumnHeader
                showLegend={false}
              />
            )}
          </div>

          {currentLevel.type === 'slot' && slotBlobCount > 0 && (
            <div>
              <h4 className="mb-2 text-xs/5 font-medium text-muted">Blob submitters</h4>
              <ol className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4 xl:grid-cols-6">
                {Array.from({ length: slotBlobCount }, (_, index) => {
                  const submitter = blobSubmitters[index] ?? 'Unknown';
                  return (
                    <li key={index} className="flex min-w-0 items-center gap-2 text-sm/6">
                      <span className="w-5 shrink-0 text-right font-mono text-xs text-muted tabular-nums">{index}</span>
                      <BlobPosterLogo poster={submitter} size={16} className="shrink-0" />
                      <span className="truncate text-foreground">{submitter}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </div>
      </Card>

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
