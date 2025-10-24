export interface BlockArtProps {
  /**
   * Width of the canvas in pixels
   * @default 400
   */
  width?: number;
  /**
   * Height of the canvas in pixels
   * @default 400
   */
  height?: number;
  /**
   * Enable auto-rotation animation
   * @default true
   */
  autoRotate?: boolean;
  /**
   * Rotation speed (radians per frame)
   * @default 0.01
   */
  rotationSpeed?: number;
  /**
   * Enable particle effects around the block
   * @default true
   */
  showParticles?: boolean;
  /**
   * Number of particles to render
   * @default 50
   */
  particleCount?: number;
  /**
   * Enable glowing edges effect
   * @default true
   */
  glowingEdges?: boolean;
  /**
   * Block size multiplier
   * @default 1
   */
  blockSize?: number;
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
   * Animation speed multiplier
   * @default 1
   */
  animationSpeed?: number;
  /**
   * Enable floating animation
   * @default true
   */
  floatingAnimation?: boolean;
  /**
   * Block data hash (affects procedural generation)
   */
  blockHash?: string;
  /**
   * Block number (affects visual variations)
   */
  blockNumber?: number;
  /**
   * Transaction count (affects particle density)
   */
  transactionCount?: number;
}
