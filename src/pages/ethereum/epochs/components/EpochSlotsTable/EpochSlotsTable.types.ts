import type { SlotData } from '../../hooks/useEpochDetailData.types';

/**
 * Props for the EpochSlotsTable component
 */
export interface EpochSlotsTableProps {
  /**
   * Array of slot data to display in the table
   */
  slots: SlotData[];
}
