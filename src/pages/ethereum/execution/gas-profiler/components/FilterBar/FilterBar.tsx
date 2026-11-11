import { type JSX, type ReactNode, useEffect, useState } from 'react';
import clsx from 'clsx';
import { AdjustmentsHorizontalIcon, FunnelIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/Elements/Button';
import { Input } from '@/components/Forms/Input';
import { Dialog } from '@/components/Overlays/Dialog';

/** One-click filter preset, shown as a toggle button */
export interface FilterPreset {
  id: string;
  label: string;
  icon?: ReactNode;
  /** Rows the preset would match on its own */
  count?: number;
  active: boolean;
  disabled?: boolean;
  onToggle: () => void;
}

/** An active filter, shown as a removable chip */
export interface ActiveFilterChip {
  id: string;
  label: string;
  value: string;
  onRemove: () => void;
}

export interface FilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  presets: FilterPreset[];
  chips: ActiveFilterChip[];
  onClearAll: () => void;
  /** Rows left after filtering */
  shownCount: number;
  totalCount: number;
  /** Plural noun for the count, e.g. "transactions" */
  noun: string;
  dialogTitle: string;
  /** Called before the dialog opens, to copy current filters into a draft */
  onDialogOpen: () => void;
  onDialogApply: () => void;
  onDialogReset: () => void;
  /** Dialog body: the draft filter controls */
  dialogContent: ReactNode;
  /** Extra controls on the right of the first row, e.g. sort */
  trailing?: ReactNode;
}

/**
 * Search, quick presets, a filter dialog and removable chips for client-side lists.
 * Matches the payloads page filter toolbar.
 */
export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder,
  presets,
  chips,
  onClearAll,
  shownCount,
  totalCount,
  noun,
  dialogTitle,
  onDialogOpen,
  onDialogApply,
  onDialogReset,
  dialogContent,
  trailing,
}: FilterBarProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [draftSearch, setDraftSearch] = useState(search);
  const [prevSearch, setPrevSearch] = useState(search);

  // Follow external changes (chip removal, clear all, back/forward)
  if (search !== prevSearch) {
    setPrevSearch(search);
    setDraftSearch(search);
  }

  // Commit typing after a short pause so every keystroke doesn't rewrite the URL
  useEffect(() => {
    if (draftSearch === search) return;
    const id = setTimeout(() => onSearchChange(draftSearch), 250);
    return () => clearTimeout(id);
  }, [draftSearch, search, onSearchChange]);

  const isFiltered = chips.length > 0 || search !== '';

  const handleOpen = (): void => {
    onDialogOpen();
    setIsOpen(true);
  };

  const handleApply = (): void => {
    onDialogApply();
    setIsOpen(false);
  };

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Input size="sm" wrapperClassName="w-full sm:w-72">
          <Input.Leading>
            <MagnifyingGlassIcon />
          </Input.Leading>
          <Input.Field
            type="search"
            value={draftSearch}
            onChange={e => setDraftSearch(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
        </Input>

        {presets.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {presets.map(preset => (
              <button
                key={preset.id}
                type="button"
                onClick={preset.onToggle}
                aria-pressed={preset.active}
                disabled={preset.disabled}
                className={clsx(
                  'inline-flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors',
                  preset.active
                    ? 'border-primary bg-primary-10 text-primary'
                    : 'border-border bg-surface text-foreground hover:border-primary-40',
                  'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border'
                )}
              >
                {preset.icon}
                <span>{preset.label}</span>
                {preset.count !== undefined && (
                  <span className={clsx('font-mono tabular-nums', preset.active ? 'text-primary' : 'text-muted')}>
                    {preset.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {trailing && <div className="ml-auto flex items-center gap-2">{trailing}</div>}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="soft" size="sm" onClick={handleOpen} className="gap-1.5">
          <FunnelIcon className="size-4" />
          Filters
          {chips.length > 0 && (
            <span className="flex size-5 items-center justify-center rounded-xs bg-primary text-xs text-on-fill">
              {chips.length}
            </span>
          )}
        </Button>

        {isFiltered && (
          <>
            <div className="h-4 w-px bg-border" />
            <div className="flex flex-wrap items-center gap-1.5">
              {chips.map(chip => (
                <span
                  key={chip.id}
                  className="inline-flex items-center gap-1 rounded-xs border border-primary-30 bg-primary-10 px-2 py-0.5 text-xs text-primary"
                >
                  <span className="font-medium">{chip.label}:</span>
                  <span className="max-w-48 truncate">{chip.value}</span>
                  <button
                    type="button"
                    onClick={chip.onRemove}
                    aria-label={`Remove ${chip.label} filter`}
                    className="ml-0.5 rounded-xs p-0.5 transition-colors hover:bg-primary-20"
                  >
                    <XMarkIcon className="size-3" />
                  </button>
                </span>
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

        <span className="ml-auto text-xs text-muted">
          {isFiltered ? (
            <>
              <span className="font-medium text-foreground tabular-nums">{shownCount}</span> of{' '}
              <span className="tabular-nums">{totalCount}</span> {noun}
            </>
          ) : (
            <>
              <span className="font-medium text-foreground tabular-nums">{totalCount}</span> {noun}
            </>
          )}
        </span>
      </div>

      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <AdjustmentsHorizontalIcon className="size-5 text-primary" />
            <span>{dialogTitle}</span>
          </div>
        }
        size="xl"
        allowContentOverflow
      >
        <div className="space-y-4">
          {dialogContent}

          <div className="flex items-center justify-between border-t border-border pt-4">
            <Button variant="blank" size="sm" onClick={onDialogReset}>
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
    </div>
  );
}

/** Labelled group inside the filter dialog */
export function FilterField({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold text-muted">{label}</h4>
      {children}
    </div>
  );
}

/** Min/max number inputs for a range filter */
export function RangeFields({
  min,
  max,
  onMinChange,
  onMaxChange,
}: {
  min?: number;
  max?: number;
  onMinChange: (value: number | undefined) => void;
  onMaxChange: (value: number | undefined) => void;
}): JSX.Element {
  const parse = (raw: string): number | undefined => (raw === '' ? undefined : Math.max(0, Number(raw)));
  return (
    <div className="grid grid-cols-2 gap-2">
      <Input size="sm">
        <Input.Field
          type="number"
          min={0}
          inputMode="numeric"
          value={min ?? ''}
          onChange={e => onMinChange(parse(e.target.value))}
          placeholder="Min"
          aria-label="Min"
        />
      </Input>
      <Input size="sm">
        <Input.Field
          type="number"
          min={0}
          inputMode="numeric"
          value={max ?? ''}
          onChange={e => onMaxChange(parse(e.target.value))}
          placeholder="Max"
          aria-label="Max"
        />
      </Input>
    </div>
  );
}
