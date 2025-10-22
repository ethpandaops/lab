export interface ClientOption {
  /**
   * Client implementation name (e.g., "lighthouse", "prysm", "teku")
   */
  name: string;
  /**
   * Number of nodes running this client
   */
  count: number;
}

export interface ClientSelectProps {
  /**
   * Currently selected client name or "all"
   */
  value: string;
  /**
   * Callback when client selection changes
   */
  onChange: (value: string) => void;
  /**
   * Available client implementations with their counts
   */
  clients: ClientOption[];
  /**
   * Whether to show the label (default: true)
   */
  showLabel?: boolean;
  /**
   * Custom label text (default: "Client Implementation")
   */
  label?: string;
  /**
   * Whether to expand the select menu to fit its content (default: false)
   */
  expandToFit?: boolean;
}
