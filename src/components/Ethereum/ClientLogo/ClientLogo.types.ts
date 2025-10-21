export interface ClientLogoProps {
  /**
   * Consensus client name (e.g., "lighthouse", "prysm", "teku")
   */
  client: string;
  /**
   * Size of the logo (default: 20px)
   */
  size?: number;
  /**
   * Additional CSS classes
   */
  className?: string;
}
