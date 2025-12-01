import { useMemo } from 'react';
import { GridHeatmap } from '@/components/Charts/GridHeatmap';
import type { GridRow } from '@/components/Charts/GridHeatmap';
import { DataAvailabilityCell } from './DataAvailabilityCell';
import { DataAvailabilityLegend } from './DataAvailabilityLegend';
import type { DataAvailabilityHeatmapProps, DataAvailabilityCellData } from './DataAvailabilityHeatmap.types';

/**
 * Data availability heatmap visualization with granularity-aware filtering and drill-down.
 *
 * This page-specific component wraps the generic GridHeatmap with DA-specific:
 * - Filtering logic (column groups, observations, availability)
 * - Cell rendering (DataAvailabilityCell with granularity-aware tooltips)
 * - Legend display
 * - Response time labeling
 * - View mode support (percentage vs threshold)
 *
 * Supports hierarchical drill-down from days → hours → epochs → slots → blobs.
 */
export const DataAvailabilityHeatmap = ({
  rows,
  granularity,
  filters,
  viewMode = 'percentage',
  threshold = 30,
  selectedColumnIndex,
  onCellClick,
  onRowClick,
  onClearColumnSelection,
  onBack,
  cellSize = 'xs',
  showColumnHeader = true,
  showLegend = true,
  className,
}: DataAvailabilityHeatmapProps): React.JSX.Element => {
  /**
   * Apply DA-specific filters to rows and cells
   */
  const filteredRows = useMemo(() => {
    return rows.map(row => {
      const filteredCells = row.cells.filter(cell => {
        // Filter by column group (0-3 for 128 columns ÷ 32)
        const columnGroup = Math.floor(cell.columnIndex / 32);
        if (!filters.columnGroups.has(columnGroup)) {
          return false;
        }

        // Filter by observation count
        const observationCount = cell.totalCount ?? 0;
        if (observationCount < filters.minObservationCount) {
          return false;
        }

        // Filter by availability percentage (only if cell has data)
        const hasData = observationCount > 0;
        if (hasData) {
          const availabilityPercent = cell.availability * 100;
          if (availabilityPercent < filters.minAvailability || availabilityPercent > filters.maxAvailability) {
            return false;
          }
        }

        return true;
      });

      return {
        ...row,
        cells: filteredCells,
      };
    });
  }, [rows, filters]);

  /**
   * Convert DA rows to generic grid format
   */
  const gridRows: GridRow<DataAvailabilityCellData>[] = useMemo(
    () =>
      filteredRows.map(row => ({
        identifier: row.identifier,
        label: row.label,
        cells: row.cells.map(cell => ({
          columnIndex: cell.columnIndex,
          data: cell,
        })),
      })),
    [filteredRows]
  );

  return (
    <GridHeatmap
      rows={gridRows}
      cellSize={cellSize}
      showColumnHeader={showColumnHeader}
      selectedColumn={selectedColumnIndex}
      onCellClick={onCellClick}
      onRowClick={onRowClick}
      onClearColumnSelection={onClearColumnSelection}
      onBack={onBack}
      renderCell={(cellData, props) => (
        <DataAvailabilityCell
          data={cellData}
          granularity={granularity}
          viewMode={viewMode}
          threshold={threshold}
          {...props}
        />
      )}
      renderHeader={
        showLegend
          ? () => <DataAvailabilityLegend granularity={granularity} viewMode={viewMode} threshold={threshold} />
          : undefined
      }
      className={className}
    />
  );
};
