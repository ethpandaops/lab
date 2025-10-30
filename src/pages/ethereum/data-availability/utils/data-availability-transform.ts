import type { DataAvailabilityRow } from '@/components/Charts/DataAvailabilityHeatmap';
import type {
  FctDataColumnAvailabilityDaily,
  FctDataColumnAvailabilityHourly,
  FctDataColumnAvailabilityByEpoch,
  FctDataColumnAvailabilityBySlot,
  FctDataColumnAvailabilityBySlotBlob,
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
  blobIndex?: number;
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
 */
export function transformDailyToRows(data: FctDataColumnAvailabilityDaily[] | undefined): DataAvailabilityRow[] {
  if (!data) return [];

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
  return Array.from(byDate.entries())
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, items]) => {
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

      return {
        identifier: date,
        label: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        cells: ensureAllColumns(cells, date),
      };
    });
}

/**
 * Transform hourly data to heatmap rows
 */
export function transformHourlyToRows(data: FctDataColumnAvailabilityHourly[] | undefined): DataAvailabilityRow[] {
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
      const hourLabel = new Date(hourStart * 1000).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
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
        label: hourLabel,
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
        label: `Epoch ${epoch}`,
        cells: ensureAllColumns(cells, identifier),
      };
    });
}

/**
 * Transform slot data to heatmap rows
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
        label: `Slot ${slot}`,
        cells: ensureAllColumns(cells, identifier),
      };
    });
}

/**
 * Transform blob data to heatmap rows
 */
export function transformBlobsToRows(data: FctDataColumnAvailabilityBySlotBlob[] | undefined): DataAvailabilityRow[] {
  if (!data) return [];

  // Group by blob_index
  const byBlob = new Map<number, FctDataColumnAvailabilityBySlotBlob[]>();
  for (const item of data) {
    if (item.blob_index === undefined) continue;
    if (!byBlob.has(item.blob_index)) {
      byBlob.set(item.blob_index, []);
    }
    byBlob.get(item.blob_index)!.push(item);
  }

  // Convert to rows (sorted by blob_index ascending)
  return Array.from(byBlob.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([blobIndex, items]) => {
      const identifier = String(blobIndex);
      const cells = items
        .sort((a, b) => (a.column_index ?? 0) - (b.column_index ?? 0))
        .map(item => ({
          identifier,
          columnIndex: item.column_index ?? 0,
          availability: (item.availability_pct ?? 0) / 100,
          successCount: item.success_count,
          totalCount: item.probe_count,
          avgResponseTimeMs: item.p50_response_time_ms,
          blobIndex,
        }));

      return {
        identifier,
        label: `Blob ${blobIndex}`,
        cells: ensureAllColumns(cells, identifier),
      };
    });
}
