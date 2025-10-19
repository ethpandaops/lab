export interface NavPanelProps {
  /**
   * Whether the panel is open
   */
  isOpen: boolean;
  /**
   * Callback when the panel should close
   */
  onClose: () => void;
  /**
   * Whether to show the network selector
   * @default false
   */
  showNetworkSelector?: boolean;
  /**
   * Whether to show breadcrumbs
   * @default true
   */
  showBreadcrumbs?: boolean;
  /**
   * Whether to show navigation links
   * @default true
   */
  showNavLinks?: boolean;
  /**
   * Whether to show network summary
   * @default false
   */
  showNetworkSummary?: boolean;
}
