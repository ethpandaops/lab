import { useEffect, useRef } from 'react';
import type { CheckboxGroupProps } from './CheckboxGroup.types';

export function CheckboxGroup({
  legend,
  srOnlyLegend = false,
  options,
  variant = 'list',
  className = '',
  rounded = false,
}: CheckboxGroupProps): React.JSX.Element {
  // Refs for indeterminate state management
  const checkboxRefs = useRef<Map<string, HTMLInputElement>>(new Map());

  useEffect(() => {
    // Set indeterminate state for each checkbox
    options.forEach(option => {
      const checkbox = checkboxRefs.current.get(option.id);
      if (checkbox && option.indeterminate !== undefined) {
        checkbox.indeterminate = option.indeterminate;
      }
    });
  }, [options]);

  const setCheckboxRef = (id: string, element: HTMLInputElement | null): void => {
    if (element) {
      checkboxRefs.current.set(id, element);
    } else {
      checkboxRefs.current.delete(id);
    }
  };

  // Render checkbox based on variant
  const renderCheckbox = (option: (typeof options)[0]): React.JSX.Element | null => {
    const descriptionId = option.description ? `${option.id}-description` : undefined;

    switch (variant) {
      case 'list':
        return (
          <div key={option.id} className="flex gap-3">
            <div className="flex h-6 shrink-0 items-center">
              <div className="group grid size-4 grid-cols-1">
                <input
                  ref={el => setCheckboxRef(option.id, el)}
                  defaultChecked={option.defaultChecked}
                  checked={option.checked}
                  onChange={option.onChange}
                  id={option.id}
                  name={option.name}
                  type="checkbox"
                  disabled={option.disabled}
                  aria-describedby={descriptionId}
                  className={`col-start-1 row-start-1 appearance-none ${rounded ? 'rounded-sm' : ''} border border-border bg-background checked:border-primary checked:bg-primary indeterminate:border-primary indeterminate:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:border-border disabled:bg-surface disabled:checked:bg-surface dark:border-zinc-600 dark:bg-zinc-950 dark:checked:border-primary dark:checked:bg-primary dark:indeterminate:border-primary dark:indeterminate:bg-primary dark:focus-visible:outline-primary dark:disabled:border-zinc-800 dark:disabled:bg-zinc-900 dark:disabled:checked:bg-zinc-900 forced-colors:appearance-auto`}
                />
                <svg
                  fill="none"
                  viewBox="0 0 14 14"
                  className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-disabled:stroke-gray-950/25 dark:group-has-disabled:stroke-white/25"
                >
                  <path
                    d="M3 8L6 11L11 3.5"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-0 group-has-checked:opacity-100"
                  />
                  <path
                    d="M3 7H11"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-0 group-has-indeterminate:opacity-100"
                  />
                </svg>
              </div>
            </div>
            <div className="text-sm/6">
              <label htmlFor={option.id} className="font-medium text-foreground">
                {option.label}
              </label>
              {option.description && (
                <p id={descriptionId} className="text-muted">
                  {option.description}
                </p>
              )}
            </div>
          </div>
        );

      case 'list-inline':
        return (
          <div key={option.id} className="flex gap-3">
            <div className="flex h-6 shrink-0 items-center">
              <div className="group grid size-4 grid-cols-1">
                <input
                  ref={el => setCheckboxRef(option.id, el)}
                  defaultChecked={option.defaultChecked}
                  checked={option.checked}
                  onChange={option.onChange}
                  id={option.id}
                  name={option.name}
                  type="checkbox"
                  disabled={option.disabled}
                  aria-describedby={descriptionId}
                  className={`col-start-1 row-start-1 appearance-none ${rounded ? 'rounded-sm' : ''} border border-border bg-background checked:border-primary checked:bg-primary indeterminate:border-primary indeterminate:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:border-border disabled:bg-surface disabled:checked:bg-surface dark:border-zinc-600 dark:bg-zinc-950 dark:checked:border-primary dark:checked:bg-primary dark:indeterminate:border-primary dark:indeterminate:bg-primary dark:focus-visible:outline-primary dark:disabled:border-zinc-800 dark:disabled:bg-zinc-900 dark:disabled:checked:bg-zinc-900 forced-colors:appearance-auto`}
                />
                <svg
                  fill="none"
                  viewBox="0 0 14 14"
                  className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-disabled:stroke-gray-950/25 dark:group-has-disabled:stroke-white/25"
                >
                  <path
                    d="M3 8L6 11L11 3.5"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-0 group-has-checked:opacity-100"
                  />
                  <path
                    d="M3 7H11"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-0 group-has-indeterminate:opacity-100"
                  />
                </svg>
              </div>
            </div>
            <div className="text-sm/6">
              <label htmlFor={option.id} className="font-medium text-foreground">
                {option.label}
              </label>{' '}
              {option.description && (
                <span id={descriptionId} className="text-muted">
                  <span className="sr-only">{option.label} </span>
                  {option.description}
                </span>
              )}
            </div>
          </div>
        );

      case 'list-right':
        return (
          <div key={option.id} className="relative flex gap-3 pt-3.5 pb-4">
            <div className="min-w-0 flex-1 text-sm/6">
              <label htmlFor={option.id} className="font-medium text-foreground">
                {option.label}
              </label>
              {option.description && (
                <p id={descriptionId} className="text-muted">
                  {option.description}
                </p>
              )}
            </div>
            <div className="flex h-6 shrink-0 items-center">
              <div className="group grid size-4 grid-cols-1">
                <input
                  ref={el => setCheckboxRef(option.id, el)}
                  defaultChecked={option.defaultChecked}
                  checked={option.checked}
                  onChange={option.onChange}
                  id={option.id}
                  name={option.name}
                  type="checkbox"
                  disabled={option.disabled}
                  aria-describedby={descriptionId}
                  className={`col-start-1 row-start-1 appearance-none ${rounded ? 'rounded-sm' : ''} border border-border bg-background checked:border-primary checked:bg-primary indeterminate:border-primary indeterminate:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:border-border disabled:bg-surface disabled:checked:bg-surface dark:border-zinc-600 dark:bg-zinc-950 dark:checked:border-primary dark:checked:bg-primary dark:indeterminate:border-primary dark:indeterminate:bg-primary dark:focus-visible:outline-primary dark:disabled:border-zinc-800 dark:disabled:bg-zinc-900 dark:disabled:checked:bg-zinc-900 forced-colors:appearance-auto`}
                />
                <svg
                  fill="none"
                  viewBox="0 0 14 14"
                  className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-disabled:stroke-gray-950/25 dark:group-has-disabled:stroke-white/25"
                >
                  <path
                    d="M3 8L6 11L11 3.5"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-0 group-has-checked:opacity-100"
                  />
                  <path
                    d="M3 7H11"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-0 group-has-indeterminate:opacity-100"
                  />
                </svg>
              </div>
            </div>
          </div>
        );

      case 'simple':
        return (
          <div key={option.id} className="relative flex gap-3 py-4">
            <div className="min-w-0 flex-1 text-sm/6">
              <label htmlFor={option.id} className="font-medium text-foreground select-none">
                {option.label}
              </label>
            </div>
            <div className="flex h-6 shrink-0 items-center">
              <div className="group grid size-4 grid-cols-1">
                <input
                  ref={el => setCheckboxRef(option.id, el)}
                  defaultChecked={option.defaultChecked}
                  checked={option.checked}
                  onChange={option.onChange}
                  id={option.id}
                  name={option.name}
                  type="checkbox"
                  disabled={option.disabled}
                  className={`col-start-1 row-start-1 appearance-none ${rounded ? 'rounded-sm' : ''} border border-border bg-background checked:border-primary checked:bg-primary indeterminate:border-primary indeterminate:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:border-border disabled:bg-surface disabled:checked:bg-surface dark:border-zinc-600 dark:bg-zinc-950 dark:checked:border-primary dark:checked:bg-primary dark:indeterminate:border-primary dark:indeterminate:bg-primary dark:focus-visible:outline-primary dark:disabled:border-zinc-800 dark:disabled:bg-zinc-900 dark:disabled:checked:bg-zinc-900 forced-colors:appearance-auto`}
                />
                <svg
                  fill="none"
                  viewBox="0 0 14 14"
                  className="pointer-events-none col-start-1 row-start-1 size-3.5 self-center justify-self-center stroke-white group-has-disabled:stroke-gray-950/25 dark:group-has-disabled:stroke-white/25"
                >
                  <path
                    d="M3 8L6 11L11 3.5"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-0 group-has-checked:opacity-100"
                  />
                  <path
                    d="M3 7H11"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="opacity-0 group-has-indeterminate:opacity-100"
                  />
                </svg>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Get container classes based on variant
  const getContainerClasses = (): string => {
    switch (variant) {
      case 'list':
      case 'list-inline':
        return 'space-y-5';
      case 'list-right':
        return 'border-t border-b border-border divide-y divide-border';
      case 'simple':
        return 'mt-4 divide-y divide-border border-t border-b border-border';
      default:
        return '';
    }
  };

  return (
    <fieldset className={className}>
      {legend && (
        <legend className={srOnlyLegend ? 'sr-only' : 'text-base font-semibold text-foreground'}>{legend}</legend>
      )}
      <div className={getContainerClasses()}>{options.map(renderCheckbox)}</div>
    </fieldset>
  );
}
