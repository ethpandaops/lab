import { type JSX } from 'react';
import { clsx } from 'clsx';
import { BoltIcon, ClockIcon, XCircleIcon, BeakerIcon } from '@heroicons/react/24/outline';
import type { FilterValues } from '../../IndexPage.types';
import { DEFAULT_DURATION_MIN } from '../../IndexPage.types';

/**
 * Quick filter preset definition
 */
type QuickFilterPreset = {
  id: string;
  label: string;
  description: string;
  icon?: JSX.Element;
  filters: Partial<FilterValues>;
};

/**
 * Check if a preset is currently active based on current filters
 */
function isPresetActive(preset: QuickFilterPreset, currentFilters: FilterValues): boolean {
  const presetFilters = preset.filters;

  // Check durationMin filter (use default if undefined)
  if (presetFilters.durationMin !== undefined) {
    const currentDuration = currentFilters.durationMin ?? DEFAULT_DURATION_MIN;
    if (currentDuration !== presetFilters.durationMin) return false;
  }

  // Check status filter
  if (presetFilters.status !== undefined) {
    if (currentFilters.status !== presetFilters.status) return false;
  }

  return true;
}

/**
 * Quick filter presets for slow blocks
 */
const PRESETS: QuickFilterPreset[] = [
  {
    id: 'slow-500ms',
    label: '500ms+',
    description: 'Blocks taking 500ms or longer to validate',
    icon: <ClockIcon className="size-4 text-yellow-500" />,
    filters: {
      durationMin: 500,
    },
  },
  {
    id: 'slow-1s',
    label: '1s+',
    description: 'Blocks taking 1 second or longer to validate',
    icon: <ClockIcon className="size-4 text-orange-500" />,
    filters: {
      durationMin: 1000,
    },
  },
  {
    id: 'failures',
    label: 'Failures',
    description: 'Show only INVALID or ERROR status',
    icon: <XCircleIcon className="size-4 text-red-500" />,
    filters: {
      status: 'INVALID,ERROR',
    },
  },
];

type QuickFiltersProps = {
  currentFilters: FilterValues;
  onApplyPreset: (filters: Partial<FilterValues>) => void;
  onClearFilters: () => void;
};

/**
 * Quick filter presets for common slow block filter combinations
 */
export function QuickFilters({ currentFilters, onApplyPreset, onClearFilters }: QuickFiltersProps): JSX.Element {
  const handlePresetClick = (preset: QuickFilterPreset): void => {
    // If this preset is already active, clear it
    if (isPresetActive(preset, currentFilters)) {
      onClearFilters();
    } else {
      // Apply the preset (replaces current filters)
      onApplyPreset(preset.filters);
    }
  };

  // Reference nodes is true by default
  const isReferenceNodesActive = currentFilters.referenceNodes ?? true;

  const handleReferenceNodesToggle = (): void => {
    onApplyPreset({ referenceNodes: !isReferenceNodesActive });
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <BoltIcon className="size-3.5" />
        <span className="font-medium">Quick:</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map(preset => {
          const isActive = isPresetActive(preset, currentFilters);
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetClick(preset)}
              title={preset.description}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all',
                isActive
                  ? 'text-primary-foreground bg-primary ring-2 ring-primary/30'
                  : 'bg-surface/50 text-muted ring-1 ring-border hover:bg-surface hover:text-foreground hover:ring-primary/30'
              )}
            >
              {preset.icon}
              <span>{preset.label}</span>
            </button>
          );
        })}
        {/* Reference Nodes toggle */}
        <button
          type="button"
          onClick={handleReferenceNodesToggle}
          title={isReferenceNodesActive ? 'Show all nodes' : 'Show only reference nodes'}
          className={clsx(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all',
            isReferenceNodesActive
              ? 'text-primary-foreground bg-primary ring-2 ring-primary/30'
              : 'bg-surface/50 text-muted ring-1 ring-border hover:bg-surface hover:text-foreground hover:ring-primary/30'
          )}
        >
          <BeakerIcon className="size-4" />
          <span>Reference</span>
        </button>
      </div>
    </div>
  );
}
