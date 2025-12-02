import { type JSX, useState } from 'react';
import { Dialog } from '@/components/Overlays/Dialog';
import { Button } from '@/components/Elements/Button';
import { Input } from '@/components/Forms/Input';
import { SelectMenu } from '@/components/Forms/SelectMenu';
import { FunnelIcon, XMarkIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';

export type FilterValues = {
  result?: string;
  prober?: string;
  peer?: string;
  peerId?: string; // Stored as string to preserve BigInt precision
  nodeId?: string;
  proberCountry?: string;
  peerCountry?: string;
  proberCity?: string;
  peerCity?: string;
  proberVersion?: string;
  peerVersion?: string;
  proberAsn?: number;
  peerAsn?: number;
  slot?: number;
  column?: number;
};

type FilterPanelProps = {
  filters: FilterValues;
  onFiltersChange: (filters: FilterValues) => void;
  onClearAll: () => void;
};

const RESULT_OPTIONS = [
  { value: '', label: 'All Results' },
  { value: 'success', label: 'Success' },
  { value: 'failure', label: 'Failure' },
  { value: 'missing', label: 'Missing' },
];

/**
 * Get human-readable label for a filter key
 */
function getFilterLabel(key: string): string {
  const labels: Record<string, string> = {
    result: 'Result',
    prober: 'Prober',
    peer: 'Peer',
    peerId: 'Peer ID',
    nodeId: 'Node ID',
    proberCountry: 'Prober Country',
    peerCountry: 'Peer Country',
    proberCity: 'Prober City',
    peerCity: 'Peer City',
    proberVersion: 'Prober Version',
    peerVersion: 'Peer Version',
    proberAsn: 'Prober ASN',
    peerAsn: 'Peer ASN',
    slot: 'Slot',
    column: 'Column',
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

export function FilterPanel({ filters, onFiltersChange, onClearAll }: FilterPanelProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<FilterValues>(filters);

  // Count active filters
  const activeFilterCount = Object.values(filters).filter(v => v !== undefined && v !== '' && v !== null).length;

  // Get active filters as array for chips
  const activeFilters = Object.entries(filters).filter(
    ([, value]) => value !== undefined && value !== '' && value !== null
  ) as [keyof FilterValues, string | number][];

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
            <span className="text-primary-foreground rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold">
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
                  value={value}
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
            <span>Filter Probes</span>
          </div>
        }
        description="Apply filters to narrow down probe results"
        size="xl"
      >
        <div className="space-y-4">
          {/* Top row: Result and Data filters */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <h4 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Result</h4>
              <SelectMenu
                value={draftFilters.result || ''}
                onChange={(v: string) => updateDraft('result', v)}
                options={RESULT_OPTIONS}
                placeholder="All Results"
              />
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Slot</h4>
              <Input size="sm">
                <Input.Field
                  type="number"
                  value={draftFilters.slot || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateDraft('slot', e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="Slot number"
                />
              </Input>
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Column</h4>
              <Input size="sm">
                <Input.Field
                  type="number"
                  value={draftFilters.column || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateDraft('column', e.target.value ? Number(e.target.value) : undefined)
                  }
                  placeholder="Column index"
                />
              </Input>
            </div>
          </div>

          {/* Main content: Prober and Peer side by side */}
          <div className="grid grid-cols-2 gap-6">
            {/* Prober Section */}
            <div className="space-y-3 rounded-lg border border-border bg-background p-3">
              <h4 className="text-xs font-semibold tracking-wider text-primary uppercase">Prober</h4>
              <div className="space-y-2">
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted">Client</label>
                  <Input size="sm">
                    <Input.Field
                      type="text"
                      value={draftFilters.prober || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateDraft('prober', e.target.value)}
                      placeholder="e.g. lighthouse"
                    />
                  </Input>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted">Node ID</label>
                  <Input size="sm">
                    <Input.Field
                      type="text"
                      value={draftFilters.nodeId || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateDraft('nodeId', e.target.value)}
                      placeholder="Node identifier"
                    />
                  </Input>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted">Version</label>
                  <Input size="sm">
                    <Input.Field
                      type="text"
                      value={draftFilters.proberVersion || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        updateDraft('proberVersion', e.target.value)
                      }
                      placeholder="Version string"
                    />
                  </Input>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-medium text-muted">Country</label>
                    <Input size="sm">
                      <Input.Field
                        type="text"
                        value={draftFilters.proberCountry || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateDraft('proberCountry', e.target.value)
                        }
                        placeholder="Country"
                      />
                    </Input>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-medium text-muted">City</label>
                    <Input size="sm">
                      <Input.Field
                        type="text"
                        value={draftFilters.proberCity || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateDraft('proberCity', e.target.value)}
                        placeholder="City"
                      />
                    </Input>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted">ASN</label>
                  <Input size="sm">
                    <Input.Field
                      type="number"
                      value={draftFilters.proberAsn || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        updateDraft('proberAsn', e.target.value ? Number(e.target.value) : undefined)
                      }
                      placeholder="AS number"
                    />
                  </Input>
                </div>
              </div>
            </div>

            {/* Peer Section */}
            <div className="space-y-3 rounded-lg border border-border bg-background p-3">
              <h4 className="text-xs font-semibold tracking-wider text-primary uppercase">Peer</h4>
              <div className="space-y-2">
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted">Client</label>
                  <Input size="sm">
                    <Input.Field
                      type="text"
                      value={draftFilters.peer || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateDraft('peer', e.target.value)}
                      placeholder="e.g. prysm"
                    />
                  </Input>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted">Peer ID</label>
                  <Input size="sm">
                    <Input.Field
                      type="text"
                      value={draftFilters.peerId || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateDraft('peerId', e.target.value)}
                      placeholder="Peer unique key"
                    />
                  </Input>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted">Version</label>
                  <Input size="sm">
                    <Input.Field
                      type="text"
                      value={draftFilters.peerVersion || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateDraft('peerVersion', e.target.value)}
                      placeholder="Version string"
                    />
                  </Input>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-medium text-muted">Country</label>
                    <Input size="sm">
                      <Input.Field
                        type="text"
                        value={draftFilters.peerCountry || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          updateDraft('peerCountry', e.target.value)
                        }
                        placeholder="Country"
                      />
                    </Input>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-medium text-muted">City</label>
                    <Input size="sm">
                      <Input.Field
                        type="text"
                        value={draftFilters.peerCity || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateDraft('peerCity', e.target.value)}
                        placeholder="City"
                      />
                    </Input>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-medium text-muted">ASN</label>
                  <Input size="sm">
                    <Input.Field
                      type="number"
                      value={draftFilters.peerAsn || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        updateDraft('peerAsn', e.target.value ? Number(e.target.value) : undefined)
                      }
                      placeholder="AS number"
                    />
                  </Input>
                </div>
              </div>
            </div>
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
