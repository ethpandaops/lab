export interface ClientLogoProps {
  /**
   * Consensus or execution client name (e.g., "lighthouse", "geth")
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
  /**
   * Render the logo without a link to the client page, e.g. inside buttons, selects, legends or other links
   */
  noLink?: boolean;
  /**
   * The client's name is already shown beside the logo, so the image needs no alt text
   */
  decorative?: boolean;
}
