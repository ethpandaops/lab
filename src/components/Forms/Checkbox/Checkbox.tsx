import { Checkbox as HeadlessCheckbox } from '@headlessui/react';
import type { CheckboxProps } from './Checkbox.types';

export function Checkbox({
  indeterminate = false,
  className = '',
  id,
  checked,
  defaultChecked,
  onChange,
  disabled,
  name,
  value,
  rounded = false,
  ...props
}: CheckboxProps): React.JSX.Element {
  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <HeadlessCheckbox
      id={checkboxId}
      checked={checked}
      defaultChecked={defaultChecked}
      onChange={onChange}
      disabled={disabled}
      indeterminate={indeterminate}
      name={name}
      value={value}
      className={`group relative inline-flex size-4 items-center justify-center ${rounded ? 'rounded-sm' : ''} border border-border bg-background transition-colors data-[checked]:border-primary data-[checked]:bg-primary data-[disabled]:border-border data-[disabled]:bg-surface data-[disabled]:data-[checked]:bg-surface data-[focus]:outline-2 data-[focus]:outline-offset-2 data-[focus]:outline-primary data-[indeterminate]:border-primary data-[indeterminate]:bg-primary dark:border-zinc-600 dark:bg-zinc-950 dark:data-[checked]:border-primary dark:data-[checked]:bg-primary dark:data-[disabled]:border-zinc-800 dark:data-[disabled]:bg-zinc-900 dark:data-[disabled]:data-[checked]:bg-zinc-900 dark:data-[focus]:outline-primary dark:data-[indeterminate]:border-primary dark:data-[indeterminate]:bg-primary ${className}`}
      {...props}
    >
      <svg
        fill="none"
        viewBox="0 0 14 14"
        className="pointer-events-none size-3.5 stroke-white data-[disabled]:stroke-gray-950/25 dark:data-[disabled]:stroke-white/25"
      >
        <path
          d="M3 8L6 11L11 3.5"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-0 group-data-[checked]:opacity-100 group-data-[indeterminate]:opacity-0"
        />
        <path
          d="M3 7H11"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-0 group-data-[indeterminate]:opacity-100"
        />
      </svg>
    </HeadlessCheckbox>
  );
}
