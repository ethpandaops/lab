import { type JSX } from 'react';
import { ChartBarIcon, HashtagIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { ViewMode } from '../DataAvailabilityHeatmap/DataAvailabilityHeatmap.types';

interface ViewModeToggleProps {
  /** Current view mode */
  viewMode: ViewMode;
  /** Callback when view mode changes */
  onViewModeChange: (mode: ViewMode) => void;
  /** Size variant */
  size?: 'default' | 'compact';
}

/**
 * Toggle component for switching between percentage and threshold view modes
 *
 * - Percentage: Traditional success rate (successCount / totalCount)
 * - Threshold: Count-based view showing if successCount meets threshold
 */
export function ViewModeToggle({ viewMode, onViewModeChange, size = 'default' }: ViewModeToggleProps): JSX.Element {
  const isCompact = size === 'compact';

  return (
    <div className={clsx('flex items-center', isCompact ? 'gap-1' : 'gap-1.5')}>
      <button
        type="button"
        onClick={() => onViewModeChange('percentage')}
        className={clsx(
          'flex items-center gap-1 rounded-xs px-2 py-1 transition-colors',
          isCompact ? 'text-xs/4' : 'text-sm/6',
          viewMode === 'percentage'
            ? 'bg-accent/10 font-medium text-accent'
            : 'text-muted hover:bg-surface hover:text-foreground'
        )}
        title="Percentage view: Shows success rate (success / total)"
      >
        <ChartBarIcon className={isCompact ? 'size-3.5' : 'size-4'} />
        <span>%</span>
      </button>
      <button
        type="button"
        onClick={() => onViewModeChange('threshold')}
        className={clsx(
          'flex items-center gap-1 rounded-xs px-2 py-1 transition-colors',
          isCompact ? 'text-xs/4' : 'text-sm/6',
          viewMode === 'threshold'
            ? 'bg-accent/10 font-medium text-accent'
            : 'text-muted hover:bg-surface hover:text-foreground'
        )}
        title="Threshold view: Shows if observation count meets threshold"
      >
        <HashtagIcon className={isCompact ? 'size-3.5' : 'size-4'} />
        <span>Count</span>
      </button>
    </div>
  );
}
