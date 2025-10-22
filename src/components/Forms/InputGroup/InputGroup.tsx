import { forwardRef, cloneElement, isValidElement, type JSX, type ReactNode } from 'react';
import { Input, Field, Label, Description } from '@headlessui/react';
import { ExclamationCircleIcon } from '@heroicons/react/16/solid';
import clsx from 'clsx';
import type { InputGroupProps } from './InputGroup.types';

export const InputGroup = forwardRef<HTMLInputElement, InputGroupProps>(
  (
    {
      label,
      helpText,
      error,
      cornerHint,
      leadingIcon,
      trailingIcon,
      leadingAddon,
      trailingAddon,
      inlineLeadingAddon,
      inlineTrailingAddon,
      leadingDropdown,
      trailingDropdown,
      trailingButton,
      keyboardShortcut,
      variant = 'default',
      wrapperClassName = '',
      id,
      className = '',
      disabled,
      'aria-describedby': ariaDescribedBy,
      'aria-invalid': ariaInvalid,
      ...props
    },
    ref
  ) => {
    const hasError = !!error;
    const isInvalid = ariaInvalid ?? hasError;

    // Base input classes using Headless UI's data attributes
    const getInputClasses = (): string => {
      // Inline addons - wrapper has the outline, input has minimal styling
      if (inlineLeadingAddon || inlineTrailingAddon) {
        const paddingLeft = inlineLeadingAddon ? 'pl-1' : 'pl-3';
        return clsx(
          'block min-w-0 grow py-1.5 pr-3 text-base text-foreground placeholder:text-gray-400 focus:outline-none sm:text-sm/6',
          'dark:text-white dark:placeholder:text-gray-500',
          paddingLeft,
          className
        );
      }

      const base = 'col-start-1 row-start-1 block w-full text-base sm:text-sm/6';

      // Variant-specific styles
      if (variant === 'inset') {
        return clsx(
          base,
          'text-foreground placeholder:text-gray-400 focus:outline-none',
          'dark:bg-transparent dark:text-white dark:placeholder:text-gray-500',
          className
        );
      }

      if (variant === 'overlapping') {
        return clsx(
          base,
          'rounded-md bg-white px-3 py-1.5 text-foreground',
          'outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400',
          'focus:outline-2 focus:-outline-offset-2 focus:outline-primary',
          'dark:bg-background dark:text-white dark:outline-border dark:placeholder:text-gray-500 dark:focus:outline-primary',
          'data-disabled:cursor-not-allowed data-disabled:bg-gray-50 data-disabled:text-gray-500 data-disabled:outline-gray-200',
          'dark:data-disabled:bg-white/10 dark:data-disabled:text-gray-500 dark:data-disabled:outline-white/5',
          className
        );
      }

      if (variant === 'pill') {
        return clsx(
          base,
          'rounded-full bg-white px-4 py-1.5 text-foreground',
          'outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400',
          'focus:outline-2 focus:-outline-offset-2 focus:outline-primary',
          'dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-gray-500 dark:focus:outline-primary',
          'data-disabled:cursor-not-allowed data-disabled:bg-gray-50 data-disabled:text-gray-500 data-disabled:outline-gray-200',
          'dark:data-disabled:bg-white/10 dark:data-disabled:text-gray-500 dark:data-disabled:outline-white/5',
          className
        );
      }

      if (variant === 'bottom-border') {
        return clsx(
          base,
          'bg-gray-50 px-3 py-1.5 text-foreground placeholder:text-gray-500 focus:outline-none',
          'dark:bg-white/5 dark:text-white dark:placeholder:text-gray-500',
          className
        );
      }

      // Default variant
      const errorClasses = hasError
        ? clsx(
            'text-red-900 outline-1 -outline-offset-1 outline-red-300 placeholder:text-red-300',
            'focus:outline-2 focus:-outline-offset-2 focus:outline-danger',
            'dark:text-red-400 dark:outline-red-500/50 dark:placeholder:text-red-400/70 dark:focus:outline-red-400'
          )
        : clsx(
            'text-foreground outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400',
            'focus:outline-2 focus:-outline-offset-2 focus:outline-primary',
            'dark:text-white dark:outline-gray-700 dark:placeholder:text-gray-500 dark:focus:outline-primary'
          );

      const disabledClasses = clsx(
        'data-disabled:cursor-not-allowed data-disabled:bg-gray-50 data-disabled:text-gray-500 data-disabled:outline-gray-200',
        'dark:data-disabled:bg-white/10 dark:data-disabled:text-gray-500 dark:data-disabled:outline-white/5',
        'bg-white dark:bg-white/5'
      );

      // Padding adjustments for icons/addons
      let paddingLeft = 'pl-3';
      let paddingRight = 'pr-3';
      const paddingY = 'py-1.5';

      // Leading element padding
      if (leadingIcon || leadingDropdown) {
        paddingLeft = 'pl-10 sm:pl-9';
      } else if (inlineLeadingAddon) {
        paddingLeft = 'pl-1';
      }

      // Trailing element padding
      if (trailingIcon || keyboardShortcut || (hasError && !trailingIcon)) {
        paddingRight = 'pr-10 sm:pr-9';
      } else if (inlineTrailingAddon || trailingDropdown) {
        paddingRight = 'pr-3';
      }

      const paddingClasses = `${paddingY} ${paddingRight} ${paddingLeft}`;

      // Rounding adjustments for add-ons/buttons
      let roundingClasses = 'rounded-md';
      let marginClasses = '';
      if (leadingAddon) {
        roundingClasses = 'rounded-r-md';
        marginClasses = '-ml-px';
      }
      if (trailingAddon || trailingButton) {
        roundingClasses = leadingAddon ? 'rounded-none' : 'rounded-l-md';
        marginClasses = leadingAddon ? '' : '-mr-px';
      }

      return clsx(base, roundingClasses, marginClasses, paddingClasses, errorClasses, disabledClasses, className);
    };

    const renderInput = (): JSX.Element => {
      const inputElement = (
        <Input
          ref={ref}
          id={id}
          disabled={disabled}
          aria-describedby={ariaDescribedBy || undefined}
          invalid={isInvalid === true}
          className={getInputClasses()}
          {...props}
        />
      );

      // Variant: Inset label
      if (variant === 'inset') {
        return (
          <div className="rounded-md bg-white px-3 pt-2.5 pb-1.5 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-primary dark:bg-white/5 dark:outline-white/10 dark:focus-within:outline-primary">
            {label && (
              <label htmlFor={id} className="block text-xs font-medium text-foreground dark:text-gray-200">
                {label}
              </label>
            )}
            {inputElement}
          </div>
        );
      }

      // Variant: Bottom border
      if (variant === 'bottom-border') {
        return (
          <div className="relative mt-2">
            {inputElement}
            <div
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 border-t border-gray-300 peer-focus:border-t-2 peer-focus:border-primary dark:border-white/20 dark:peer-focus:border-primary"
            />
          </div>
        );
      }

      // With icons or error icon - use grid overlay
      const needsGrid =
        leadingIcon || trailingIcon || leadingDropdown || trailingDropdown || (hasError && !trailingIcon);

      if (needsGrid) {
        return (
          <div className="grid grid-cols-1">
            {inputElement}
            {leadingIcon && renderIcon(leadingIcon, 'leading')}
            {leadingDropdown && (
              <div className="col-start-1 row-start-1 grid shrink-0 grid-cols-1 focus-within:relative">
                {leadingDropdown}
              </div>
            )}
            {trailingIcon && !hasError && renderIcon(trailingIcon, 'trailing')}
            {trailingDropdown && (
              <div className="col-start-1 row-start-1 grid shrink-0 grid-cols-1 justify-self-end focus-within:relative">
                {trailingDropdown}
              </div>
            )}
            {hasError && !trailingIcon && (
              <ExclamationCircleIcon
                aria-hidden="true"
                className="pointer-events-none col-start-1 row-start-1 mr-3 size-5 self-center justify-self-end text-red-500 sm:size-4 dark:text-red-400"
              />
            )}
          </div>
        );
      }

      // Inline add-ons
      if (inlineLeadingAddon || inlineTrailingAddon) {
        return (
          <div className="flex items-center rounded-md bg-white px-3 outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-primary dark:bg-white/5 dark:outline-white/10 dark:focus-within:outline-primary">
            {inlineLeadingAddon && (
              <div className="shrink-0 text-base text-gray-500 select-none sm:text-sm/6 dark:text-gray-400">
                {inlineLeadingAddon}
              </div>
            )}
            {inputElement}
            {inlineTrailingAddon && (
              <div className="shrink-0 text-base text-gray-500 select-none sm:text-sm/6 dark:text-gray-400">
                {inlineTrailingAddon}
              </div>
            )}
          </div>
        );
      }

      // Keyboard shortcut
      if (keyboardShortcut) {
        return (
          <div className="flex rounded-md bg-white outline-1 -outline-offset-1 outline-gray-300 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-primary dark:bg-white/5 dark:outline-1 dark:-outline-offset-1 dark:outline-white/10 dark:focus-within:outline-primary">
            {inputElement}
            <div className="flex py-1.5 pr-1.5">
              <kbd className="inline-flex items-center rounded-xs border border-gray-200 px-1 font-sans text-xs text-gray-400 dark:border-white/10">
                {keyboardShortcut}
              </kbd>
            </div>
          </div>
        );
      }

      // Standard input
      return inputElement;
    };

    const renderIcon = (icon: ReactNode, position: 'leading' | 'trailing'): ReactNode => {
      if (!isValidElement(icon)) return null;

      const className =
        position === 'leading'
          ? 'pointer-events-none col-start-1 row-start-1 ml-3 size-5 self-center justify-self-start text-gray-400 sm:size-4 dark:text-gray-300'
          : 'pointer-events-none col-start-1 row-start-1 mr-3 size-5 self-center justify-self-end text-gray-400 sm:size-4 dark:text-gray-300';

      return cloneElement(icon, {
        'aria-hidden': 'true',
        className,
      } as Record<string, unknown>);
    };

    const renderInputWithAddons = (): JSX.Element => {
      const input = renderInput();

      // With leading/trailing add-ons or buttons
      if (leadingAddon || trailingAddon || trailingButton) {
        return (
          <div className="flex">
            {leadingAddon && (
              <div className="flex shrink-0 items-center rounded-l-md bg-white px-3 text-base text-gray-500 outline-1 -outline-offset-1 outline-gray-300 sm:text-sm/6 dark:bg-white/5 dark:text-gray-400 dark:outline-gray-700">
                {leadingAddon}
              </div>
            )}
            {leadingIcon && !leadingAddon ? (
              <div className="-mr-px grid grow grid-cols-1 focus-within:relative">{input}</div>
            ) : (
              input
            )}
            {trailingAddon && (
              <div className="-ml-px flex shrink-0 items-center rounded-r-md bg-white px-3 text-base text-gray-500 outline-1 -outline-offset-1 outline-gray-300 sm:text-sm/6 dark:bg-white/5 dark:text-gray-400 dark:outline-gray-700">
                {trailingAddon}
              </div>
            )}
            {trailingButton && (
              <div className="-ml-px flex">
                {isValidElement(trailingButton)
                  ? cloneElement(trailingButton, {
                      className: clsx((trailingButton.props as { className?: string }).className, 'h-full'),
                    } as Record<string, unknown>)
                  : trailingButton}
              </div>
            )}
          </div>
        );
      }

      return input;
    };

    // Use Field component for better accessibility when label/description are present
    const shouldUseField =
      (label || helpText || error) &&
      variant !== 'inset' &&
      variant !== 'overlapping' &&
      variant !== 'pill' &&
      variant !== 'bottom-border';

    if (shouldUseField) {
      return (
        <Field disabled={disabled} className={wrapperClassName}>
          {(label || cornerHint) && (
            <div className="flex justify-between">
              {label && <Label className="block text-sm/6 font-medium text-foreground dark:text-white">{label}</Label>}
              {cornerHint && <span className="text-sm/6 text-gray-500 dark:text-gray-400">{cornerHint}</span>}
            </div>
          )}
          <div className="mt-2">{renderInputWithAddons()}</div>
          {helpText && !error && (
            <Description className="mt-2 text-sm text-gray-500 dark:text-gray-400">{helpText}</Description>
          )}
          {error && <p className="mt-2 text-sm text-danger dark:text-red-400">{error}</p>}
        </Field>
      );
    }

    // Fallback to manual rendering for custom variants
    return (
      <div className={wrapperClassName}>
        {/* Label and corner hint */}
        {variant === 'overlapping' ? (
          <div className="relative">
            {label && (
              <label
                htmlFor={id}
                className="absolute -top-2 left-2 inline-block rounded-lg bg-white px-1 text-xs font-medium text-foreground dark:bg-background dark:text-white"
              >
                {label}
              </label>
            )}
            {renderInputWithAddons()}
          </div>
        ) : variant === 'pill' ? (
          <>
            {label && (
              <label htmlFor={id} className="ml-px block pl-4 text-sm/6 font-medium text-foreground dark:text-white">
                {label}
              </label>
            )}
            <div className="mt-2">{renderInputWithAddons()}</div>
          </>
        ) : variant === 'inset' || variant === 'bottom-border' ? (
          <>
            {variant === 'bottom-border' && label && (
              <label htmlFor={id} className="block text-sm/6 font-medium text-foreground dark:text-white">
                {label}
              </label>
            )}
            {renderInputWithAddons()}
          </>
        ) : (
          <>
            {(label || cornerHint) && (
              <div className="flex justify-between">
                {label && (
                  <label htmlFor={id} className="block text-sm/6 font-medium text-foreground dark:text-white">
                    {label}
                  </label>
                )}
                {cornerHint && <span className="text-sm/6 text-gray-500 dark:text-gray-400">{cornerHint}</span>}
              </div>
            )}
            <div className="mt-2">{renderInputWithAddons()}</div>
          </>
        )}

        {/* Help text */}
        {helpText && !error && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{helpText}</p>}

        {/* Error message */}
        {error && <p className="mt-2 text-sm text-danger dark:text-red-400">{error}</p>}
      </div>
    );
  }
);

InputGroup.displayName = 'InputGroup';
