export interface EntityProps {
  /**
   * The entity name to display
   */
  entity: string | null | undefined;

  /**
   * If true, renders as plain text without a link
   * @default false
   */
  noLink?: boolean;

  /**
   * Additional CSS classes to apply
   */
  className?: string;
}
