export interface NetworkSelectorProps {
  /**
   * Whether to show the label above the selector
   * @default true
   */
  showLabel?: boolean;

  /**
   * Custom label text
   * @default "Network"
   */
  label?: string;

  /**
   * Whether to expand the selector to fit the width of the container
   * @default false
   */
  expandToFit?: boolean;
}
