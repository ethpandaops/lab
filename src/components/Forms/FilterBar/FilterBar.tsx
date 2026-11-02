import { type Dispatch, type JSX, type ReactNode, type SetStateAction, useState } from 'react';
import clsx from 'clsx';
import { AdjustmentsHorizontalIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '@/components/Elements/Button';
import { Input } from '@/components/Forms/Input';
import { Dialog } from '@/components/Overlays/Dialog';

/** One active filter shown as a removable chip */
export interface FilterChipItem {
  id: string;
  label: string;
  value: ReactNode;
  onRemove: () => void;
}

export interface FilterBarProps<T extends object> {
  /** Applied filters */
  filters: T;
  /** Called with the new filters on apply, chip removal and clear all */
  onChange: (filters: T) => void;
  /** Active filters as chips */
  chips: FilterChipItem[];
  /** Dialog title */
  title: string;
  /** Dialog fields, editing a draft that applies on submit */
  children: (draft: T, setDraft: Dispatch<SetStateAction<T>>) => ReactNode;
  className?: string;
}

/**
 * Filters button with the active filters as removable chips and a clear all, opening a dialog that edits a draft
 * of the filters and applies it on submit.
 */
export function FilterBar<T extends object>({
  filters,
  onChange,
  chips,
  title,
  children,
  className,
}: FilterBarProps<T>): JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<T>(filters);

  const open = (): void => {
    setDraft(filters);
    setIsOpen(true);
  };

  return (
    <>
      <div className={clsx('flex flex-wrap items-center gap-2', className)}>
        <Button variant="soft" size="sm" onClick={open} className="gap-1.5">
          <FunnelIcon className="size-4" />
          Filters
          {chips.length > 0 && (
            <span className="flex size-5 items-center justify-center rounded-xs bg-primary text-xs text-white">
              {chips.length}
            </span>
          )}
        </Button>
        {chips.length > 0 && (
          <>
            <div className="h-4 w-px bg-border" />
            {chips.map(chip => (
              <span
                key={chip.id}
                className="inline-flex items-center gap-1 rounded-xs border border-primary/30 bg-primary/10 py-0.5 pr-0.5 pl-2 text-xs text-primary"
              >
                <span className="font-medium">{chip.label}:</span>
                <span className="inline-flex items-center gap-1 tabular-nums">{chip.value}</span>
                <button
                  type="button"
                  onClick={chip.onRemove}
                  aria-label={`Remove ${chip.label} filter`}
                  className="rounded-xs p-0.5 transition-colors hover:bg-primary/20"
                >
                  <XMarkIcon className="size-3" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => onChange({} as T)}
              className="text-xs text-muted transition-colors hover:text-foreground"
            >
              Clear all
            </button>
          </>
        )}
      </div>

      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={
          <span className="flex items-center gap-2">
            <AdjustmentsHorizontalIcon className="size-5 text-primary" />
            {title}
          </span>
        }
        size="lg"
        allowContentOverflow
      >
        <form
          className="flex flex-col gap-5"
          onSubmit={event => {
            event.preventDefault();
            onChange(draft);
            setIsOpen(false);
          }}
        >
          {children(draft, setDraft)}
          <div className="flex items-center justify-between border-t border-border pt-4">
            <Button variant="blank" size="sm" onClick={() => setDraft({} as T)}>
              Clear all
            </Button>
            <div className="flex gap-2">
              <Button variant="soft" size="sm" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit">
                Apply
              </Button>
            </div>
          </div>
        </form>
      </Dialog>
    </>
  );
}

/** Labelled group of fields inside the filter dialog */
export function FilterField({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-xs font-semibold text-muted">{label}</legend>
      {children}
    </fieldset>
  );
}

export interface FilterRangeProps {
  label: string;
  min: number | undefined;
  max: number | undefined;
  onChange: (min: number | undefined, max: number | undefined) => void;
  /** Unit shown inside both inputs */
  unit?: string;
  step?: number;
}

/** Min and max number inputs for one range filter, an empty input meaning no bound */
export function FilterRange({ label, min, max, onChange, unit, step }: FilterRangeProps): JSX.Element {
  const field = (
    bound: 'Min' | 'Max',
    value: number | undefined,
    set: (value: number | undefined) => void
  ): JSX.Element => (
    <Input size="sm">
      <Input.Field
        type="number"
        min={0}
        step={step ?? 'any'}
        inputMode={step !== undefined && step >= 1 ? 'numeric' : 'decimal'}
        aria-label={`${label} ${bound.toLowerCase()}`}
        placeholder={bound}
        value={value ?? ''}
        onChange={event => set(event.target.value === '' ? undefined : Number(event.target.value))}
      />
      {unit && (
        <Input.Trailing type="text">
          <span className="text-xs text-muted">{unit}</span>
        </Input.Trailing>
      )}
    </Input>
  );
  return (
    <FilterField label={label}>
      <div className="grid grid-cols-2 gap-2">
        {field('Min', min, value => onChange(value, max))}
        {field('Max', max, value => onChange(min, value))}
      </div>
    </FilterField>
  );
}

export interface FilterToggleProps {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}

/** Pressable pill for one option of a multi-choice filter */
export function FilterToggle({ selected, onClick, children }: FilterToggleProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={clsx(
        'inline-flex h-8 items-center gap-1.5 rounded-sm border px-3 text-xs font-medium transition-colors',
        selected
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-surface text-muted hover:border-primary/40 hover:text-foreground'
      )}
    >
      {children}
    </button>
  );
}
