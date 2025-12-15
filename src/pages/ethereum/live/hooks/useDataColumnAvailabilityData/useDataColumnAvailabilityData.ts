import { useMemo } from 'react';
import type { FctBlockDataColumnSidecarFirstSeen } from '@/api/types.gen';

export interface DataColumnFirstSeenPoint {
  columnId: number;
  time: number;
  color?: string;
}

/**
 * Hook to transform data column sidecar API data into visualization-ready format
 *
 * Takes raw API data and returns:
 * - firstSeenData: Array of earliest seen time per column
 * - blobCount: Number of blobs (row_count from the data)
 *
 * @param dataColumnRecords - Raw API response from fct_block_data_column_sidecar_first_seen (aggregated per column)
 * @returns Object with firstSeenData and blobCount
 */
export function useDataColumnAvailabilityData(dataColumnRecords: FctBlockDataColumnSidecarFirstSeen[]): {
  firstSeenData: DataColumnFirstSeenPoint[];
  blobCount: number;
} {
  const firstSeenData = useMemo<DataColumnFirstSeenPoint[]>(() => {
    // Each record represents the first seen time for a column (already aggregated)
    return dataColumnRecords
      .map(record => ({
        columnId: record.column_index ?? 0,
        time: record.seen_slot_start_diff ?? 0,
      }))
      .sort((a, b) => a.columnId - b.columnId);
  }, [dataColumnRecords]);

  // Extract blob count from row_count field (should be the same across all records for a slot)
  const blobCount = useMemo<number>(() => {
    if (dataColumnRecords.length === 0) return 0;
    // Get row_count from first record (should be consistent across all records)
    return dataColumnRecords[0]?.row_count ?? 0;
  }, [dataColumnRecords]);

  return {
    firstSeenData,
    blobCount,
  };
}
