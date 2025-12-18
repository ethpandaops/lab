import { type JSX, useState } from 'react';
import { Dialog } from '@/components/Overlays/Dialog';
import { Button } from '@/components/Elements/Button';
import { Input } from '@/components/Forms/Input';
import { SelectMenu } from '@/components/Forms/SelectMenu';
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import type { FilterValues } from '../../IndexPage.types';
import { ENGINE_STATUS_VALUES, BLOCK_STATUS_VALUES } from '../../IndexPage.types';

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
    durationMin: 'Min Duration',
    durationMax: 'Max Duration',
    status: 'Status',
    elClient: 'EL Client',
    clClient: 'CL Client',
    nodeName: 'Node Name',
    blockStatus: 'Block Status',
    slot: 'Slot',
  };
  return labels[key] || key;
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
  value: string | number;
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

const BLOCK_STATUS_OPTIONS = [
  { value: '', label: 'All Block Statuses' },
  ...BLOCK_STATUS_VALUES.map(s => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) })),
];

export function FilterPanel({ filters, onFiltersChange, onClearAll }: FilterPanelProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<FilterValues>(filters);

  // Count active filters (excluding duration since it's usually always set)
  const activeFilterCount = Object.entries(filters).filter(([key, v]) => {
    if (key === 'durationMin') return false; // Don't count default threshold
    if (v === undefined || v === null || v === '') return false;
    return true;
  }).length;

  // Get active filters as array for chips
  const activeFilters = Object.entries(filters).filter(([key, value]) => {
    if (key === 'durationMin') return false; // Don't show as chip
    if (value === undefined || value === null || value === '') return false;
    return true;
  }) as [keyof FilterValues, string | number][];

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

  const updateDraft = (key: keyof FilterValues, value: string | number | undefined): void => {
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
        {activeFilters.map(([key, value]) => (
          <FilterChip
            key={key}
            label={getFilterLabel(key)}
            value={key === 'durationMax' ? `${value}ms` : value}
            onRemove={() => handleRemoveFilter(key)}
          />
        ))}

        {/* Clear all button */}
        {activeFilterCount > 0 && (
          <Button variant="blank" size="sm" onClick={onClearAll} className="text-muted hover:text-foreground">
            Clear all
          </Button>
        )}
      </div>

      {/* Filter dialog */}
      <Dialog open={isOpen} onClose={() => setIsOpen(false)} title="Filter Slow Blocks">
        <div className="space-y-6 p-1">
          {/* Duration filters */}
          <div>
            <h4 className="mb-3 text-sm font-medium text-foreground">Duration (ms)</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Minimum">
                <Input.Field
                  type="number"
                  value={draftFilters.durationMin ?? ''}
                  onChange={e => updateDraft('durationMin', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="e.g., 500"
                />
              </Input>
              <Input label="Maximum">
                <Input.Field
                  type="number"
                  value={draftFilters.durationMax ?? ''}
                  onChange={e => updateDraft('durationMax', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="e.g., 2000"
                />
              </Input>
            </div>
          </div>

          {/* Status filter */}
          <div>
            <h4 className="mb-3 text-sm font-medium text-foreground">Status</h4>
            <SelectMenu
              label="Engine API Status"
              options={STATUS_OPTIONS}
              value={draftFilters.status ?? ''}
              onChange={value => updateDraft('status', value)}
            />
          </div>

          {/* Client filters */}
          <div>
            <h4 className="mb-3 text-sm font-medium text-foreground">Clients</h4>
            <div className="grid grid-cols-2 gap-4">
              <Input label="EL Client">
                <Input.Field
                  type="text"
                  value={draftFilters.elClient ?? ''}
                  onChange={e => updateDraft('elClient', e.target.value)}
                  placeholder="e.g., Geth"
                />
              </Input>
              <Input label="CL Client">
                <Input.Field
                  type="text"
                  value={draftFilters.clClient ?? ''}
                  onChange={e => updateDraft('clClient', e.target.value)}
                  placeholder="e.g., Lighthouse"
                />
              </Input>
            </div>
          </div>

          {/* Node name filter */}
          <div>
            <h4 className="mb-3 text-sm font-medium text-foreground">Node</h4>
            <Input label="Node Name">
              <Input.Field
                type="text"
                value={draftFilters.nodeName ?? ''}
                onChange={e => updateDraft('nodeName', e.target.value)}
                placeholder="e.g., ethpandaops-geth-1"
              />
            </Input>
          </div>

          {/* Block filters */}
          <div>
            <h4 className="mb-3 text-sm font-medium text-foreground">Block</h4>
            <div className="grid grid-cols-2 gap-4">
              <SelectMenu
                label="Block Status"
                options={BLOCK_STATUS_OPTIONS}
                value={draftFilters.blockStatus ?? ''}
                onChange={value => updateDraft('blockStatus', value)}
              />
              <Input label="Slot Number">
                <Input.Field
                  type="number"
                  value={draftFilters.slot ?? ''}
                  onChange={e => updateDraft('slot', e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="e.g., 1234567"
                />
              </Input>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-between gap-3 pt-2">
            <Button variant="blank" onClick={handleClear}>
              Clear Filters
            </Button>
            <div className="flex gap-2">
              <Button variant="soft" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleApply}>
                Apply Filters
              </Button>
            </div>
          </div>
        </div>
      </Dialog>
    </>
  );
}
