import type { DataAvailabilityGranularity } from '@/pages/ethereum/data-availability/components/DataAvailabilityHeatmap';

/**
 * Information about the clicked cell for probe filtering
 * Can be a specific cell (row + column) or just a column (when clicking column header)
 */
export interface CellContext {
  /** Row identifier (date, hour timestamp, epoch, slot, or blob index depending on granularity) - optional for column-only mode */
  rowIdentifier?: string;
  /** Column index (0-127) */
  columnIndex: number;
  /** Current granularity level */
  granularity: DataAvailabilityGranularity;
  /** Row label for display - optional for column-only mode */
  rowLabel?: string;
  /** Whether this is a column-only view (clicked on column header, not a specific cell) */
  isColumnOnly?: boolean;
  /** Custom context label for display (used for column-only mode to show parent context) */
  contextLabel?: string;
}

/**
 * Time range context passed from the parent page
 */
export interface TimeRangeContext {
  /** Start of the time period (Unix timestamp in seconds) */
  timeStart?: number;
  /** End of the time period (Unix timestamp in seconds) */
  timeEnd?: number;
  /** Specific slot (for epoch/slot granularity) */
  slot?: number;
  /** Specific slots (for epoch granularity - all slots in that epoch) */
  slots?: number[];
}

/**
 * Props for the CellProbeDialog component
 */
export interface CellProbeDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when the dialog is closed */
  onClose: () => void;
  /** Cell context with row/column information */
  cellContext: CellContext | null;
  /** Time range context for API queries */
  timeRangeContext: TimeRangeContext | null;
}
