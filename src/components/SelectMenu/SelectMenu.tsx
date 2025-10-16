import { type JSX } from 'react';
import { Label, Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import { ChevronUpDownIcon } from '@heroicons/react/16/solid';
import { CheckIcon } from '@heroicons/react/20/solid';
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
}: SelectMenuProps<T>): JSX.Element {
  const selectedOption = options.find(opt => opt.value === value);

  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      {showLabel && label && <Label className="block text-sm/6 font-medium text-slate-200">{label}</Label>}
      <div className={showLabel ? `relative mt-2 ${className}` : `relative ${className}`}>
        <ListboxButton
          className="grid w-full cursor-default grid-cols-1 rounded-md bg-slate-800/50 py-1.5 pr-2 pl-3 text-left text-slate-100 outline-1 -outline-offset-1 outline-slate-600/50 transition-all hover:bg-slate-800/70 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 sm:text-sm/6"
          data-disabled={disabled || undefined}
        >
          <span className="col-start-1 row-start-1 flex items-center gap-3 pr-6">
            {selectedOption?.icon && <span className="shrink-0">{selectedOption.icon}</span>}
            <span className="block truncate font-medium">{selectedOption?.label ?? placeholder}</span>
          </span>
          <ChevronUpDownIcon
            aria-hidden="true"
            className="col-start-1 row-start-1 size-5 self-center justify-self-end text-slate-400 sm:size-4"
          />
        </ListboxButton>

        <ListboxOptions
          transition
          className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-slate-800 py-1 text-base shadow-lg outline-1 outline-slate-700/50 data-leave:transition data-leave:duration-100 data-leave:ease-in data-closed:data-leave:opacity-0 sm:text-sm"
        >
          {options.map((option, index) => (
            <ListboxOption
              key={index}
              value={option.value}
              className="group relative cursor-default py-2 pr-9 pl-3 text-slate-100 select-none data-focus:bg-indigo-600 data-focus:text-white data-focus:outline-hidden"
            >
              <div className="flex items-center">
                {option.icon && <span className="shrink-0">{option.icon}</span>}
                <span
                  className={`block truncate font-normal group-data-selected:font-semibold ${option.icon ? 'ml-3' : ''}`}
                >
                  {option.label}
                </span>
              </div>

              <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-indigo-400 group-not-data-selected:hidden group-data-focus:text-white">
                <CheckIcon aria-hidden="true" className="size-5" />
              </span>
            </ListboxOption>
          ))}
        </ListboxOptions>
      </div>
    </Listbox>
  );
}
