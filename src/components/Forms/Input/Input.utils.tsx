import { type ReactNode } from 'react';
import { ChevronDownIcon } from '@heroicons/react/16/solid';
import clsx from 'clsx';
import type { InputSize, SelectAddonProps } from './Input.types';

/**
 * Style configuration object for Input components
 * Centralizes all Tailwind classes for consistency and maintainability
 */
export const getStyleConfig = (): {
  base: string;
  outline: {
    default: string;
    error: string;
  };
  size: Record<InputSize, string>;
} => ({
  base: clsx(
    'block w-full border-0 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-0',
    'disabled:cursor-not-allowed disabled:opacity-50',
    'read-only:cursor-default read-only:opacity-50',
    'dark:bg-white/5 dark:text-white dark:placeholder:text-gray-500'
  ),
  outline: {
    default: clsx(
      'outline-1 -outline-offset-1 outline-gray-300',
      'focus:outline-2 focus:-outline-offset-2 focus:outline-primary',
      'dark:outline-white/10 dark:focus:outline-primary'
    ),
    error: clsx(
      'text-danger outline-1 -outline-offset-1 outline-danger/50',
      'placeholder:text-danger/70 focus:outline-2 focus:-outline-offset-2 focus:outline-danger',
      'dark:text-danger dark:outline-danger/50 dark:placeholder:text-danger/70 dark:focus:outline-danger'
    ),
  },
  size: {
    sm: 'py-1.5 text-sm/6',
    md: 'py-1.5 text-base/6',
    lg: 'py-2 text-base/6',
  } as Record<InputSize, string>,
});

/**
 * Renders select dropdown
 *
 * @param select - The select configuration
 * @returns Rendered select dropdown or null
 */
export const renderSelect = (select: SelectAddonProps | undefined): ReactNode | null => {
  if (!select) return null;

  return (
    <div className="grid shrink-0 grid-cols-1 focus-within:relative">
      <select
        id={select.id}
        name={select.name}
        value={select.value}
        defaultValue={select.defaultValue}
        onChange={e => select.onChange?.(e.target.value)}
        aria-label={select['aria-label']}
        className={clsx(
          'col-start-1 row-start-1 w-full appearance-none border-0 py-1.5 pr-7 pl-3 text-base text-gray-500 placeholder:text-gray-400 sm:text-sm/6',
          'shadow-none outline-hidden focus:outline-hidden focus-visible:outline-hidden',
          'dark:bg-transparent dark:text-gray-400 dark:*:bg-gray-800 dark:placeholder:text-gray-500',
          select.className
        )}
      >
        {select.options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        aria-hidden="true"
        className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end text-gray-500 sm:size-4 dark:text-gray-400"
      />
    </div>
  );
};
