import { type JSX, useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChartBarIcon, TableCellsIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { Stats } from '@/components/DataDisplay/Stats';
import { DataAvailabilityHeatmap } from '@/components/Charts/DataAvailabilityHeatmap';
import { DataAvailabilityFilterPanel } from '@/components/Charts/DataAvailabilityHeatmap/DataAvailabilityFilterPanel';
import { DataAvailabilityLegend } from '@/components/Charts/DataAvailabilityHeatmap/DataAvailabilityLegend';
import type { DataAvailabilityGranularity } from '@/components/Charts/DataAvailabilityHeatmap';
import type { DataAvailabilityFilters } from '@/components/Charts/DataAvailabilityHeatmap/DataAvailabilityFilterPanel.types';
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
 * DAS Custody page showing PeerDAS data availability across drill-down levels
 */
export function IndexPage(): JSX.Element {
  // Drill-down navigation state
  const [currentLevel, setCurrentLevel] = useState<DrillDownLevel>({ type: 'window' });
  const [selectedColumnIndex, setSelectedColumnIndex] = useState<number | undefined>();

  // Filter state
  const [filters, setFilters] = useState<DataAvailabilityFilters>({
    columnGroups: new Set([0, 1, 2, 3]), // All groups selected by default
    minAvailability: 0,
    maxAvailability: 100,
    minObservationCount: 0,
  });

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
    () => transformDailyToRows(windowQuery.data?.fct_data_column_availability_daily),
    [windowQuery.data]
  );

  /**
   * Transform Day data (hourly) to heatmap rows
   */
  const dayRows = useMemo(
    () =>
      currentLevel.type === 'day' ? transformHourlyToRows(dayQuery.data?.fct_data_column_availability_hourly) : [],
    [dayQuery.data, currentLevel.type]
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
   */
  const handleRowClick = (identifier: string): void => {
    switch (currentLevel.type) {
      case 'window':
        // Drill to day level
        setCurrentLevel({ type: 'day', date: identifier });
        break;
      case 'day':
        // Drill to hour level (pass date for breadcrumb)
        setCurrentLevel({ type: 'hour', date: currentLevel.date, hourStartDateTime: Number(identifier) });
        break;
      case 'hour': {
        // Drill to epoch level - identifier is the epoch number as string
        // Need to get epoch_start_date_time from the data
        const epochData = hourQuery.data?.fct_data_column_availability_by_epoch?.find(
          (d: FctDataColumnAvailabilityByEpoch) => String(d.epoch) === identifier
        );
        if (epochData?.epoch_start_date_time !== undefined && epochData.epoch !== undefined) {
          setCurrentLevel({
            type: 'epoch',
            date: currentLevel.date,
            hourStartDateTime: currentLevel.hourStartDateTime,
            epochStartDateTime: epochData.epoch_start_date_time,
            epoch: epochData.epoch,
          });
        }
        break;
      }
      case 'epoch':
        // Drill to slot level
        setCurrentLevel({
          type: 'slot',
          date: currentLevel.date,
          hourStartDateTime: currentLevel.hourStartDateTime,
          epochStartDateTime: currentLevel.epochStartDateTime,
          epoch: currentLevel.epoch,
          slot: Number(identifier),
        });
        break;
      case 'slot':
        // Already at deepest level
        break;
    }
  };

  /**
   * Handle cell click to toggle column selection
   */
  const handleCellClick = (_identifier: string, columnIndex: number): void => {
    setSelectedColumnIndex(prev => (prev === columnIndex ? undefined : columnIndex));
  };

  /**
   * Build breadcrumb path - shows full drill-down hierarchy
   */
  const breadcrumbs = useMemo(() => {
    const crumbs: Array<{ label: string; onClick: () => void }> = [
      {
        label: `Window (${WINDOW_DAYS} days)`,
        onClick: () => {
          setCurrentLevel({ type: 'window' });
          setSelectedColumnIndex(undefined);
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
        label: `Day: ${new Date(currentLevel.date).toLocaleDateString()}`,
        onClick: () => setCurrentLevel({ type: 'day', date: currentLevel.date }),
      });
    }

    // Add hour breadcrumb if we're at hour level or deeper
    if (currentLevel.type === 'hour' || currentLevel.type === 'epoch' || currentLevel.type === 'slot') {
      crumbs.push({
        label: `Hour: ${new Date(currentLevel.hourStartDateTime * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`,
        onClick: () =>
          setCurrentLevel({ type: 'hour', date: currentLevel.date, hourStartDateTime: currentLevel.hourStartDateTime }),
      });
    }

    // Add epoch breadcrumb if we're at epoch level or deeper
    if (currentLevel.type === 'epoch' || currentLevel.type === 'slot') {
      crumbs.push({
        label: `Epoch: ${currentLevel.epoch}`,
        onClick: () =>
          setCurrentLevel({
            type: 'epoch',
            date: currentLevel.date,
            hourStartDateTime: currentLevel.hourStartDateTime,
            epochStartDateTime: currentLevel.epochStartDateTime,
            epoch: currentLevel.epoch,
          }),
      });
    }

    // Add slot breadcrumb if we're at slot level
    if (currentLevel.type === 'slot') {
      crumbs.push({
        label: `Slot: ${currentLevel.slot}`,
        onClick: () =>
          setCurrentLevel({
            type: 'slot',
            date: currentLevel.date,
            hourStartDateTime: currentLevel.hourStartDateTime,
            epochStartDateTime: currentLevel.epochStartDateTime,
            epoch: currentLevel.epoch,
            slot: currentLevel.slot,
          }),
      });
    }

    return crumbs;
  }, [currentLevel]);

  /**
   * Calculate summary statistics for the current view
   */
  const summaryStats = useMemo(() => {
    if (!rows.length) {
      return {
        totalPeriods: 0,
        activeColumns: 0,
        avgAvailability: 0,
        totalObservations: 0,
        avgResponseTime: 0,
      };
    }

    // Get unique columns that have data
    const columnsWithData = new Set<number>();
    let totalAvailability = 0;
    let cellsWithData = 0;
    let totalObservations = 0;
    let totalResponseTime = 0;
    let cellsWithResponseTime = 0;

    for (const row of rows) {
      for (const cell of row.cells) {
        const hasData = (cell.totalCount ?? 0) > 0;
        if (hasData) {
          columnsWithData.add(cell.columnIndex);
          totalAvailability += cell.availability;
          cellsWithData++;
          totalObservations += cell.totalCount ?? 0;
          if (cell.avgResponseTimeMs !== undefined && cell.avgResponseTimeMs > 0) {
            totalResponseTime += cell.avgResponseTimeMs;
            cellsWithResponseTime++;
          }
        }
      }
    }

    return {
      totalPeriods: rows.length,
      activeColumns: columnsWithData.size,
      avgAvailability: cellsWithData > 0 ? totalAvailability / cellsWithData : 0,
      totalObservations,
      avgResponseTime: cellsWithResponseTime > 0 ? totalResponseTime / cellsWithResponseTime : 0,
    };
  }, [rows]);

  /**
   * Get period label based on granularity
   */
  const periodLabel = useMemo(() => {
    switch (granularity) {
      case 'window':
        return 'Days';
      case 'day':
        return 'Hours';
      case 'hour':
        return 'Epochs';
      case 'epoch':
        return 'Slots';
      case 'slot':
        return 'Blobs';
      default:
        return 'Periods';
    }
  }, [granularity]);

  /**
   * Get heatmap card title based on granularity
   */
  const heatmapTitle = useMemo(() => {
    switch (granularity) {
      case 'window':
        return 'Column Availability Across Days';
      case 'day':
        return `Column Availability by Hour - ${new Date(currentLevel.type === 'day' ? currentLevel.date : '').toLocaleDateString()}`;
      case 'hour':
        return 'Column Availability by Epoch';
      case 'epoch':
        return `Column Availability by Slot - Epoch ${currentLevel.type === 'epoch' ? currentLevel.epoch : ''}`;
      case 'slot':
        return `Column Availability by Blob - Slot ${currentLevel.type === 'slot' ? currentLevel.slot : ''}`;
      default:
        return 'Column Availability';
    }
  }, [granularity, currentLevel]);

  /**
   * Get heatmap card subtitle based on granularity
   */
  const heatmapSubtitle = useMemo(() => {
    switch (granularity) {
      case 'window':
        return 'Click on any day to view hourly breakdown';
      case 'day':
        return 'Click on any hour to view epochs';
      case 'hour':
        return 'Click on any epoch to view slots';
      case 'epoch':
        return 'Click on any slot to view blobs';
      case 'slot':
        return 'Detailed blob-level availability data';
      default:
        return '';
    }
  }, [granularity]);

  if (error) {
    return (
      <Container>
        <Header
          title="DAS Custody"
          description="PeerDAS data availability visualization showing column custody across validators"
        />
        <div className="rounded-sm border border-danger/20 bg-danger/10 p-4 text-danger">
          Error loading data: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <Header
        title="DAS Custody"
        description="PeerDAS data availability visualization showing column custody across validators"
      />

      {/* Breadcrumb navigation */}
      {breadcrumbs.length > 1 && (
        <nav className="mb-6 flex items-center gap-2 text-sm/6">
          {breadcrumbs.map((crumb, index) => (
            <div key={index} className="flex items-center gap-2">
              {index > 0 && <span className="text-muted">/</span>}
              <button
                type="button"
                onClick={crumb.onClick}
                className={
                  index === breadcrumbs.length - 1
                    ? 'font-semibold text-foreground'
                    : 'text-accent transition-colors hover:text-accent/80'
                }
              >
                {crumb.label}
              </button>
            </div>
          ))}
        </nav>
      )}

      {/* Loading state */}
      {isLoading ? (
        <LoadingContainer />
      ) : (
        <div className="space-y-6">
          {/* Summary stats */}
          <Stats
            stats={[
              {
                id: 'periods',
                name: periodLabel,
                value: summaryStats.totalPeriods.toLocaleString(),
                icon: ChartBarIcon,
              },
              {
                id: 'columns',
                name: 'Active Columns',
                value: `${summaryStats.activeColumns} / ${TOTAL_COLUMNS}`,
                icon: TableCellsIcon,
              },
              {
                id: 'availability',
                name: 'Avg Availability',
                value: `${(summaryStats.avgAvailability * 100).toFixed(1)}%`,
                icon: CheckCircleIcon,
              },
              {
                id: 'response',
                name: 'Avg Response Time',
                value: summaryStats.avgResponseTime > 0 ? `${summaryStats.avgResponseTime.toFixed(0)}ms` : 'N/A',
                icon: ClockIcon,
              },
            ]}
          />

          {/* Heatmap */}
          <PopoutCard title={heatmapTitle} subtitle={heatmapSubtitle} modalSize="fullscreen" allowContentOverflow>
            <div className="space-y-6">
              {/* Filters and Legend on same line */}
              <div className="flex flex-col items-start gap-6 lg:flex-row lg:items-start">
                <div className="w-full lg:flex-[2]">
                  <DataAvailabilityFilterPanel filters={filters} onFiltersChange={setFilters} defaultOpen={false} />
                </div>
                <div className="w-full lg:flex-1">
                  <DataAvailabilityLegend granularity={granularity} />
                </div>
              </div>

              {/* Heatmap with horizontal scroll */}
              <div className="-mt-24 overflow-x-auto pt-24 pb-4">
                <DataAvailabilityHeatmap
                  rows={rows}
                  granularity={granularity}
                  filters={filters}
                  selectedColumnIndex={selectedColumnIndex}
                  onCellClick={handleCellClick}
                  onRowClick={currentLevel.type !== 'slot' ? handleRowClick : undefined}
                  onClearColumnSelection={() => setSelectedColumnIndex(undefined)}
                  onBack={breadcrumbs.length > 1 ? breadcrumbs[breadcrumbs.length - 2].onClick : undefined}
                  cellSize="xs"
                  showColumnHeader
                  showLegend={false}
                />
              </div>
            </div>
          </PopoutCard>
        </div>
      )}
    </Container>
  );
}
