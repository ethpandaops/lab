import { type JSX } from 'react';
import { clsx } from 'clsx';
import { BlobPosterLogo } from '@/components/Ethereum/BlobPosterLogo';
import { BoltIcon, CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import type { FilterValues } from './FilterPanel';

/**
 * Quick filter preset definition
 */
type QuickFilterPreset = {
  id: string;
  label: string;
  description?: string;
  icon?: JSX.Element;
  blobPosterLogos?: string[];
  filters: Partial<FilterValues>;
};

/**
 * Check if a preset is currently active based on current filters
 */
function isPresetActive(preset: QuickFilterPreset, currentFilters: FilterValues): boolean {
  const presetFilters = preset.filters;

  // Check blobPosters specifically (array comparison)
  if (presetFilters.blobPosters) {
    const current = currentFilters.blobPosters ?? [];
    const preset = presetFilters.blobPosters;
    if (current.length !== preset.length) return false;
    const sortedCurrent = [...current].sort();
    const sortedPreset = [...preset].sort();
    if (!sortedCurrent.every((v, i) => v === sortedPreset[i])) return false;
  } else if (currentFilters.blobPosters?.length) {
    return false;
  }

  // Check result filter
  if (presetFilters.result !== undefined) {
    if (currentFilters.result !== presetFilters.result) return false;
  } else if (currentFilters.result !== undefined) {
    return false;
  }

  return true;
}

/**
 * Top L2s by blob usage (most active blob posters)
 */
const TOP_L2S = [
  'Base',
  'Arbitrum One',
  'OP Mainnet',
  'Scroll',
  'Linea',
  'ZkSync Era',
  'Taiko',
  'World Chain',
  'Lighter',
  'Ink',
  'Mantle',
];

/**
 * Quick filter presets
 */
const PRESETS: QuickFilterPreset[] = [
  {
    id: 'top-l2s',
    label: 'Top L2s',
    blobPosterLogos: ['base', 'arbitrum', 'optimism', 'scroll'],
    filters: {
      blobPosters: TOP_L2S,
    },
  },
  {
    id: 'failures',
    label: 'Failures Only',
    icon: <XCircleIcon className="size-4 text-warning" />,
    filters: {
      result: 'failure',
    },
  },
  {
    id: 'missing',
    label: 'Missing Data',
    description: 'Show probes where peer did not have the data',
    icon: <ExclamationTriangleIcon className="size-4 text-danger" />,
    filters: {
      result: 'missing',
    },
  },
  {
    id: 'successes',
    label: 'Successes Only',
    icon: <CheckCircleIcon className="size-4 text-success" />,
    filters: {
      result: 'success',
    },
  },
];

type QuickFiltersProps = {
  currentFilters: FilterValues;
  onApplyPreset: (filters: Partial<FilterValues>) => void;
  onClearFilters: () => void;
};

/**
 * Quick filter presets for common filter combinations
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
                'inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-xs font-medium transition-colors',
                isActive
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-surface text-muted hover:border-primary/40 hover:text-foreground'
              )}
            >
              {preset.blobPosterLogos ? (
                <span className="flex items-center -space-x-1">
                  {preset.blobPosterLogos.slice(0, 4).map(logo => (
                    <BlobPosterLogo key={logo} poster={logo} size={14} className="ring-1 ring-background" />
                  ))}
                </span>
              ) : (
                preset.icon
              )}
              <span>{preset.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
