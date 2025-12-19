import { type JSX, useState } from 'react';
import { Dialog } from '@/components/Overlays/Dialog';
import { Button } from '@/components/Elements/Button';
import { Input } from '@/components/Forms/Input';
import { SelectMenu } from '@/components/Forms/SelectMenu';
import { Toggle } from '@/components/Forms/Toggle';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { FunnelIcon, XMarkIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';
import type { FilterValues } from '../../IndexPage.types';
import { ENGINE_STATUS_VALUES, DEFAULT_DURATION_MIN } from '../../IndexPage.types';

type FilterPanelProps = {
  filters: FilterValues;
  onFiltersChange: (filters: FilterValues) => void;
  onClearAll: () => void;
};

/**
 * Get human-readable label for a filter key
 */
function getFilterLabel(key: string): string {
  const labels: Record<string, string> = {
    durationMin: 'Duration',
    gasUsedMin: 'Gas Used',
    txCountMin: 'Tx Count',
    status: 'Status',
    elClient: 'EL Client',
    slot: 'Slot',
    blockNumber: 'Block',
    referenceNodes: 'Reference Nodes',
  };
  return labels[key] || key;
}

/**
 * Format filter value for display in chip
 */
function formatFilterValue(key: string, value: string | number | boolean): string {
  if (key === 'durationMin' && typeof value === 'number') {
    return `≥${value}ms`;
  }
  if (key === 'gasUsedMin' && typeof value === 'number') {
    return `≥${formatNumber(value)}`;
  }
  if (key === 'txCountMin' && typeof value === 'number') {
    return `≥${value}`;
  }
  if (key === 'referenceNodes' && typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value);
}

/**
 * Format large numbers with M/K suffix
 */
function formatNumber(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toString();
}

/**
 * Filter chip for displaying active filters
 */
function FilterChip({
  label,
  value,
  onRemove,
}: {
  label: string;
  value: string | number | boolean;
  onRemove: () => void;
}): JSX.Element {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary">
      <span className="font-medium">{label}:</span>
      <span className="max-w-32 truncate">{value}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-primary/20"
      >
        <XMarkIcon className="size-3" />
      </button>
    </span>
  );
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  ...ENGINE_STATUS_VALUES.map(s => ({ value: s, label: s })),
];

const EL_CLIENT_OPTIONS = [
  { value: '', label: 'All Clients' },
  { value: 'go-ethereum', label: 'Geth', icon: <ClientLogo client="geth" size={20} /> },
  { value: 'Nethermind', label: 'Nethermind', icon: <ClientLogo client="nethermind" size={20} /> },
  { value: 'Besu', label: 'Besu', icon: <ClientLogo client="besu" size={20} /> },
  { value: 'erigon', label: 'Erigon', icon: <ClientLogo client="erigon" size={20} /> },
  { value: 'Reth', label: 'Reth', icon: <ClientLogo client="reth" size={20} /> },
];

/**
 * Slider input with label
 */
function SliderField({
  label,
  value,
  displayValue,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  displayValue: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}): JSX.Element {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="text-[10px] font-medium text-muted">{label}</label>
        <span className="text-xs font-medium text-foreground">{displayValue}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full cursor-pointer appearance-none rounded-sm bg-transparent focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:transition-colors [&::-moz-range-thumb]:hover:bg-primary/80 [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-sm [&::-moz-range-track]:bg-border [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-sm [&::-webkit-slider-runnable-track]:bg-border [&::-webkit-slider-thumb]:-mt-1 [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:transition-colors [&::-webkit-slider-thumb]:hover:bg-primary/80"
      />
    </div>
  );
}

export function FilterPanel({ filters, onFiltersChange, onClearAll }: FilterPanelProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<FilterValues>(filters);

  // Count active filters (threshold filters only count if > 0, referenceNodes only if false)
  const activeFilterCount = Object.entries(filters).filter(([key, v]) => {
    if (v === undefined || v === null || v === '') return false;
    // Threshold filters only count if > 0
    if (key === 'durationMin' || key === 'gasUsedMin' || key === 'txCountMin') {
      return typeof v === 'number' && v > 0;
    }
    // Reference nodes only counts if explicitly false (since true is default)
    if (key === 'referenceNodes') {
      return v === false;
    }
    return true;
  }).length;

  // Get active filters as array for chips
  const activeFilters = Object.entries(filters).filter(([key, value]) => {
    if (value === undefined || value === null || value === '') return false;
    // Threshold filters only show if > 0
    if (key === 'durationMin' || key === 'gasUsedMin' || key === 'txCountMin') {
      return typeof value === 'number' && value > 0;
    }
    // Reference nodes only shows if explicitly false
    if (key === 'referenceNodes') {
      return value === false;
    }
    return true;
  }) as [keyof FilterValues, string | number | boolean][];

  const handleOpen = (): void => {
    setDraftFilters(filters);
    setIsOpen(true);
  };

  const handleApply = (): void => {
    onFiltersChange(draftFilters);
    setIsOpen(false);
  };

  const handleClear = (): void => {
    setDraftFilters({});
  };

  const handleRemoveFilter = (key: keyof FilterValues): void => {
    const newFilters = { ...filters };
    delete newFilters[key];
    onFiltersChange(newFilters);
  };

  const updateDraft = (key: keyof FilterValues, value: string | number | boolean | undefined): void => {
    setDraftFilters(prev => ({
      ...prev,
      [key]: value === '' ? undefined : value,
    }));
  };

  return (
    <>
      {/* Filter button and active filters bar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="soft" size="sm" onClick={handleOpen} className="gap-1.5">
          <FunnelIcon className="size-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="text-primary-foreground flex size-5 items-center justify-center rounded-full bg-primary text-xs">
              {activeFilterCount}
            </span>
          )}
        </Button>

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <>
            <div className="h-4 w-px bg-border" />
            <div className="flex flex-wrap items-center gap-1.5">
              {activeFilters.map(([key, value]) => (
                <FilterChip
                  key={key}
                  label={getFilterLabel(key)}
                  value={formatFilterValue(key, value)}
                  onRemove={() => handleRemoveFilter(key)}
                />
              ))}
              <button
                type="button"
                onClick={onClearAll}
                className="text-xs text-muted transition-colors hover:text-foreground"
              >
                Clear all
              </button>
            </div>
          </>
        )}
      </div>

      {/* Filter dialog */}
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <AdjustmentsHorizontalIcon className="size-5 text-primary" />
            <span>Filter Slow Blocks</span>
          </div>
        }
        description="Apply filters to narrow down slow block results"
        size="xl"
        allowContentOverflow
      >
        <div className="space-y-4">
          {/* Top row: Status and Client filters */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Status</h4>
              <SelectMenu
                value={draftFilters.status ?? ''}
                onChange={value => updateDraft('status', value)}
                options={STATUS_OPTIONS}
                rounded
              />
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">EL Client</h4>
              <SelectMenu
                value={draftFilters.elClient ?? ''}
                onChange={value => updateDraft('elClient', value)}
                options={EL_CLIENT_OPTIONS}
                rounded
              />
            </div>
          </div>

          {/* Slot and Block number filters */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Slot</h4>
              <Input size="sm">
                <Input.Field
                  type="number"
                  value={draftFilters.slot ?? ''}
                  onChange={e => updateDraft('slot', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Slot number"
                />
              </Input>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Block</h4>
              <Input size="sm">
                <Input.Field
                  type="number"
                  value={draftFilters.blockNumber ?? ''}
                  onChange={e => updateDraft('blockNumber', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="Block number"
                />
              </Input>
            </div>
          </div>

          {/* Thresholds section */}
          <div className="space-y-3 rounded-lg border border-border bg-background p-4">
            <h4 className="text-xs font-semibold tracking-wider text-primary uppercase">Thresholds</h4>
            <div className="grid grid-cols-3 gap-6">
              <SliderField
                label="Duration"
                value={draftFilters.durationMin ?? DEFAULT_DURATION_MIN}
                displayValue={`${draftFilters.durationMin ?? DEFAULT_DURATION_MIN}ms`}
                min={0}
                max={5000}
                step={100}
                onChange={value => updateDraft('durationMin', value)}
              />
              <SliderField
                label="Gas Used"
                value={draftFilters.gasUsedMin ?? 0}
                displayValue={formatNumber(draftFilters.gasUsedMin ?? 0)}
                min={0}
                max={60_000_000}
                step={1_000_000}
                onChange={value => updateDraft('gasUsedMin', value || undefined)}
              />
              <SliderField
                label="Tx Count"
                value={draftFilters.txCountMin ?? 0}
                displayValue={String(draftFilters.txCountMin ?? 0)}
                min={0}
                max={800}
                step={50}
                onChange={value => updateDraft('txCountMin', value || undefined)}
              />
            </div>
          </div>

          {/* Reference Nodes toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-background p-4">
            <div>
              <h4 className="text-sm font-medium text-foreground">Reference Nodes Only</h4>
              <p className="text-xs text-muted">Show only observations from EIP-7870 reference block builder nodes</p>
            </div>
            <Toggle
              checked={draftFilters.referenceNodes ?? true}
              onChange={value => updateDraft('referenceNodes', value)}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-border pt-4">
            <Button variant="blank" size="sm" onClick={handleClear}>
              Clear all
            </Button>
            <div className="flex gap-2">
              <Button variant="soft" size="sm" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleApply}>
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
}
