import { type JSX, useMemo, useState } from 'react';
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react';
import { ChevronUpDownIcon, XMarkIcon } from '@heroicons/react/16/solid';
import { entityLabel, type EntityOption } from '../../utils/client-share';

export interface EntityFilterProps {
  /** Selected entity, undefined for all */
  value?: string;
  onChange: (entity: string | undefined) => void;
  /** Entities to pick from, largest first */
  options: EntityOption[];
  disabled?: boolean;
}

/** Matches beyond this are left for the search box to narrow down */
const MAX_VISIBLE = 100;

/**
 * Searchable entity selector for the filter bar, with each entity's active validator count.
 */
export function EntityFilter({ value, onChange, options, disabled = false }: EntityFilterProps): JSX.Element {
  const [search, setSearch] = useState('');

  const matches = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter(option => (option.label ?? option.entity).toLowerCase().includes(term));
  }, [options, search]);

  return (
    <Combobox
      value={value ?? null}
      onChange={(entity: string | null) => onChange(entity ?? undefined)}
      onClose={() => setSearch('')}
      disabled={disabled}
      immediate
    >
      <div className="relative w-full sm:w-60">
        <ComboboxInput
          aria-label="Entity"
          placeholder="All entities"
          displayValue={(entity: string | null) => (entity ? entityLabel(entity) : '')}
          onChange={event => setSearch(event.target.value)}
          className="h-8 w-full rounded-sm border border-border bg-surface pr-14 pl-2.5 text-sm text-foreground transition-colors placeholder:text-foreground hover:border-primary/40 focus:border-primary/50 focus:outline-hidden disabled:cursor-not-allowed disabled:opacity-50"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            aria-label="Clear entity filter"
            className="absolute inset-y-0 right-7 flex items-center px-1 text-muted hover:text-foreground"
          >
            <XMarkIcon className="size-4" />
          </button>
        )}
        <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2" aria-label="Show entities">
          <ChevronUpDownIcon aria-hidden="true" className="size-4 text-muted" />
        </ComboboxButton>
      </div>

      <ComboboxOptions
        anchor="bottom start"
        transition
        className="z-[9999] mt-1 w-[max(var(--input-width),20rem)] overflow-auto rounded-sm border border-border bg-surface shadow-lg backdrop-blur-xl [--anchor-max-height:18rem] empty:invisible data-leave:transition data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0"
      >
        {matches.length === 0 && search.trim() !== '' && (
          <div className="px-3 py-2 text-sm text-muted">No entity matches &ldquo;{search.trim()}&rdquo;</div>
        )}
        {matches.slice(0, MAX_VISIBLE).map(option => (
          <ComboboxOption
            key={option.entity}
            value={option.entity}
            className="flex cursor-pointer items-center justify-between gap-3 px-2.5 py-1.5 text-sm text-foreground select-none data-focus:bg-primary/10 data-focus:text-primary data-selected:text-primary"
          >
            <span className="truncate" title={option.label ?? option.entity}>
              {option.label ?? option.entity}
            </span>
            <span className="shrink-0 text-xs text-muted tabular-nums">
              {option.validators.toLocaleString()} validators
            </span>
          </ComboboxOption>
        ))}
        {matches.length > MAX_VISIBLE && (
          <div className="px-3 py-2 text-xs text-muted">
            {(matches.length - MAX_VISIBLE).toLocaleString()} more, type to narrow down
          </div>
        )}
      </ComboboxOptions>
    </Combobox>
  );
}
