import type { DataAvailabilityRow } from '@/pages/ethereum/data-availability/components/DataAvailabilityHeatmap';
import type {
  FctDataColumnAvailabilityDaily,
  FctDataColumnAvailabilityHourly,
  FctDataColumnAvailabilityByEpoch,
  FctDataColumnAvailabilityBySlot,
} from '@/api/types.gen';

/**
 * Total number of columns in PeerDAS
 */
const TOTAL_COLUMNS = 128;

/**
 * Cell data structure for heatmap rows
 */
interface HeatmapCell {
  columnIndex: number;
  identifier: string;
  availability: number;
  successCount?: number;
  totalCount?: number;
  avgResponseTimeMs?: number;
}

/**
 * Ensures all columns (0-127) are present in a row, filling missing columns with empty data
 */
function ensureAllColumns(cells: HeatmapCell[], identifier: string): HeatmapCell[] {
  const cellsByColumn = new Map(cells.map(cell => [cell.columnIndex, cell]));
  const allCells: HeatmapCell[] = [];

  for (let i = 0; i < TOTAL_COLUMNS; i++) {
    if (cellsByColumn.has(i)) {
      allCells.push(cellsByColumn.get(i)!);
    } else {
      // Add placeholder for missing column
      allCells.push({
        identifier,
        columnIndex: i,
        availability: 0,
        successCount: 0,
        totalCount: 0,
      });
    }
  }

  return allCells;
}

/**
 * Transform daily data to heatmap rows
 * @param data - Daily data from API
 * @param timezone - Timezone mode for formatting ('UTC' or 'local')
 */
export function transformDailyToRows(
  data: FctDataColumnAvailabilityDaily[] | undefined,
  timezone: 'UTC' | 'local' = 'UTC'
): DataAvailabilityRow[] {
  if (!data) return [];

  // Get today's date for filtering future dates in local mode
  const now = new Date();
  const todayLocalStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD format in local timezone

  // Group by date
  const byDate = new Map<string, FctDataColumnAvailabilityDaily[]>();
  for (const item of data) {
    if (!item.date) continue;
    if (!byDate.has(item.date)) {
      byDate.set(item.date, []);
    }
    byDate.get(item.date)!.push(item);
  }

  // Convert to rows (sorted by date descending for most recent first)
  const rows: DataAvailabilityRow[] = [];
  // Rows spanning years are labelled by full date, which fits the label column where "Dec 31, 2025" doesn't
  const spansYears = new Set([...byDate.keys()].map(date => date.slice(0, 4))).size > 1;
  const zone: Intl.DateTimeFormatOptions = timezone === 'UTC' ? { timeZone: 'UTC' } : {};

  for (const [date, items] of Array.from(byDate.entries()).sort((a, b) => b[0].localeCompare(a[0]))) {
    // For local timezone, use end-of-day UTC to determine the local date label.
    // This shifts UTC dates forward for positive-offset timezones (e.g., AEDT).
    // Example: UTC Dec 3 23:59:59 → AEDT Dec 4 10:59:59, so label shows "Dec 4"
    const labelDate = timezone === 'UTC' ? new Date(date + 'T00:00:00Z') : new Date(date + 'T23:59:59Z');

    // In local mode, skip dates that would show as future dates (e.g., "Dec 5" when today is Dec 4)
    if (timezone === 'local') {
      const shiftedLocalStr = labelDate.toLocaleDateString('en-CA');
      if (shiftedLocalStr > todayLocalStr) {
        continue;
      }
    }

    const cells = items
      .sort((a, b) => (a.column_index ?? 0) - (b.column_index ?? 0))
      .map(item => ({
        identifier: date,
        columnIndex: item.column_index ?? 0,
        availability: (item.avg_availability_pct ?? 0) / 100,
        successCount: item.total_success_count,
        totalCount: item.total_probe_count,
        avgResponseTimeMs: item.avg_p50_response_time_ms,
      }));

    rows.push({
      identifier: date,
      label: spansYears
        ? labelDate.toLocaleDateString('en-CA', zone)
        : labelDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...zone }),
      cells: ensureAllColumns(cells, date),
    });
  }

  return rows;
}

/**
 * Transform hourly data to heatmap rows
 * @param data - Hourly data from API
 * @param timezone - Timezone mode for formatting ('UTC' or 'local')
 */
export function transformHourlyToRows(
  data: FctDataColumnAvailabilityHourly[] | undefined,
  timezone: 'UTC' | 'local' = 'UTC'
): DataAvailabilityRow[] {
  if (!data) return [];

  // Group by hour_start_date_time
  const byHour = new Map<number, FctDataColumnAvailabilityHourly[]>();
  for (const item of data) {
    if (item.hour_start_date_time === undefined) continue;
    if (!byHour.has(item.hour_start_date_time)) {
      byHour.set(item.hour_start_date_time, []);
    }
    byHour.get(item.hour_start_date_time)!.push(item);
  }

  // Convert to rows (sorted by hour ascending)
  return Array.from(byHour.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([hourStart, items]) => {
      const date = new Date(hourStart * 1000);
      const timeLabel = date.toLocaleTimeString(
        'en-US',
        timezone === 'UTC'
          ? { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' }
          : { hour: '2-digit', minute: '2-digit', hour12: false }
      );
      const identifier = String(hourStart);
      const cells = items
        .sort((a, b) => (a.column_index ?? 0) - (b.column_index ?? 0))
        .map(item => ({
          identifier,
          columnIndex: item.column_index ?? 0,
          availability: (item.avg_availability_pct ?? 0) / 100,
          successCount: item.total_success_count,
          totalCount: item.total_probe_count,
          avgResponseTimeMs: item.avg_p50_response_time_ms,
        }));

      return {
        identifier,
        label: timeLabel,
        cells: ensureAllColumns(cells, identifier),
      };
    });
}

/**
 * Transform epoch data to heatmap rows
 */
export function transformEpochsToRows(data: FctDataColumnAvailabilityByEpoch[] | undefined): DataAvailabilityRow[] {
  if (!data) return [];

  // Group by epoch
  const byEpoch = new Map<number, FctDataColumnAvailabilityByEpoch[]>();
  for (const item of data) {
    if (item.epoch === undefined) continue;
    if (!byEpoch.has(item.epoch)) {
      byEpoch.set(item.epoch, []);
    }
    byEpoch.get(item.epoch)!.push(item);
  }

  // Convert to rows (sorted by epoch ascending)
  return Array.from(byEpoch.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([epoch, items]) => {
      const identifier = String(epoch);
      const cells = items
        .sort((a, b) => (a.column_index ?? 0) - (b.column_index ?? 0))
        .map(item => ({
          identifier,
          columnIndex: item.column_index ?? 0,
          availability: (item.avg_availability_pct ?? 0) / 100,
          successCount: item.total_success_count,
          totalCount: item.total_probe_count,
          avgResponseTimeMs: item.avg_p50_response_time_ms,
        }));

      return {
        identifier,
        label: String(epoch),
        cells: ensureAllColumns(cells, identifier),
      };
    });
}

/**
 * Transform slot data to heatmap rows
 * @param data - Slot availability data from API
 */
export function transformSlotsToRows(data: FctDataColumnAvailabilityBySlot[] | undefined): DataAvailabilityRow[] {
  if (!data) return [];

  // Group by slot
  const bySlot = new Map<number, FctDataColumnAvailabilityBySlot[]>();
  for (const item of data) {
    if (item.slot === undefined) continue;
    if (!bySlot.has(item.slot)) {
      bySlot.set(item.slot, []);
    }
    bySlot.get(item.slot)!.push(item);
  }

  // Convert to rows (sorted by slot ascending)
  return Array.from(bySlot.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([slot, items]) => {
      const identifier = String(slot);

      // Get blob count from the first item (same for all columns in a slot)
      const blobCount = items[0]?.blob_count ?? 0;
      const hasNoBlobs = blobCount === 0;

      const cells = items
        .sort((a, b) => (a.column_index ?? 0) - (b.column_index ?? 0))
        .map(item => ({
          identifier,
          columnIndex: item.column_index ?? 0,
          availability: (item.availability_pct ?? 0) / 100,
          successCount: item.success_count,
          totalCount: item.probe_count,
          avgResponseTimeMs: item.p50_response_time_ms,
        }));

      return {
        identifier,
        label: String(slot),
        cells: ensureAllColumns(cells, identifier),
        disabled: hasNoBlobs,
        disabledReason: hasNoBlobs ? 'No blobs in this slot' : undefined,
      };
    });
}
