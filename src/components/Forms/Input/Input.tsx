import React, { useId, createContext, useContext, type JSX } from 'react';
import clsx from 'clsx';
import { Button } from '@/components/Elements/Button';
import type { InputProps, InputFieldProps, InputSlotProps, InputSize, SelectAddonProps } from './Input.types';
import { renderSelect, getStyleConfig } from './Input.utils';

interface InputContextValue {
  size: InputSize;
  error: boolean;
  inline: boolean;
  inputId: string;
  labelVariant: 'standard' | 'inset' | 'overlapping';
}

const InputContext = createContext<InputContextValue | null>(null);

const useInputContext = (): InputContextValue => {
  const context = useContext(InputContext);
  if (!context) {
    throw new Error('Input subcomponents must be used within an Input component');
  }
  return context;
};

/**
 * Input.Leading - Renders content before the input field
 *
 * Can contain:
 * - Icons (Heroicons or custom SVG)
 * - Text addons (e.g., "$", "https://")
 * - Select dropdowns
 *
 * @example
 * ```tsx
 * <Input.Leading type="icon">
 *   <EnvelopeIcon />
 * </Input.Leading>
 *
 * <Input.Leading type="text">$</Input.Leading>
 *
 * <Input.Leading type="select">
 *   <select>...</select>
 * </Input.Leading>
 * ```
 */
export const InputLeading = ({ children, className, type }: InputSlotProps): React.ReactNode => {
  const { size, inline } = useInputContext();

  // Determine content type (explicit type prop takes precedence)
  let contentType = type;

  // Auto-detect if no explicit type provided
  if (!contentType && React.isValidElement(children)) {
    if (
      children.type === 'select' ||
      ('options' in (children.props as object) && Array.isArray((children.props as { options?: unknown }).options))
    ) {
      contentType = 'select';
    } else if (children.type === Button) {
      contentType = 'button';
    } else if (
      children.type === 'svg' ||
      typeof children.type === 'function' ||
      (typeof children.type === 'object' && children.type !== null)
    ) {
      // SVG, function component, or forwardRef component (likely an icon)
      // Note: Heroicons v2 uses forwardRef which returns an object
      contentType = 'icon';
    } else {
      contentType = 'text';
    }
  } else if (!contentType) {
    contentType = 'text'; // Default to text for string children
  }

  // Render based on content type
  if (contentType === 'icon') {
    const iconSizeStyles = {
      sm: 'size-4',
      md: 'size-5',
      lg: 'size-5',
    };

    return (
      <div className="pointer-events-none col-start-1 row-start-1 flex items-center">
        {React.isValidElement(children) &&
          React.cloneElement(children, {
            'aria-hidden': 'true',
            className: clsx(
              iconSizeStyles[size],
              'ml-3',
              'pointer-events-none self-center text-muted dark:text-muted',
              (children.props as { className?: string }).className
            ),
          } as Record<string, unknown>)}
      </div>
    );
  }

  if (contentType === 'select') {
    return renderSelect(React.isValidElement(children) ? (children.props as SelectAddonProps) : undefined);
  }

  // Text addon (default)
  return (
    <div
      className={clsx(
        inline
          ? 'shrink-0 text-base text-muted select-none sm:text-sm/6 dark:text-muted'
          : 'flex shrink-0 items-center bg-surface px-3 text-base text-muted outline-1 -outline-offset-1 outline-border sm:text-sm/6 dark:bg-surface dark:text-muted dark:outline-border',
        className
      )}
    >
      {children}
    </div>
  );
};

InputLeading.displayName = 'Input.Leading';

/**
 * Input.Trailing - Renders content after the input field
 *
 * Can contain:
 * - Icons
 * - Text addons (e.g., "USD", ".com")
 * - Select dropdowns
 * - Buttons
 *
 * @example
 * ```tsx
 * <Input.Trailing type="icon">
 *   <QuestionMarkCircleIcon />
 * </Input.Trailing>
 *
 * <Input.Trailing type="text">USD</Input.Trailing>
 *
 * <Input.Trailing type="button">
 *   <Button>Sort</Button>
 * </Input.Trailing>
 * ```
 */
export const InputTrailing = ({ children, className, type }: InputSlotProps): React.ReactNode => {
  const { size, inline } = useInputContext();

  // Determine content type (explicit type prop takes precedence)
  let contentType = type;

  // Auto-detect if no explicit type provided
  if (!contentType && React.isValidElement(children)) {
    if (
      children.type === 'select' ||
      ('options' in (children.props as object) && Array.isArray((children.props as { options?: unknown }).options))
    ) {
      contentType = 'select';
    } else if (children.type === Button) {
      contentType = 'button';
    } else if (
      children.type === 'svg' ||
      typeof children.type === 'function' ||
      (typeof children.type === 'object' && children.type !== null)
    ) {
      // SVG, function component, or forwardRef component (likely an icon)
      // Note: Heroicons v2 uses forwardRef which returns an object
      contentType = 'icon';
    } else {
      contentType = 'text';
    }
  } else if (!contentType) {
    contentType = 'text'; // Default to text for string children
  }

  // Render based on content type
  if (contentType === 'icon') {
    const iconSizeStyles = {
      sm: 'size-4',
      md: 'size-5',
      lg: 'size-5',
    };

    return (
      <div className="pointer-events-none col-start-1 row-start-1 flex items-center justify-end">
        {React.isValidElement(children) &&
          React.cloneElement(children, {
            'aria-hidden': 'true',
            className: clsx(
              iconSizeStyles[size],
              'mr-3',
              'pointer-events-none self-center text-muted dark:text-muted',
              (children.props as { className?: string }).className
            ),
          } as Record<string, unknown>)}
      </div>
    );
  }

  if (contentType === 'button') {
    return (
      <div className="pointer-events-none col-start-1 row-start-1 flex items-center justify-end">
        <div className="pointer-events-auto shrink-0 self-center pr-0.5">{children}</div>
      </div>
    );
  }

  if (contentType === 'select') {
    return renderSelect(React.isValidElement(children) ? (children.props as SelectAddonProps) : undefined);
  }

  // Text addon (default)
  return (
    <div
      className={clsx(
        inline
          ? 'shrink-0 text-base text-muted select-none sm:text-sm/6 dark:text-muted'
          : 'flex shrink-0 items-center bg-surface px-3 text-base text-muted outline-1 -outline-offset-1 outline-border sm:text-sm/6 dark:bg-surface dark:text-muted dark:outline-border',
        className
      )}
    >
      {children}
    </div>
  );
};

InputTrailing.displayName = 'Input.Trailing';

/**
 * Input.Field - The actual input element
 *
 * Accepts all standard HTML input props, including ref
 *
 * @example
 * ```tsx
 * <Input.Field
 *   type="email"
 *   placeholder="you@example.com"
 *   autoComplete="email"
 *   ref={myRef}
 *   inputMode="email"
 * />
 * ```
 */
export const InputField = ({ className, ref, inputMode, ...props }: InputFieldProps): JSX.Element => {
  const { size, error, inputId, labelVariant } = useInputContext();
  const styles = getStyleConfig();

  // For inset labels, skip base styles (container handles styling)
  if (labelVariant === 'inset') {
    return (
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? ('true' as const) : undefined}
        inputMode={inputMode}
        {...props}
        className={className}
      />
    );
  }

  // Determine padding based on label variant
  const paddingClasses = 'px-3';

  return (
    <input
      ref={ref}
      id={inputId}
      aria-invalid={error ? ('true' as const) : undefined}
      inputMode={inputMode}
      {...props}
      className={clsx(
        styles.base,
        error ? styles.outline.error : styles.outline.default,
        styles.size[size],
        paddingClasses,
        className
      )}
    />
  );
};

InputField.displayName = 'Input.Field';

/**
 * Input component using compound component pattern
 *
 * @example
 * ```tsx
 * // Basic with icon
 * <Input>
 *   <Input.Leading><EnvelopeIcon /></Input.Leading>
 *   <Input.Field placeholder="you@example.com" />
 * </Input>
 *
 * // Inline addons
 * <Input inline>
 *   <Input.Leading>$</Input.Leading>
 *   <Input.Field placeholder="0.00" />
 *   <Input.Trailing>USD</Input.Trailing>
 * </Input>
 *
 * // With button
 * <Input>
 *   <Input.Field placeholder="Search..." />
 *   <Input.Trailing>
 *     <Button>Search</Button>
 *   </Input.Trailing>
 * </Input>
 *
 * // With error
 * <Input error errorMessage="This field is required">
 *   <Input.Field placeholder="Enter value" />
 * </Input>
 * ```
 */
const InputBase = ({
  size = 'md',
  error = false,
  errorMessage,
  label,
  labelVariant = 'standard',
  helperText,
  wrapperClassName,
  labelClassName,
  inline = false,
  id,
  required,
  cornerHint,
  children,
}: InputProps): JSX.Element => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const cornerHintId = cornerHint ? `${inputId}-corner-hint` : undefined;

  const contextValue: InputContextValue = {
    size,
    error,
    inline,
    inputId,
    labelVariant,
  };

  /**
   * Renders the input label
   */
  const renderLabel = (): React.ReactNode | null => {
    if (!label) return null;

    // Standard label
    if (labelVariant === 'standard') {
      if (cornerHint) {
        return (
          <div className="mb-2 flex justify-between">
            <label htmlFor={inputId} className={clsx('block text-sm/6 font-medium text-foreground', labelClassName)}>
              {label}
            </label>
            <span id={cornerHintId} className="text-sm/6 text-muted">
              {cornerHint}
            </span>
          </div>
        );
      }
      return (
        <label htmlFor={inputId} className={clsx('mb-2 block text-sm/6 font-medium text-foreground', labelClassName)}>
          {label}
        </label>
      );
    }

    // Overlapping label
    if (labelVariant === 'overlapping') {
      return (
        <label
          htmlFor={inputId}
          className="absolute -top-2 left-2 inline-block bg-surface px-1 text-xs font-medium text-foreground dark:bg-background dark:text-foreground"
        >
          {label}
        </label>
      );
    }

    // Inset label
    if (labelVariant === 'inset') {
      return (
        <label htmlFor={inputId} className="block text-xs font-medium text-foreground dark:text-muted">
          {label}
        </label>
      );
    }

    return null;
  };

  /**
   * Renders error or helper text below the input
   * Always includes aria-live for screen reader announcements
   */
  const renderHelperText = (): React.ReactNode | null => {
    if (!errorMessage && !helperText) return null;

    return (
      <p
        id={`${inputId}-error`}
        className={clsx('mt-2 text-sm/6', error ? 'text-danger' : 'text-muted')}
        role={error && errorMessage ? 'alert' : 'status'}
        aria-live="polite"
        aria-atomic="true"
      >
        {error ? errorMessage : helperText}
      </p>
    );
  };

  // Extract slots from children
  const childArray = React.Children.toArray(children);
  const leadingSlot = childArray.find(child => React.isValidElement(child) && child.type === InputLeading);
  const trailingSlot = childArray.find(child => React.isValidElement(child) && child.type === InputTrailing);
  const fieldSlotRaw = childArray.find(child => React.isValidElement(child) && child.type === InputField);

  const hasLeading = !!leadingSlot;
  const hasTrailing = !!trailingSlot;

  // Check if slots contain icons or buttons (for grid layout) vs text (for flex layout)
  const getSlotType = (slot: React.ReactNode): 'icon' | 'button' | 'text' | null => {
    if (!slot || !React.isValidElement(slot)) return null;
    const slotProps = slot.props as InputSlotProps;

    // Use explicit type if provided
    if (slotProps.type) {
      return slotProps.type === 'select' ? 'text' : slotProps.type;
    }

    // Auto-detect based on children
    if (!slotProps.children || !React.isValidElement(slotProps.children)) return 'text';

    const child = slotProps.children;
    if (child.type === Button) return 'button';
    if (
      child.type === 'svg' ||
      typeof child.type === 'function' ||
      (typeof child.type === 'object' && child.type !== null)
    ) {
      // SVG, function component, or forwardRef component (likely an icon)
      // Note: Heroicons v2 uses forwardRef which returns an object
      return 'icon';
    }
    return 'text';
  };

  const leadingType = getSlotType(leadingSlot);
  const trailingType = getSlotType(trailingSlot);

  const hasIcons = leadingType === 'icon' || trailingType === 'icon';
  const hasInlineContent = inline && (hasLeading || hasTrailing);
  const hasExternalAddons = !inline && (hasLeading || hasTrailing) && !hasIcons;

  // Determine layout based on content
  const needsGrid = hasIcons;
  const needsFlex = hasInlineContent;
  const needsExternalFlex = hasExternalAddons;

  // Clone the field slot with proper classes based on layout
  const getFieldClasses = (): string | undefined => {
    if (labelVariant === 'inset') {
      // Inset label - no outline on input (container handles it)
      const textSize = {
        sm: 'text-sm/6',
        md: 'text-base/6',
        lg: 'text-base/6',
      };
      return clsx(
        'block w-full border-0 bg-transparent text-foreground placeholder:text-muted shadow-none',
        textSize[size],
        'outline-0 focus:outline-0 focus-visible:outline-0 ring-0 focus:ring-0',
        'dark:bg-transparent dark:text-foreground dark:placeholder:text-muted'
      );
    }
    if (needsFlex) {
      // Inline addons - minimal padding, transparent bg
      // Use !bg-transparent to override any bg-white from base styles
      return clsx(
        'block min-w-0 grow border-0 !bg-transparent text-base text-foreground shadow-none outline-hidden placeholder:text-muted sm:text-sm/6',
        'focus:outline-hidden focus-visible:outline-hidden py-1.5',
        hasLeading ? 'pl-1' : 'pl-0',
        hasTrailing ? 'pr-1' : 'pr-0',
        'dark:text-foreground dark:placeholder:text-muted'
      );
    }
    if (needsGrid) {
      // Icons/buttons - needs grid positioning and padding for icons
      const styles = getStyleConfig();
      const iconPadding = {
        sm: { leading: 'pl-9', trailing: 'pr-9' },
        md: { leading: 'pl-10', trailing: 'pr-10' },
        lg: { leading: 'pl-11', trailing: 'pr-11' },
      };
      return clsx(
        styles.base,
        error ? styles.outline.error : styles.outline.default,
        styles.size[size],
        'col-start-1 row-start-1',
        hasLeading && iconPadding[size].leading,
        hasTrailing && iconPadding[size].trailing,
        !hasLeading && !hasTrailing && 'px-3'
      );
    }
    // Default - will use InputField's own classes
    return undefined;
  };

  const fieldSlot =
    fieldSlotRaw && React.isValidElement(fieldSlotRaw)
      ? React.cloneElement(fieldSlotRaw, {
          ...(errorMessage || helperText || cornerHint
            ? {
                'aria-describedby': [errorMessage || helperText ? `${inputId}-error` : null, cornerHintId]
                  .filter(Boolean)
                  .join(' '),
              }
            : {}),
          ...(required ? { 'aria-required': 'true' as const } : {}),
          className: clsx(getFieldClasses(), (fieldSlotRaw.props as InputFieldProps).className),
        } as Record<string, unknown>)
      : null;

  // Overlapping label layout
  if (labelVariant === 'overlapping') {
    return (
      <InputContext.Provider value={contextValue}>
        <div className={clsx('relative', wrapperClassName)}>
          {renderLabel()}
          {needsGrid ? (
            <div className="grid grid-cols-1">
              {fieldSlot}
              {leadingSlot}
              {trailingSlot}
            </div>
          ) : (
            fieldSlot
          )}
          {renderHelperText()}
        </div>
      </InputContext.Provider>
    );
  }

  // Inset label layout
  if (labelVariant === 'inset') {
    const insetPadding = {
      sm: 'px-3 pt-1.5 pb-1',
      md: 'px-3 pt-2 pb-1',
      lg: 'px-3 pt-2.5 pb-1.5',
    };
    return (
      <InputContext.Provider value={contextValue}>
        <div className={clsx(wrapperClassName)}>
          <div
            className={clsx(
              'bg-surface outline-1 -outline-offset-1 outline-border',
              'focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-primary',
              'dark:bg-surface dark:outline-border dark:focus-within:outline-primary',
              insetPadding[size],
              error &&
                'outline-danger/50 focus-within:outline-danger dark:outline-danger/50 dark:focus-within:outline-danger'
            )}
          >
            {renderLabel()}
            {fieldSlot}
          </div>
          {renderHelperText()}
        </div>
      </InputContext.Provider>
    );
  }

  // Flex layout (for inline addons)
  if (needsFlex) {
    return (
      <InputContext.Provider value={contextValue}>
        <div className={clsx(wrapperClassName)}>
          {renderLabel()}
          <div
            className={clsx(
              'flex items-center bg-surface px-3 outline-1 -outline-offset-1 outline-border',
              'focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-primary',
              'dark:bg-surface dark:outline-border dark:focus-within:outline-primary'
            )}
          >
            {leadingSlot}
            {fieldSlot}
            {trailingSlot}
          </div>
          {renderHelperText()}
        </div>
      </InputContext.Provider>
    );
  }

  // Grid layout (for icons/buttons)
  if (needsGrid) {
    return (
      <InputContext.Provider value={contextValue}>
        <div className={clsx(wrapperClassName)}>
          {renderLabel()}
          <div className="grid grid-cols-1">
            {fieldSlot}
            {leadingSlot}
            {trailingSlot}
          </div>
          {renderHelperText()}
        </div>
      </InputContext.Provider>
    );
  }

  // External addons layout (text addons outside border)
  if (needsExternalFlex) {
    return (
      <InputContext.Provider value={contextValue}>
        <div className={clsx(wrapperClassName)}>
          {renderLabel()}
          <div className="flex">
            {leadingSlot}
            {fieldSlot}
            {trailingSlot}
          </div>
          {renderHelperText()}
        </div>
      </InputContext.Provider>
    );
  }

  // Standard layout (field only)
  return (
    <InputContext.Provider value={contextValue}>
      <div className={clsx(wrapperClassName)}>
        {renderLabel()}
        {fieldSlot}
        {renderHelperText()}
      </div>
    </InputContext.Provider>
  );
};

InputBase.displayName = 'Input';

// Attach subcomponents to Input for compound component API
export const Input = Object.assign(InputBase, {
  Leading: InputLeading,
  Trailing: InputTrailing,
  Field: InputField,
});
