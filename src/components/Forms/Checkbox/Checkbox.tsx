import { useEffect, useRef } from 'react';
import type { CheckboxProps } from './Checkbox.types';

export function Checkbox({ indeterminate = false, className = '', id, ...props }: CheckboxProps): React.JSX.Element {
  const checkboxRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`group grid size-4 grid-cols-1 ${className}`}>
      <input
        ref={checkboxRef}
        id={checkboxId}
        type="checkbox"
        className="col-start-1 row-start-1 appearance-none rounded-sm border border-border bg-background checked:border-primary checked:bg-primary indeterminate:border-primary indeterminate:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:border-border disabled:bg-surface disabled:checked:bg-surface dark:border-zinc-600 dark:bg-zinc-950 dark:checked:border-primary dark:checked:bg-primary dark:indeterminate:border-primary dark:indeterminate:bg-primary dark:focus-visible:outline-primary dark:disabled:border-zinc-800 dark:disabled:bg-zinc-900 dark:disabled:checked:bg-zinc-900 forced-colors:appearance-auto"
        {...props}
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
  );
}
