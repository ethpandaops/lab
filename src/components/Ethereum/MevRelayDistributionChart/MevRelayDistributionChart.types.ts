/**
 * Data point containing MEV relay information
 */
export interface MevRelayDataPoint {
  /** Relay name/identifier */
  relay: string | null;
  /** Optional additional context (e.g., slot, epoch, block number) */
  context?: number;
}

/**
 * MevRelayDistributionChart component props
 */
export interface MevRelayDistributionChartProps {
  /**
   * Array of data points containing relay information
   * Each point should have a relay field (null for non-MEV blocks)
   */
  data: MevRelayDataPoint[];
  /**
   * Unit name for the count axis (e.g., "Blocks", "Slots", "Proposals")
   * @default "Blocks"
   */
  countAxisName?: string;
  /**
   * Maximum number of top relays to display
   * @default 10
   */
  topN?: number;
  /**
   * Chart title
   * @default "Relay Distribution"
   */
  title?: string;
  /**
   * Chart subtitle - will auto-generate if not provided
   */
  subtitle?: string;
  /**
   * Chart height in pixels
   */
  height?: number;
  /**
   * Anchor ID for deep linking
   */
  anchorId?: string;
  /**
   * Whether chart is displayed in modal (affects sizing)
   */
  inModal?: boolean;
  /**
   * Modal size when using PopoutCard
   */
  modalSize?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}
