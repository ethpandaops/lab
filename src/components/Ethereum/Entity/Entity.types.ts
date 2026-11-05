export interface EntityProps {
  /**
   * The entity name to display
   */
  entity: string | null | undefined;

  /**
   * Text shown in place of the entity name, such as a group's display name
   */
  label?: string;

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
