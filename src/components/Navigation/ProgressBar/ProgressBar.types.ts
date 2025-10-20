export interface ProgressBarSegment {
  /** Label for this segment */
  label: string;
  /** Whether to show a vertical mark at this segment position */
  showMark?: boolean;
  /** Tailwind background color class for the mark (e.g., 'bg-red-500', 'bg-primary') */
  markColor?: string;
  /** Percentage when to activate this segment (0-100). If not provided, segments are evenly distributed */
  percentage?: number;
}

export interface ProgressBarProps {
  /** Progress percentage (0-100) */
  progress?: number;
  /** Status message displayed above the progress bar */
  statusMessage?: string;
  /** Optional segments to divide and mark the progress bar */
  segments?: ProgressBarSegment[];
  /** Optional aria-label for accessibility */
  ariaLabel?: string;
}
