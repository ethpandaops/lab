import { type JSX } from 'react';
import { Switch } from '@headlessui/react';
import clsx from 'clsx';
import type { ToggleProps } from './Toggle.types';

export function Toggle({
  checked,
  onChange,
  leftIcon,
  rightIcon,
  leftColor = 'text-muted',
  rightColor = 'text-muted',
  srLabel = 'Toggle',
  size = 'default',
  rounded = true,
}: ToggleProps): JSX.Element {
  // Size-specific classes
  const sizeClasses = {
    switch: size === 'small' ? 'h-6 w-12' : 'h-8 w-16',
    iconPadding: size === 'small' ? 'px-1' : 'px-1.5',
    backgroundIcon: size === 'small' ? 'size-4' : 'size-5',
    knob: size === 'small' ? 'size-5' : 'size-6',
    knobTranslate:
      size === 'small'
        ? 'translate-x-0.5 group-data-[checked]:translate-x-6.5'
        : 'translate-x-1 group-data-[checked]:translate-x-9',
    innerIcon: size === 'small' ? 'size-3' : 'size-4',
  };
  return (
    <Switch
      checked={checked}
      onChange={onChange}
      className={clsx(
        'group relative inline-flex shrink-0 cursor-pointer items-center',
        rounded && 'rounded-sm',
        'bg-border transition-colors duration-200 ease-in-out',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        'data-[checked]:bg-primary/30 dark:data-[checked]:bg-primary/40',
        sizeClasses.switch
      )}
    >
      <span className="sr-only">{srLabel}</span>

      {/* Background icons */}
      {(leftIcon || rightIcon) && (
        <span
          className={clsx(
            'pointer-events-none absolute inset-0 flex items-center justify-between',
            sizeClasses.iconPadding
          )}
        >
          {leftIcon && (
            <span className={clsx(leftColor, sizeClasses.backgroundIcon)} aria-hidden="true">
              {leftIcon}
            </span>
          )}
          {rightIcon && (
            <span className={clsx(rightColor, sizeClasses.backgroundIcon)} aria-hidden="true">
              {rightIcon}
            </span>
          )}
        </span>
      )}

      {/* Sliding toggle knob */}
      <span
        className={clsx(
          'pointer-events-none relative inline-flex transform items-center justify-center',
          rounded && 'rounded-xs',
          'bg-surface outline-1 -outline-offset-1 outline-border transition-all duration-200 ease-in-out',
          'group-data-[checked]:outline-primary/50',
          sizeClasses.knob,
          sizeClasses.knobTranslate
        )}
      >
        {/* Inner icon that shows current state */}
        {leftIcon && rightIcon && (
          <>
            <span
              className={clsx(
                leftColor,
                'absolute opacity-100 transition-opacity duration-200 ease-in-out',
                'group-data-[checked]:opacity-0',
                sizeClasses.innerIcon
              )}
            >
              {leftIcon}
            </span>
            <span
              className={clsx(
                rightColor,
                'absolute opacity-0 transition-opacity duration-200 ease-in-out',
                'group-data-[checked]:opacity-100',
                sizeClasses.innerIcon
              )}
            >
              {rightIcon}
            </span>
          </>
        )}
      </span>
    </Switch>
  );
}
