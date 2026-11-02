export interface ValidatorProps {
  /**
   * The validator index to display
   */
  index: number;

  /**
   * If true, renders as plain text without a link
   * @default false
   */
  noLink?: boolean;

  /**
   * Optional className for styling
   */
  className?: string;
}
