export interface BlockArtProps {
  /**
   * Width of the canvas in pixels
   * @default 180
   */
  width?: number;
  /**
   * Height of the canvas in pixels
   * @default 180
   */
  height?: number;
  /**
   * Custom primary color (overrides theme)
   */
  primaryColor?: string;
  /**
   * Custom accent color (overrides theme)
   */
  accentColor?: string;
  /**
   * Custom glow color (overrides theme)
   */
  glowColor?: string;
  /**
   * Block data hash (affects procedural generation)
   */
  blockHash?: string;
  /**
   * Block number (affects visual variations)
   * @default 0
   */
  blockNumber?: number;
}
