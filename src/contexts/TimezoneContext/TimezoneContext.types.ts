/**
 * Timezone mode for date/time display
 */
export type TimezoneMode = 'UTC' | 'local';

/**
 * Context value for timezone preferences
 */
export interface TimezoneContextValue {
  /**
   * Current timezone mode
   */
  timezone: TimezoneMode;

  /**
   * Toggle between UTC and local timezone
   */
  toggleTimezone: () => void;

  /**
   * Set specific timezone mode
   */
  setTimezone: (timezone: TimezoneMode) => void;
}
