export interface EpochArtProps {
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
   * Epoch number (affects visual variations and seed)
   * @default 0
   */
  epochNumber?: number;
  /**
   * Number of filled slots out of 32 (affects visual representation)
   */
  filledSlots?: number;
}
