/**
 * AlgorithmicArt Component Types
 *
 * Defines types for the blockchain-inspired algorithmic art component
 */

/**
 * Theme colors for the algorithmic art
 */
export interface AlgorithmicArtColors {
  /** Primary color for main elements */
  primary: string;
  /** Background color */
  background: string;
  /** Accent color for highlights */
  accent: string;
  /** Foreground/text color */
  foreground: string;
  /** Muted color for secondary elements */
  muted: string;
}

/**
 * Props for the AlgorithmicArt component
 */
export interface AlgorithmicArtProps {
  /** Height of the canvas in pixels (default: 600) */
  height?: number;
  /** Width of the canvas (default: '100%' - responsive) */
  width?: string | number;
  /** Seed for reproducible randomness */
  seed?: number;
  /** Theme colors to use in the visualization */
  colors?: AlgorithmicArtColors;
  /** Additional CSS class names */
  className?: string;
  /** Animation speed multiplier (default: 1) */
  speed?: number;
  /** Whether to show overlay text */
  showOverlay?: boolean;
  /** Overlay title text */
  overlayTitle?: string;
  /** Overlay subtitle text */
  overlaySubtitle?: string;
}
