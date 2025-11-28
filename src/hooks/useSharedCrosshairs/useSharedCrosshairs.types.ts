import type { SyncGroup } from '@/contexts/SharedCrosshairsContext';

/**
 * Parameters for the useSharedCrosshairs hook
 */
export interface UseSharedCrosshairsParams {
  /**
   * The sync group identifier - charts with the same group will share crosshairs
   */
  syncGroup?: SyncGroup;
}
