import React, { useId, createContext, use, type JSX, type ReactNode } from 'react';
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
  /** Ids of the helper or error text and the corner hint, for the field's aria-describedby */
  describedBy?: string;
  required?: boolean;
}

const InputContext = createContext<InputContextValue | null>(null);

const useInputContext = (): InputContextValue => {
  const context = use(InputContext);
  if (!context) {
    throw new Error('Input subcomponents must be used within an Input component');
  }
  return context;
};

/**
 * What a slot holds: its explicit type, or one detected from its child
 */
function slotContent(children: ReactNode, type: InputSlotProps['type']): NonNullable<InputSlotProps['type']> {
  if (type) return type;
  if (!React.isValidElement(children)) return 'text'; // Default to text for string children
  if (
    children.type === 'select' ||
    ('options' in (children.props as object) && Array.isArray((children.props as { options?: unknown }).options))
  ) {
    return 'select';
  }
  if (children.type === Button) return 'button';
  if (
    children.type === 'svg' ||
    typeof children.type === 'function' ||
    (typeof children.type === 'object' && children.type !== null)
  ) {
    // SVG, function component, or forwardRef component (likely an icon)
    // Note: Heroicons v2 uses forwardRef which returns an object
    return 'icon';
  }
  return 'text';
}

/*
 * Input never inspects its children. Every slot marks its root with data-input-slot (plus data-input-leading or
 * data-input-trailing, and data-input-icon for icons), and the box around the slots and the field lays itself out
 * from what it holds:
 * - icons overlay the field in one grid cell, with the field padded clear of the slots
 * - other addons sit beside the field
 * - inline addons share one bordered box with the field, which drops its own
 */
const containerStyles = {
  external: clsx(
    'has-data-input-icon:grid has-data-input-icon:grid-cols-1',
    'not-has-data-input-icon:has-data-input-slot:flex'
  ),
  inline: clsx(
    'has-data-input-slot:flex has-data-input-slot:items-center has-data-input-slot:bg-surface has-data-input-slot:px-3',
    'has-data-input-slot:outline-1 has-data-input-slot:-outline-offset-1 has-data-input-slot:outline-border',
    'has-data-input-slot:focus-within:outline-2 has-data-input-slot:focus-within:-outline-offset-2 has-data-input-slot:focus-within:outline-primary'
  ),
};

// The field under icons: first to paint, in the grid cell the slots share, padded clear of them
const overlayFieldStyles: Record<InputSize, string> = {
  sm: clsx(
    'group-has-data-input-icon/input:order-first group-has-data-input-icon/input:col-start-1 group-has-data-input-icon/input:row-start-1',
    'group-has-data-input-icon/input:group-has-data-input-leading/input:pl-9',
    'group-has-data-input-icon/input:group-has-data-input-trailing/input:pr-9'
  ),
  md: clsx(
    'group-has-data-input-icon/input:order-first group-has-data-input-icon/input:col-start-1 group-has-data-input-icon/input:row-start-1',
    'group-has-data-input-icon/input:group-has-data-input-leading/input:pl-10',
    'group-has-data-input-icon/input:group-has-data-input-trailing/input:pr-10'
  ),
  lg: clsx(
    'group-has-data-input-icon/input:order-first group-has-data-input-icon/input:col-start-1 group-has-data-input-icon/input:row-start-1',
    'group-has-data-input-icon/input:group-has-data-input-leading/input:pl-11',
    'group-has-data-input-icon/input:group-has-data-input-trailing/input:pr-11'
  ),
};

// The field beside inline addons: borderless and transparent, padded only towards the addons
const inlineFieldClasses = clsx(
  'group-has-data-input-slot/input:min-w-0 group-has-data-input-slot/input:grow group-has-data-input-slot/input:bg-transparent!',
  'group-has-data-input-slot/input:shadow-none group-has-data-input-slot/input:outline-hidden',
  'group-has-data-input-slot/input:focus:outline-hidden group-has-data-input-slot/input:focus-visible:outline-hidden',
  'group-has-data-input-slot/input:sm:text-sm/6 group-has-data-input-slot/input:px-0',
  'group-has-data-input-slot/input:group-has-data-input-leading/input:pl-1',
  'group-has-data-input-slot/input:group-has-data-input-trailing/input:pr-1'
);

const slotIconStyles: Record<InputSize, string> = {
  sm: '*:size-4',
  md: '*:size-5',
  lg: '*:size-5',
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
  const { size, inline, labelVariant } = useInputContext();

  // An inset label takes the slots' place
  if (labelVariant === 'inset') return null;

  // Explicit type prop takes precedence over detection
  const contentType = slotContent(children, type);

  // Render based on content type
  if (contentType === 'icon') {
    return (
      <div
        data-input-slot=""
        data-input-leading=""
        data-input-icon=""
        className="pointer-events-none col-start-1 row-start-1 flex items-center"
      >
        {React.isValidElement(children) && (
          <span
            aria-hidden="true"
            className={clsx('contents *:pointer-events-none *:ml-3 *:self-center *:text-muted', slotIconStyles[size])}
          >
            {children}
          </span>
        )}
      </div>
    );
  }

  if (contentType === 'select') {
    return renderSelect(React.isValidElement(children) ? (children.props as SelectAddonProps) : undefined, 'leading');
  }

  // Text addon (default)
  return (
    <div
      data-input-slot=""
      data-input-leading=""
      className={clsx(
        inline
          ? 'shrink-0 text-base text-muted select-none sm:text-sm/6'
          : 'flex shrink-0 items-center bg-surface px-3 text-base text-muted outline-1 -outline-offset-1 outline-border sm:text-sm/6',
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
  const { size, inline, labelVariant } = useInputContext();

  // An inset label takes the slots' place
  if (labelVariant === 'inset') return null;

  // Explicit type prop takes precedence over detection
  const contentType = slotContent(children, type);

  // Render based on content type
  if (contentType === 'icon') {
    return (
      <div
        data-input-slot=""
        data-input-trailing=""
        data-input-icon=""
        className="pointer-events-none col-start-1 row-start-1 flex items-center justify-end"
      >
        {React.isValidElement(children) && (
          <span
            aria-hidden="true"
            className={clsx('contents *:pointer-events-none *:mr-3 *:self-center *:text-muted', slotIconStyles[size])}
          >
            {children}
          </span>
        )}
      </div>
    );
  }

  if (contentType === 'button') {
    return (
      <div
        data-input-slot=""
        data-input-trailing=""
        className="pointer-events-none col-start-1 row-start-1 flex items-center justify-end"
      >
        <div className="pointer-events-auto shrink-0 self-center pr-0.5">{children}</div>
      </div>
    );
  }

  if (contentType === 'select') {
    return renderSelect(React.isValidElement(children) ? (children.props as SelectAddonProps) : undefined, 'trailing');
  }

  // Text addon (default)
  return (
    <div
      data-input-slot=""
      data-input-trailing=""
      className={clsx(
        inline
          ? 'shrink-0 text-base text-muted select-none sm:text-sm/6'
          : 'flex shrink-0 items-center bg-surface px-3 text-base text-muted outline-1 -outline-offset-1 outline-border sm:text-sm/6',
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
  const { size, error, inline, inputId, labelVariant, describedBy, required } = useInputContext();
  const styles = getStyleConfig();

  // The Input's helper text, corner hint and required flag take precedence over the field's own
  const aria = {
    ...(describedBy ? { 'aria-describedby': describedBy } : {}),
    ...(required ? { 'aria-required': 'true' as const } : {}),
  };

  // For inset labels, skip base styles (container handles styling)
  if (labelVariant === 'inset') {
    // Inset label - no outline on input (container handles it)
    const textSize = {
      sm: 'text-sm/6',
      md: 'text-base/6',
      lg: 'text-base/6',
    };
    return (
      <input
        ref={ref}
        id={inputId}
        aria-invalid={error ? ('true' as const) : undefined}
        inputMode={inputMode}
        {...props}
        {...aria}
        className={clsx(
          'block w-full border-0 bg-transparent text-foreground shadow-none placeholder:text-muted',
          textSize[size],
          'ring-0 outline-0 focus:ring-0 focus:outline-0 focus-visible:outline-0',
          className
        )}
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
      {...aria}
      className={clsx(
        styles.base,
        error ? styles.outline.error : styles.outline.default,
        styles.size[size],
        paddingClasses,
        // How the field sits among the slots, if there are any
        inline ? inlineFieldClasses : overlayFieldStyles[size],
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
    describedBy:
      errorMessage || helperText || cornerHint
        ? [errorMessage || helperText ? `${inputId}-error` : null, cornerHintId].filter(Boolean).join(' ')
        : undefined,
    required,
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
          className="absolute -top-2 left-2 inline-block bg-panel px-1 text-xs font-medium text-foreground"
        >
          {label}
        </label>
      );
    }

    // Inset label
    if (labelVariant === 'inset') {
      return (
        <label htmlFor={inputId} className="block text-xs font-medium text-foreground-soft">
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

  // The slots and the field, in a box that lays itself out from the slots it holds
  const fields = (
    <div className={clsx('group/input', inline ? containerStyles.inline : containerStyles.external)}>{children}</div>
  );

  // Overlapping label layout
  if (labelVariant === 'overlapping') {
    return (
      <InputContext value={contextValue}>
        <div className={clsx('relative', wrapperClassName)}>
          {renderLabel()}
          {fields}
          {renderHelperText()}
        </div>
      </InputContext>
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
      <InputContext value={contextValue}>
        <div className={clsx(wrapperClassName)}>
          <div
            className={clsx(
              'bg-surface outline-1 -outline-offset-1 outline-border',
              'focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-primary',
              insetPadding[size],
              error && 'outline-danger-50 focus-within:outline-danger'
            )}
          >
            {renderLabel()}
            {children}
          </div>
          {renderHelperText()}
        </div>
      </InputContext>
    );
  }

  // Standard layout
  return (
    <InputContext value={contextValue}>
      <div className={clsx(wrapperClassName)}>
        {renderLabel()}
        {fields}
        {renderHelperText()}
      </div>
    </InputContext>
  );
};

InputBase.displayName = 'Input';

// Attach subcomponents to Input for compound component API
// eslint-disable-next-line react-refresh/only-export-components
export const Input = Object.assign(InputBase, {
  Leading: InputLeading,
  Trailing: InputTrailing,
  Field: InputField,
});
