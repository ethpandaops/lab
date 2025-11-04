import { useMemo } from 'react';
import type { FctBlockDataColumnSidecarFirstSeenByNode } from '@/api/types.gen';

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
 * @param dataColumnNodes - Raw API response from fct_block_data_column_sidecar_first_seen_by_node
 * @returns Object with firstSeenData and blobCount
 */
export function useDataColumnAvailabilityData(dataColumnNodes: FctBlockDataColumnSidecarFirstSeenByNode[]): {
  firstSeenData: DataColumnFirstSeenPoint[];
  blobCount: number;
} {
  const firstSeenData = useMemo<DataColumnFirstSeenPoint[]>(() => {
    // Group by column_index and find earliest seen time for each
    const columnMap = new Map<number, number>();

    dataColumnNodes.forEach(node => {
      const columnId = node.column_index ?? 0;
      const time = node.seen_slot_start_diff ?? 0;

      const existingTime = columnMap.get(columnId);
      if (existingTime === undefined || time < existingTime) {
        columnMap.set(columnId, time);
      }
    });

    // Convert to array format
    return Array.from(columnMap.entries())
      .map(([columnId, time]) => ({
        columnId,
        time,
      }))
      .sort((a, b) => a.columnId - b.columnId);
  }, [dataColumnNodes]);

  // Extract blob count from row_count field (should be the same across all nodes for a slot)
  const blobCount = useMemo<number>(() => {
    if (dataColumnNodes.length === 0) return 0;
    // Get row_count from first node (should be consistent across all nodes)
    return dataColumnNodes[0]?.row_count ?? 0;
  }, [dataColumnNodes]);

  return {
    firstSeenData,
    blobCount,
  };
}
