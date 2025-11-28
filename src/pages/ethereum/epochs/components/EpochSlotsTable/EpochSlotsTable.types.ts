import type { SlotData } from '../../hooks/useEpochDetailData.types';

/**
 * Props for the EpochSlotsTable component
 */
export interface EpochSlotsTableProps {
  /**
   * Array of slot data to display in the table
   */
  slots: SlotData[];
  /**
   * Whether to show the "Slot in Epoch" column
   * @default true
   */
  showSlotInEpoch?: boolean;
  /**
   * Whether to enable real-time slot highlighting (current slot, future slots)
   * When false, prevents re-renders every 12 seconds for historical data views
   * @default true
   */
  enableRealtimeHighlighting?: boolean;
  /**
   * Sort order for slots
   * @default 'asc' - ascending (oldest first) for epoch detail, 'desc' for recent blocks
   */
  sortOrder?: 'asc' | 'desc';
}
