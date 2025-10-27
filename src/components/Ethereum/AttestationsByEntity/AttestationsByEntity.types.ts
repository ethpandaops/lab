export interface EntityCountItem {
  /**
   * Entity name (e.g., staking provider name)
   */
  entity: string;
  /**
   * Count/value for this entity
   */
  count: number;
}

export interface AttestationsByEntityProps {
  /**
   * Entity data to display (already filtered and sorted)
   */
  data: EntityCountItem[];
  /**
   * Chart title
   * @default "Attestations by Entity"
   */
  title?: string;
  /**
   * Optional subtitle (e.g., total count summary)
   */
  subtitle?: string;
  /**
   * Anchor ID for scroll navigation and popout
   * @default "attestations-by-entity"
   */
  anchorId?: string;
  /**
   * Chart orientation
   * @default "horizontal"
   */
  orientation?: 'horizontal' | 'vertical';
  /**
   * Bar width
   * @default "60%"
   */
  barWidth?: string | number;
  /**
   * Empty state message
   * @default "No data available"
   */
  emptyMessage?: string;
}
