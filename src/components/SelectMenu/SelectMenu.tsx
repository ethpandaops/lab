import { type JSX } from 'react';
import { clsx } from 'clsx';
import { Label, Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/16/solid';
import type { SelectMenuProps } from './SelectMenu.types';

/**
 * Generic select menu component using Headless UI Listbox.
 *
 * Features:
 * - Fully accessible keyboard navigation
 * - Dark mode support
 * - Optional icons for each option
 * - Customizable styling
 * - Type-safe with TypeScript generics
 *
 * @example
 * ```tsx
 * const options = [
 *   { value: 'us', label: 'United States', icon: <FlagIcon /> },
 *   { value: 'ca', label: 'Canada', icon: <FlagIcon /> },
 * ];
 *
 * <SelectMenu
 *   value={selectedCountry}
 *   onChange={setSelectedCountry}
 *   options={options}
 *   label="Country"
 *   showLabel
 * />
 * ```
 */
export function SelectMenu<T>({
  value,
  onChange,
  options,
  showLabel = false,
  label,
  placeholder = 'Select...',
  className = '',
  disabled = false,
  expandToFit = false,
}: SelectMenuProps<T>): JSX.Element {
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      {showLabel && label && <Label className="block text-sm/6 font-medium text-primary">{label}</Label>}
      <div className={clsx('relative', showLabel && 'mt-2', className)}>
        <ListboxButton
          className={clsx(
            'border-default relative cursor-pointer rounded-lg border bg-surface/30 py-2 pr-10 pl-3 text-left shadow-sm backdrop-blur-sm transition-colors hover:bg-surface/50 disabled:cursor-not-allowed disabled:opacity-50',
            expandToFit ? 'w-auto min-w-[140px]' : 'w-full'
          )}
          data-disabled={disabled || undefined}
        >
          <span className="flex items-center gap-2">
            {selectedOption?.icon && (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center">{selectedOption.icon}</span>
            )}
            <span className={clsx('block font-mono', expandToFit ? 'whitespace-nowrap' : 'truncate')}>
              {selectedOption?.label ?? placeholder}
            </span>
          </span>
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon aria-hidden="true" className="h-5 w-5 text-tertiary" />
          </span>
        </ListboxButton>

        <ListboxOptions
          transition
          className={clsx(
            'border-subtle border-default absolute z-[9999] mt-1 max-h-60 overflow-auto rounded-lg border bg-surface py-1 shadow-lg data-leave:transition data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0',
            expandToFit ? 'w-max min-w-full' : 'w-full'
          )}
        >
          {options.map((option, index) => (
            <ListboxOption
              key={index}
              value={option.value}
              className="relative cursor-pointer bg-surface py-2 pr-9 pl-3 font-mono select-none data-focus:bg-hover data-focus:text-accent data-not-focus:text-primary data-selected:text-accent"
            >
              <span className="flex items-center gap-2">
                {option.icon && (
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center">{option.icon}</span>
                )}
                <span className={clsx('block', expandToFit ? 'whitespace-nowrap' : 'truncate')}>{option.label}</span>
              </span>
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
