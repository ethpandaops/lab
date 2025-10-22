import { forwardRef, cloneElement, isValidElement } from 'react';
import { Input as HeadlessInput } from '@headlessui/react';
import { ChevronDownIcon } from '@heroicons/react/16/solid';
import clsx from 'clsx';
import { Button } from '@/components/Elements/Button';
import type {
  InputProps,
  InlineAddonProps,
  ExternalAddonProps,
  SelectAddonProps,
  TrailingButtonProps,
} from './Input.types';

/**
 * Input component with support for various layouts and add-ons
 *
 * Features:
 * - Leading/trailing icons
 * - Inline and external add-ons
 * - Select dropdowns (leading/trailing)
 * - Trailing button
 * - Inset and overlapping labels
 * - Keyboard shortcuts
 * - Error states
 * - Gray background variant
 *
 * @example
 * ```tsx
 * // Basic input
 * <Input placeholder="you@example.com" />
 *
 * // With leading icon
 * <Input
 *   leadingIcon={<EnvelopeIcon />}
 *   placeholder="you@example.com"
 * />
 *
 * // With inline add-ons
 * <Input
 *   leadingAddonInline={{ content: '$' }}
 *   trailingAddonInline={{ content: 'USD' }}
 *   placeholder="0.00"
 * />
 *
 * // With error
 * <Input
 *   error
 *   errorMessage="This field is required"
 *   placeholder="Enter value"
 * />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      size = 'md',
      variant = 'default',
      error = false,
      errorMessage,
      leadingIcon,
      trailingIcon,
      leadingAddon,
      trailingAddon,
      leadingAddonInline,
      trailingAddonInline,
      leadingSelect,
      trailingSelect,
      trailingButton,
      insetLabel,
      overlappingLabel,
      keyboardShortcut,
      grayBackground = false,
      wrapperClassName,
      label,
      labelClassName,
      helperText,
      className,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

    // Determine effective variant
    const effectiveVariant = error ? 'error' : grayBackground ? 'gray' : variant;

    // Size styles
    const sizeStyles = {
      sm: 'py-1.5 text-sm/6',
      md: 'py-1.5 text-base/6',
      lg: 'py-2 text-base/6',
    };

    const iconSizeStyles = {
      sm: 'size-4',
      md: 'size-5',
      lg: 'size-5',
    };

    // Base input styles
    const baseInputStyles = clsx(
      'block w-full border-0 bg-white text-gray-900 placeholder:text-gray-400 focus:ring-0',
      'disabled:cursor-not-allowed disabled:opacity-50',
      'read-only:cursor-default read-only:opacity-50',
      'dark:bg-white/5 dark:text-white dark:placeholder:text-gray-500'
    );

    // Variant-specific styles for standalone inputs
    const variantStyles = {
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
      gray: clsx('bg-gray-50 dark:bg-white/5', 'focus:outline-hidden'),
    };

    /**
     * Renders an icon with appropriate sizing and styling
     */
    const renderIcon = (icon: React.ReactNode, position: 'leading' | 'trailing'): React.ReactNode | null => {
      if (!icon || !isValidElement(icon)) return null;

      return cloneElement(icon, {
        'aria-hidden': 'true',
        className: clsx(
          iconSizeStyles[size],
          position === 'leading' ? 'ml-3 sm:ml-3' : 'mr-3 sm:mr-3',
          'pointer-events-none self-center text-gray-400 dark:text-gray-500'
        ),
      } as Record<string, unknown>);
    };

    /**
     * Renders inline add-on (text inside border)
     */
    const renderInlineAddon = (addon: InlineAddonProps | undefined): React.ReactNode | null => {
      if (!addon) return null;

      return (
        <div
          className={clsx(
            'shrink-0 text-base text-gray-500 select-none sm:text-sm/6 dark:text-gray-400',
            addon.className
          )}
        >
          {addon.content}
        </div>
      );
    };

    /**
     * Renders external add-on (separate box outside input)
     */
    const renderExternalAddon = (addon: ExternalAddonProps | undefined): React.ReactNode | null => {
      if (!addon) return null;

      return (
        <div
          className={clsx(
            'flex shrink-0 items-center bg-white px-3 text-base text-gray-500 outline-1 -outline-offset-1 outline-gray-300 sm:text-sm/6',
            'dark:bg-white/5 dark:text-gray-400 dark:outline-gray-700',
            addon.className
          )}
        >
          {addon.content}
        </div>
      );
    };

    /**
     * Renders select dropdown
     */
    const renderSelect = (select: SelectAddonProps | undefined): React.ReactNode | null => {
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
              'col-start-1 row-start-1 w-full appearance-none border-0 py-1.5 pr-7 pl-3 text-base text-gray-500 placeholder:text-gray-400',
              '[background-image:none] shadow-none outline-hidden focus:border-0 focus:shadow-none focus:ring-0 focus:outline-hidden focus-visible:border-0 focus-visible:shadow-none focus-visible:ring-0 focus-visible:outline-hidden sm:text-sm/6',
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

    /**
     * Renders trailing button
     */
    const renderTrailingButton = (button: TrailingButtonProps | undefined): React.ReactNode | null => {
      if (!button) return null;

      const { children, className: buttonClassName, ...buttonProps } = button;

      return (
        <Button
          className={clsx('pointer-events-auto shrink-0 self-center', buttonClassName)}
          size={size}
          {...buttonProps}
        >
          {children}
        </Button>
      );
    };

    /**
     * Renders keyboard shortcut hint
     */
    const renderKeyboardShortcut = (): React.ReactNode | null => {
      if (!keyboardShortcut) return null;

      return (
        <div className="flex py-1.5 pr-1.5">
          <kbd className="inline-flex items-center border border-gray-200 px-1 font-sans text-xs text-gray-400 dark:border-white/10">
            {keyboardShortcut}
          </kbd>
        </div>
      );
    };

    // Padding adjustments based on add-ons
    const getPaddingClasses = (): string => {
      const classes: string[] = ['px-3'];

      if (leadingIcon || leadingAddonInline) {
        classes.push('pl-10 sm:pl-9');
      }

      if (trailingIcon || trailingAddonInline || keyboardShortcut) {
        classes.push('pr-10 sm:pr-9');
      }

      if (insetLabel) {
        classes.push('pt-2.5 pb-1.5');
      }

      return clsx(classes);
    };

    const needsGridWrapper = leadingIcon || trailingIcon;

    const needsFlexWrapper =
      leadingAddonInline || trailingAddonInline || leadingSelect || trailingSelect || keyboardShortcut || insetLabel;

    // Gray background with bottom border
    if (grayBackground) {
      return (
        <div className={clsx('relative', wrapperClassName)}>
          {label && (
            <label
              htmlFor={inputId}
              className={clsx('mb-2 block text-sm/6 font-medium text-foreground', labelClassName)}
            >
              {label}
            </label>
          )}
          <HeadlessInput
            ref={ref}
            id={inputId}
            className={clsx(
              baseInputStyles,
              sizeStyles[size],
              'peer px-3 focus:outline-hidden',
              'bg-gray-50 dark:bg-white/5',
              className
            )}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={errorMessage ? `${inputId}-error` : undefined}
            {...props}
          />
          <div
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 border-t border-gray-300 peer-focus:border-t-2 peer-focus:border-primary dark:border-white/20 dark:peer-focus:border-primary"
          />
          {(errorMessage || helperText) && (
            <p className={clsx('mt-2 text-sm/6', error ? 'text-danger' : 'text-muted')}>
              {error ? errorMessage : helperText}
            </p>
          )}
        </div>
      );
    }

    // External add-ons (outside border)
    if (leadingAddon || trailingAddon || trailingButton) {
      return (
        <div className={clsx(wrapperClassName)}>
          {label && (
            <label
              htmlFor={inputId}
              className={clsx('mb-2 block text-sm/6 font-medium text-foreground', labelClassName)}
            >
              {label}
            </label>
          )}
          <div className="flex">
            {leadingAddon && renderExternalAddon(leadingAddon)}
            {leadingIcon || trailingButton ? (
              <div
                className={clsx(
                  'grid grow grid-cols-1 focus-within:relative',
                  leadingAddon && !trailingAddon && '-mr-px -ml-px',
                  !leadingAddon && trailingAddon && '-mr-px',
                  !leadingAddon && !trailingAddon && ''
                )}
              >
                <HeadlessInput
                  ref={ref}
                  id={inputId}
                  className={clsx(
                    baseInputStyles,
                    variantStyles[effectiveVariant],
                    sizeStyles[size],
                    'col-start-1 row-start-1 pr-3',
                    leadingIcon ? 'pl-10 sm:pl-9' : 'pl-3',
                    trailingButton && 'pr-20',
                    className
                  )}
                  aria-invalid={error ? 'true' : undefined}
                  aria-describedby={errorMessage ? `${inputId}-error` : undefined}
                  {...props}
                />
                {leadingIcon && (
                  <div className="pointer-events-none col-start-1 row-start-1 flex items-center">
                    {renderIcon(leadingIcon, 'leading')}
                  </div>
                )}
                {trailingButton && (
                  <div className="pointer-events-none col-start-1 row-start-1 flex items-center justify-end">
                    {renderTrailingButton(trailingButton)}
                  </div>
                )}
              </div>
            ) : (
              <HeadlessInput
                ref={ref}
                id={inputId}
                className={clsx(
                  baseInputStyles,
                  variantStyles[effectiveVariant],
                  sizeStyles[size],
                  getPaddingClasses(),
                  leadingAddon && '-ml-px',
                  trailingAddon && '-mr-px grow',
                  className
                )}
                aria-invalid={error ? 'true' : undefined}
                aria-describedby={errorMessage ? `${inputId}-error` : undefined}
                {...props}
              />
            )}
            {trailingAddon && renderExternalAddon(trailingAddon)}
          </div>
          {(errorMessage || helperText) && (
            <p className={clsx('mt-2 text-sm/6', error ? 'text-danger' : 'text-muted')}>
              {error ? errorMessage : helperText}
            </p>
          )}
        </div>
      );
    }

    // Overlapping label
    if (overlappingLabel) {
      return (
        <div className={clsx('relative', wrapperClassName)}>
          <label
            htmlFor={inputId}
            className="absolute -top-2 left-2 inline-block bg-white px-1 text-xs font-medium text-gray-900 dark:bg-gray-900 dark:text-white"
          >
            {overlappingLabel}
          </label>
          <HeadlessInput
            ref={ref}
            id={inputId}
            className={clsx(
              baseInputStyles,
              variantStyles[effectiveVariant],
              sizeStyles[size],
              getPaddingClasses(),
              className
            )}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={errorMessage ? `${inputId}-error` : undefined}
            {...props}
          />
          {(errorMessage || helperText) && (
            <p className={clsx('mt-2 text-sm/6', error ? 'text-danger' : 'text-muted')}>
              {error ? errorMessage : helperText}
            </p>
          )}
        </div>
      );
    }

    // Inset label
    if (insetLabel) {
      return (
        <div className={clsx(wrapperClassName)}>
          {label && (
            <label
              htmlFor={inputId}
              className={clsx('mb-2 block text-sm/6 font-medium text-foreground', labelClassName)}
            >
              {label}
            </label>
          )}
          <div
            className={clsx(
              'bg-white px-3 pt-2.5 pb-1.5 outline-1 -outline-offset-1 outline-gray-300',
              'focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-primary',
              'dark:bg-white/5 dark:outline-white/10 dark:focus-within:outline-primary'
            )}
          >
            <label htmlFor={inputId} className="block text-xs font-medium text-gray-900 dark:text-gray-200">
              {insetLabel}
            </label>
            <HeadlessInput
              ref={ref}
              id={inputId}
              className={clsx(
                'block w-full border-0 bg-transparent text-gray-900 shadow-none outline-hidden placeholder:text-gray-400 focus:border-0 focus:shadow-none focus:ring-0 focus:outline-hidden focus-visible:border-0 focus-visible:shadow-none focus-visible:ring-0 focus-visible:outline-hidden sm:text-sm/6',
                'dark:text-white dark:placeholder:text-gray-500',
                className
              )}
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={errorMessage ? `${inputId}-error` : undefined}
              {...props}
            />
          </div>
          {(errorMessage || helperText) && (
            <p className={clsx('mt-2 text-sm/6', error ? 'text-danger' : 'text-muted')}>
              {error ? errorMessage : helperText}
            </p>
          )}
        </div>
      );
    }

    // Grid wrapper (for icons)
    if (needsGridWrapper) {
      return (
        <div className={clsx(wrapperClassName)}>
          {label && (
            <label
              htmlFor={inputId}
              className={clsx('mb-2 block text-sm/6 font-medium text-foreground', labelClassName)}
            >
              {label}
            </label>
          )}
          <div className="grid grid-cols-1">
            <HeadlessInput
              ref={ref}
              id={inputId}
              className={clsx(
                baseInputStyles,
                variantStyles[effectiveVariant],
                sizeStyles[size],
                'col-start-1 row-start-1',
                getPaddingClasses(),
                className
              )}
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={errorMessage ? `${inputId}-error` : undefined}
              {...props}
            />
            {leadingIcon && (
              <div className="pointer-events-none col-start-1 row-start-1 flex items-center">
                {renderIcon(leadingIcon, 'leading')}
              </div>
            )}
            {trailingIcon && (
              <div className="pointer-events-none col-start-1 row-start-1 flex items-center justify-end">
                {renderIcon(trailingIcon, 'trailing')}
              </div>
            )}
          </div>
          {(errorMessage || helperText) && (
            <p id={`${inputId}-error`} className={clsx('mt-2 text-sm/6', error ? 'text-danger' : 'text-muted')}>
              {error ? errorMessage : helperText}
            </p>
          )}
        </div>
      );
    }

    // Flex wrapper (for inline add-ons, selects, keyboard shortcuts)
    if (needsFlexWrapper) {
      const hasInputFocus = leadingAddonInline || trailingAddonInline || keyboardShortcut;
      const hasSelectFocus = leadingSelect || trailingSelect;

      return (
        <div className={clsx(wrapperClassName)}>
          {label && (
            <label
              htmlFor={inputId}
              className={clsx('mb-2 block text-sm/6 font-medium text-foreground', labelClassName)}
            >
              {label}
            </label>
          )}
          <div
            className={clsx(
              'flex',
              hasInputFocus &&
                clsx(
                  'items-center bg-white px-3 outline-1 -outline-offset-1 outline-gray-300',
                  'focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-primary',
                  'dark:bg-white/5 dark:outline-white/10 dark:focus-within:outline-primary'
                ),
              hasSelectFocus &&
                clsx(
                  'bg-white outline-1 -outline-offset-1 outline-gray-300',
                  'has-[input:focus-within]:outline-2 has-[input:focus-within]:-outline-offset-2 has-[input:focus-within]:outline-primary',
                  'dark:bg-white/5 dark:outline-white/10 dark:has-[input:focus-within]:outline-primary'
                )
            )}
          >
            {leadingAddonInline && renderInlineAddon(leadingAddonInline)}
            {leadingSelect && renderSelect(leadingSelect)}
            <HeadlessInput
              ref={ref}
              id={inputId}
              className={clsx(
                'block min-w-0 grow border-0 bg-transparent text-base text-gray-900 shadow-none outline-hidden placeholder:text-gray-400 focus:border-0 focus:shadow-none focus:ring-0 focus:outline-hidden focus-visible:border-0 focus-visible:shadow-none focus-visible:ring-0 focus-visible:outline-hidden sm:text-sm/6',
                hasInputFocus
                  ? clsx(
                      'py-1.5',
                      leadingAddonInline ? 'pl-1' : 'pl-0',
                      trailingAddonInline ? 'pr-1' : 'pr-0',
                      'dark:text-white dark:placeholder:text-gray-500'
                    )
                  : clsx(
                      'py-1.5',
                      leadingSelect ? 'pl-1' : 'pl-0',
                      trailingSelect ? 'pr-1' : 'pr-0',
                      'dark:text-white dark:placeholder:text-gray-500'
                    ),
                className
              )}
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={errorMessage ? `${inputId}-error` : undefined}
              {...props}
            />
            {trailingAddonInline && renderInlineAddon(trailingAddonInline)}
            {trailingSelect && renderSelect(trailingSelect)}
            {keyboardShortcut && renderKeyboardShortcut()}
          </div>
          {(errorMessage || helperText) && (
            <p id={`${inputId}-error`} className={clsx('mt-2 text-sm/6', error ? 'text-danger' : 'text-muted')}>
              {error ? errorMessage : helperText}
            </p>
          )}
        </div>
      );
    }

    // Basic standalone input
    return (
      <div className={clsx(wrapperClassName)}>
        {label && (
          <label htmlFor={inputId} className={clsx('mb-2 block text-sm/6 font-medium text-foreground', labelClassName)}>
            {label}
          </label>
        )}
        <HeadlessInput
          ref={ref}
          id={inputId}
          className={clsx(
            baseInputStyles,
            variantStyles[effectiveVariant],
            sizeStyles[size],
            getPaddingClasses(),
            className
          )}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={errorMessage ? `${inputId}-error` : undefined}
          {...props}
        />
        {(errorMessage || helperText) && (
          <p id={`${inputId}-error`} className={clsx('mt-2 text-sm/6', error ? 'text-danger' : 'text-muted')}>
            {error ? errorMessage : helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
