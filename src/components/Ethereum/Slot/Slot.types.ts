export interface SlotProps {
  /**
   * The slot number to display
   */
  slot: number;

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
