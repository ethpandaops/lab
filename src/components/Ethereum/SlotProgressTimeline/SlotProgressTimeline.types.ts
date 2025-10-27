import type { ComponentType } from 'react';

/**
 * Phase data for the slot progress timeline
 */
export interface PhaseData {
  /** Unique identifier for this phase */
  id: string;
  /** Display name for this phase */
  label: string;
  /** Heroicon component for this phase */
  icon: ComponentType<{ className?: string }>;
  /** Semantic color token (e.g., 'primary', 'success', 'accent') */
  color: string;
  /** When this phase occurred (milliseconds from slot start, 0-12000) */
  timestamp?: number;
  /** How long this phase took (milliseconds) */
  duration?: number;
  /** Description of what happens in this phase */
  description: string;
  /** Optional data to display (e.g., "43 builders bidded") */
  stats?: string;
  /** Computed: whether this phase is currently active (calculated based on currentTime) */
  isActive?: boolean;
  /** Computed: whether this phase has completed (calculated based on currentTime) */
  isCompleted?: boolean;
}

/**
 * Timeline mode configuration
 */
export type TimelineMode = 'live' | 'static';

/**
 * Props for the SlotProgressTimeline component
 */
export interface SlotProgressTimelineProps {
  /** Array of phase data to display */
  phases: PhaseData[];
  /** Timeline mode: 'live' shows progress animation, 'static' shows all completed */
  mode: TimelineMode;
  /** Current time in milliseconds from slot start (0-12000). Required for live mode. */
  currentTime?: number;
  /** Whether to show statistics below each phase node (default: true) */
  showStats?: boolean;
  /** Optional callback when a phase is clicked */
  onPhaseClick?: (phase: PhaseData) => void;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Props for the PhaseNode sub-component
 */
export interface PhaseNodeProps {
  /** Phase data to display */
  phase: PhaseData;
  /** Current state of this phase node */
  status: 'pending' | 'active' | 'completed';
  /** Whether to show stats below the node */
  showStats?: boolean;
  /** Optional click handler */
  onClick?: () => void;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Props for the PhaseConnection sub-component
 */
export interface PhaseConnectionProps {
  /** Progress percentage (0-100) for this connection */
  progress: number;
  /** Layout orientation */
  orientation: 'horizontal' | 'vertical';
  /** Whether this connection is active (for styling) */
  isActive?: boolean;
  /** Optional CSS class name */
  className?: string;
}

/**
 * Props for the TimelineAxis sub-component
 */
export interface TimelineAxisProps {
  /** Layout orientation */
  orientation: 'horizontal' | 'vertical';
  /** Total duration in milliseconds (default: 12000) */
  totalDuration?: number;
  /** Number of tick marks to show (default: 7 for 0s, 2s, 4s, 6s, 8s, 10s, 12s) */
  tickCount?: number;
  /** Optional CSS class name */
  className?: string;
}
