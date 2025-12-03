import { type JSX, useState } from 'react';
import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { clsx } from 'clsx';
import { Dialog } from '@/components/Overlays/Dialog';
import { Button } from '@/components/Elements/Button';
import { Input } from '@/components/Forms/Input';
import { SelectMenu } from '@/components/Forms/SelectMenu';
import { FunnelIcon, XMarkIcon, AdjustmentsHorizontalIcon, CheckIcon } from '@heroicons/react/24/outline';
import { ChevronUpDownIcon } from '@heroicons/react/16/solid';
import { BlobPosterLogo, BLOB_POSTERS, BLOB_POSTER_DISPLAY_NAMES } from '@/components/Ethereum/BlobPosterLogo';

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
  blobPosters?: string[];
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
    blobPosters: 'Blob Posters',
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
  value: string | number | string[];
  onRemove: () => void;
}): JSX.Element {
  // Format display value for arrays
  const displayValue = Array.isArray(value) ? `${value.length} selected` : value;

  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs text-primary">
      <span className="font-medium">{label}:</span>
      <span className="max-w-32 truncate">{displayValue}</span>
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
  const activeFilterCount = Object.values(filters).filter(v => {
    if (v === undefined || v === null || v === '') return false;
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  }).length;

  // Get active filters as array for chips
  const activeFilters = Object.entries(filters).filter(([, value]) => {
    if (value === undefined || value === null || value === '') return false;
    if (Array.isArray(value) && value.length === 0) return false;
    return true;
  }) as [keyof FilterValues, string | number | string[]][];

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

  const updateDraft = (key: keyof FilterValues, value: string | number | string[] | undefined): void => {
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
          <div className="grid grid-cols-4 gap-4">
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
            <div>
              <h4 className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Blob Posters</h4>
              <Listbox
                value={draftFilters.blobPosters ?? []}
                onChange={(selected: string[]) =>
                  updateDraft('blobPosters', selected.length > 0 ? selected : undefined)
                }
                multiple
              >
                <div className="relative">
                  <ListboxButton className="relative w-full cursor-pointer border border-border bg-surface/50 py-2 pr-10 pl-3 text-left shadow-xs backdrop-blur-sm transition-all hover:border-primary/30 hover:bg-surface/70">
                    <span className="flex items-center gap-1">
                      {(draftFilters.blobPosters ?? []).length > 0 ? (
                        <>
                          {(draftFilters.blobPosters ?? []).slice(0, 3).map(poster => (
                            <BlobPosterLogo key={poster} poster={poster} size={16} />
                          ))}
                          {(draftFilters.blobPosters ?? []).length > 3 && (
                            <span className="text-xs text-muted">+{(draftFilters.blobPosters ?? []).length - 3}</span>
                          )}
                        </>
                      ) : (
                        <span className="text-sm text-muted">Select posters...</span>
                      )}
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronUpDownIcon aria-hidden="true" className="size-5 text-muted" />
                    </span>
                  </ListboxButton>
                  <ListboxOptions
                    transition
                    className="absolute z-[9999] mt-1 max-h-60 w-full overflow-auto border border-border bg-surface shadow-lg backdrop-blur-xl data-leave:transition data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0"
                  >
                    {BLOB_POSTERS.map(poster => {
                      const displayName = BLOB_POSTER_DISPLAY_NAMES[poster] ?? poster;
                      return (
                        <ListboxOption
                          key={poster}
                          value={displayName}
                          className="relative cursor-pointer py-1.5 pr-9 pl-3 text-foreground transition-colors select-none data-focus:bg-primary/10 data-focus:text-primary data-selected:bg-primary/5"
                        >
                          {({ selected }) => (
                            <>
                              <span className="flex items-center gap-2">
                                <BlobPosterLogo poster={poster} size={16} />
                                <span className={clsx('block truncate', selected && 'font-medium')}>{displayName}</span>
                              </span>
                              {selected && (
                                <span className="absolute inset-y-0 right-0 flex items-center pr-3 text-primary">
                                  <CheckIcon className="size-4" />
                                </span>
                              )}
                            </>
                          )}
                        </ListboxOption>
                      );
                    })}
                  </ListboxOptions>
                </div>
              </Listbox>
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
