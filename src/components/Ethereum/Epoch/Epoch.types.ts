export interface EpochProps {
  /**
   * The epoch number to display
   */
  epoch: number;

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
