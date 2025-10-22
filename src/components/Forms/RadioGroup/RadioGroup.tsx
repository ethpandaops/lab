import { RadioGroup as HeadlessRadioGroup } from '@headlessui/react';
import { CheckCircleIcon } from '@heroicons/react/20/solid';
import { clsx } from 'clsx';
import { type JSX, createContext, useContext } from 'react';
import { Card } from '@/components/Layout/Card';
import { ListContainer, ListItem } from '@/components/Layout/ListContainer';
import { type RadioGroupProps, type RadioOptionProps, type RadioGroupVariant } from './RadioGroup.types';

/**
 * Context value shared between RadioGroup and RadioOption
 */
interface RadioGroupContextValue {
  variant: RadioGroupVariant;
  disabled: boolean;
  getRadioStyles: (checked: boolean, optionDisabled?: boolean) => string;
}

const RadioGroupContext = createContext<RadioGroupContextValue>({
  variant: 'simple-list',
  disabled: false,
  getRadioStyles: () => '',
});

/**
 * RadioOption component for use within RadioGroup
 *
 * @example
 * ```tsx
 * <RadioGroup name="example" value={value} onChange={setValue}>
 *   <RadioOption id="opt1" name="Option 1" />
 *   <RadioOption id="opt2" name="Option 2" description="With description" />
 * </RadioGroup>
 * ```
 */
export function RadioOption({
  id,
  value,
  name,
  title,
  description,
  disabled = false,
  classes,
  extraInfo,
  additionalInfo,
  children,
}: RadioOptionProps): JSX.Element {
  const { variant, disabled: groupDisabled, getRadioStyles } = useContext(RadioGroupContext);
  const optionValue = value ?? id;
  const optionLabel = children ?? title ?? name;
  const isDisabled = disabled || groupDisabled;

  // Simple list and inline variants (identical rendering)
  if (variant === 'simple-list' || variant === 'simple-inline') {
    return (
      <HeadlessRadioGroup.Option
        value={optionValue}
        disabled={isDisabled}
        className="flex cursor-pointer items-center disabled:cursor-not-allowed"
      >
        {({ checked, disabled: optionDisabled }) => (
          <>
            <div className={getRadioStyles(checked, optionDisabled)} aria-hidden="true" />
            <HeadlessRadioGroup.Label
              className={clsx(
                'ml-3 cursor-pointer text-sm/6 font-medium',
                optionDisabled ? 'text-muted' : 'text-foreground'
              )}
            >
              {optionLabel}
            </HeadlessRadioGroup.Label>
          </>
        )}
      </HeadlessRadioGroup.Option>
    );
  }

  // List with description variant
  if (variant === 'description-list') {
    return (
      <HeadlessRadioGroup.Option
        value={optionValue}
        disabled={isDisabled}
        className="relative flex cursor-pointer items-start disabled:cursor-not-allowed"
      >
        {({ checked, disabled: optionDisabled }) => (
          <>
            <div className="flex h-6 items-center">
              <div className={getRadioStyles(checked, optionDisabled)} aria-hidden="true" />
            </div>
            <div className="ml-3 text-sm/6">
              <HeadlessRadioGroup.Label
                className={clsx('cursor-pointer font-medium', optionDisabled ? 'text-muted' : 'text-foreground')}
              >
                {children ?? name}
              </HeadlessRadioGroup.Label>
              {description && (
                <HeadlessRadioGroup.Description className="text-muted">{description}</HeadlessRadioGroup.Description>
              )}
            </div>
          </>
        )}
      </HeadlessRadioGroup.Option>
    );
  }

  // List with inline description variant
  if (variant === 'inline-description-list') {
    return (
      <HeadlessRadioGroup.Option
        value={optionValue}
        disabled={isDisabled}
        className="relative flex cursor-pointer items-start disabled:cursor-not-allowed"
      >
        {({ checked, disabled: optionDisabled }) => (
          <>
            <div className="flex h-6 items-center">
              <div className={getRadioStyles(checked, optionDisabled)} aria-hidden="true" />
            </div>
            <div className="ml-3 text-sm/6">
              <HeadlessRadioGroup.Label
                className={clsx('cursor-pointer font-medium', optionDisabled ? 'text-muted' : 'text-foreground')}
              >
                {children ?? name}
              </HeadlessRadioGroup.Label>
              {description && (
                <>
                  {' '}
                  <HeadlessRadioGroup.Description as="span" className="inline text-muted">
                    {description}
                  </HeadlessRadioGroup.Description>
                </>
              )}
            </div>
          </>
        )}
      </HeadlessRadioGroup.Option>
    );
  }

  // List with radio on right variant
  if (variant === 'right-radio-list') {
    return (
      <HeadlessRadioGroup.Option
        value={optionValue}
        disabled={isDisabled}
        className="relative cursor-pointer disabled:cursor-not-allowed"
      >
        {({ checked, disabled: optionDisabled }) => (
          <ListItem className="flex items-start justify-between">
            <div className="min-w-0 flex-1 text-sm/6">
              <HeadlessRadioGroup.Label
                className={clsx('cursor-pointer font-medium', optionDisabled ? 'text-muted' : 'text-foreground')}
              >
                {children ?? name}
              </HeadlessRadioGroup.Label>
              {description && (
                <HeadlessRadioGroup.Description className="text-muted">{description}</HeadlessRadioGroup.Description>
              )}
            </div>
            <div className="ml-3 flex h-6 shrink-0 items-center">
              <div className={getRadioStyles(checked, optionDisabled)} aria-hidden="true" />
            </div>
          </ListItem>
        )}
      </HeadlessRadioGroup.Option>
    );
  }

  // Simple list with radio on right variant
  if (variant === 'simple-right-radio-list') {
    return (
      <HeadlessRadioGroup.Option
        value={optionValue}
        disabled={isDisabled}
        className="relative cursor-pointer disabled:cursor-not-allowed"
      >
        {({ checked, disabled: optionDisabled }) => (
          <ListItem className="flex items-center justify-between">
            <div className="min-w-0 flex-1 text-sm/6">
              <HeadlessRadioGroup.Label
                className={clsx(
                  'cursor-pointer font-medium select-none',
                  optionDisabled ? 'text-muted' : 'text-foreground'
                )}
              >
                {children ?? name}
              </HeadlessRadioGroup.Label>
            </div>
            <div className="ml-3 flex h-6 shrink-0 items-center">
              <div className={getRadioStyles(checked, optionDisabled)} aria-hidden="true" />
            </div>
          </ListItem>
        )}
      </HeadlessRadioGroup.Option>
    );
  }

  // Table variant
  if (variant === 'table') {
    return (
      <HeadlessRadioGroup.Option
        value={optionValue}
        disabled={isDisabled}
        className="group flex cursor-pointer disabled:cursor-not-allowed"
      >
        {({ checked, disabled: optionDisabled }) => (
          <ListItem
            className={clsx('grid w-full grid-cols-1 gap-2 py-0.5 focus:outline-none md:grid-cols-3 md:gap-4', {
              'relative z-10 border-primary bg-primary/10': checked,
            })}
          >
            <span className="flex items-center gap-3 text-sm">
              <div className={getRadioStyles(checked, optionDisabled)} aria-hidden="true" />
              <span
                className={clsx(
                  'font-medium',
                  optionDisabled ? 'text-muted' : checked ? 'text-primary' : 'text-foreground'
                )}
              >
                {children ?? name}
              </span>
            </span>
            <span className="ml-6 pl-1 text-sm md:ml-0 md:pl-0 md:text-center">
              {extraInfo && (
                <>
                  <span className={clsx('font-medium text-foreground', { 'text-primary': checked })}>{extraInfo}</span>
                  {description && (
                    <>
                      {' '}
                      <span className={clsx('text-muted', { 'text-primary/75': checked })}>({description})</span>
                    </>
                  )}
                </>
              )}
            </span>
            <span
              className={clsx('ml-6 pl-1 text-sm text-muted md:ml-0 md:pl-0 md:text-right', {
                'text-primary/75': checked,
              })}
            >
              {additionalInfo}
            </span>
          </ListItem>
        )}
      </HeadlessRadioGroup.Option>
    );
  }

  // Panel variant
  if (variant === 'panel') {
    return (
      <HeadlessRadioGroup.Option
        value={optionValue}
        disabled={isDisabled}
        className="group cursor-pointer disabled:cursor-not-allowed"
      >
        {({ checked, disabled: optionDisabled }) => (
          <ListItem
            className={clsx('flex items-start py-0.5 focus:outline-none', {
              'relative z-10 border-primary bg-primary/10': checked,
            })}
          >
            <div
              className={clsx('relative mt-0.5 shrink-0', getRadioStyles(checked, optionDisabled))}
              aria-hidden="true"
            />
            <span className="ml-3 flex flex-col">
              <HeadlessRadioGroup.Label
                className={clsx(
                  'block text-sm font-medium',
                  optionDisabled ? 'text-muted' : checked ? 'text-primary' : 'text-foreground'
                )}
              >
                {children ?? name}
              </HeadlessRadioGroup.Label>
              {description && (
                <HeadlessRadioGroup.Description
                  className={clsx('block text-sm text-muted', { 'text-primary/75': checked })}
                >
                  {description}
                </HeadlessRadioGroup.Description>
              )}
            </span>
          </ListItem>
        )}
      </HeadlessRadioGroup.Option>
    );
  }

  // Picker variant
  if (variant === 'picker') {
    return (
      <HeadlessRadioGroup.Option
        value={optionValue}
        disabled={isDisabled}
        className={() =>
          clsx(
            'flex cursor-pointer rounded-full outline -outline-offset-1 outline-border',
            'disabled:cursor-not-allowed'
          )
        }
      >
        {({ checked }) => (
          <div
            className={clsx(
              'size-8 rounded-full',
              classes || 'bg-primary',
              {
                'outline outline-2 outline-offset-2 outline-primary': checked,
              },
              'focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-primary'
            )}
            aria-label={String(children ?? name)}
          />
        )}
      </HeadlessRadioGroup.Option>
    );
  }

  // Cards variant
  if (variant === 'cards') {
    return (
      <HeadlessRadioGroup.Option
        value={optionValue}
        disabled={isDisabled}
        className="group relative flex cursor-pointer disabled:cursor-not-allowed"
      >
        {({ checked, focus, disabled: optionDisabled }) => (
          <Card
            rounded
            className={clsx('w-full', {
              'outline-2 -outline-offset-2 outline-primary': checked,
              'outline-3 -outline-offset-1 outline-primary': focus,
            })}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <HeadlessRadioGroup.Label
                  className={clsx('block text-sm font-medium', optionDisabled ? 'text-muted' : 'text-foreground')}
                >
                  {children ?? name}
                </HeadlessRadioGroup.Label>
                {description && (
                  <HeadlessRadioGroup.Description className="mt-1 block text-sm text-muted">
                    {description}
                  </HeadlessRadioGroup.Description>
                )}
                {extraInfo && (
                  <span
                    className={clsx(
                      'mt-6 block text-sm font-medium',
                      optionDisabled ? 'text-muted' : 'text-foreground'
                    )}
                  >
                    {extraInfo}
                  </span>
                )}
              </div>
              <CheckCircleIcon
                aria-hidden="true"
                className={clsx('size-5 text-primary', {
                  visible: checked,
                  invisible: !checked,
                })}
              />
            </div>
          </Card>
        )}
      </HeadlessRadioGroup.Option>
    );
  }

  // Small cards variant
  if (variant === 'small-cards') {
    return (
      <HeadlessRadioGroup.Option
        value={optionValue}
        disabled={isDisabled}
        className="group relative flex cursor-pointer disabled:cursor-not-allowed"
      >
        {({ checked, focus, disabled: optionDisabled }) => (
          <Card
            rounded
            className={clsx('flex w-full items-center justify-center p-3', {
              'border-primary bg-primary': checked,
              'outline-2 outline-offset-2 outline-primary': focus,
            })}
          >
            <HeadlessRadioGroup.Label
              className={clsx(
                'text-sm font-medium uppercase',
                optionDisabled ? 'text-muted' : checked ? 'text-background' : 'text-foreground'
              )}
            >
              {children ?? name}
            </HeadlessRadioGroup.Label>
          </Card>
        )}
      </HeadlessRadioGroup.Option>
    );
  }

  // Stacked cards variant
  if (variant === 'stacked-cards') {
    return (
      <HeadlessRadioGroup.Option
        value={optionValue}
        disabled={isDisabled}
        className="group relative block cursor-pointer disabled:cursor-not-allowed"
      >
        {({ checked, focus, disabled: optionDisabled }) => (
          <Card
            rounded
            className={clsx('flex justify-between', {
              'outline-2 -outline-offset-2 outline-primary': checked,
              'outline-3 -outline-offset-1 outline-primary': focus,
            })}
          >
            <span className="flex items-center">
              <span className="flex flex-col text-sm">
                <HeadlessRadioGroup.Label
                  className={clsx('font-medium', optionDisabled ? 'text-muted' : 'text-foreground')}
                >
                  {children ?? name}
                </HeadlessRadioGroup.Label>
                {description && (
                  <HeadlessRadioGroup.Description className="text-muted">{description}</HeadlessRadioGroup.Description>
                )}
              </span>
            </span>
            {extraInfo && (
              <span className="mt-2 flex text-sm sm:mt-0 sm:ml-4 sm:flex-col sm:text-right">
                <span className={clsx('font-medium', optionDisabled ? 'text-muted' : 'text-foreground')}>
                  {extraInfo}
                </span>
                {additionalInfo && <span className="ml-1 text-muted sm:ml-0">{additionalInfo}</span>}
              </span>
            )}
          </Card>
        )}
      </HeadlessRadioGroup.Option>
    );
  }

  return <></>;
}

/**
 * RadioGroup component with composition pattern
 *
 * @example
 * ```tsx
 * <RadioGroup name="example" value={value} onChange={setValue}>
 *   <RadioOption id="1" name="Option 1" />
 *   <RadioOption id="2" name="Option 2" />
 * </RadioGroup>
 * ```
 */
export function RadioGroup({
  name,
  children,
  defaultValue,
  value,
  onChange,
  variant = 'simple-list',
  legend,
  description,
  'aria-label': ariaLabel,
  disabled = false,
  className = '',
}: RadioGroupProps): React.JSX.Element {
  const currentValue = value ?? defaultValue ?? '';

  const handleChange = (newValue: string): void => {
    onChange?.(newValue);
  };

  // Base radio styles
  const getRadioStyles = (checked: boolean, optionDisabled = false): string =>
    clsx(
      'relative size-4 shrink-0 rounded-full border bg-background',
      'before:absolute before:inset-1 before:rounded-full',
      {
        'border-primary bg-primary before:block': checked,
        'border-border before:hidden dark:border-zinc-600': !checked,
        'opacity-50 cursor-not-allowed': optionDisabled || disabled,
      }
    );

  const contextValue: RadioGroupContextValue = {
    variant,
    disabled,
    getRadioStyles,
  };

  // Render wrapper based on variant
  const renderContent = (): JSX.Element => {
    // Simple list variant
    if (variant === 'simple-list') {
      return <div className="mt-6 space-y-6">{children}</div>;
    }

    // Simple inline list variant
    if (variant === 'simple-inline') {
      return <div className="mt-6 space-y-6 sm:flex sm:items-center sm:space-y-0 sm:gap-x-10">{children}</div>;
    }

    // List with description variant
    if (variant === 'description-list' || variant === 'inline-description-list') {
      return <div className="mt-6 space-y-5">{children}</div>;
    }

    // List with radio on right variant
    if (variant === 'right-radio-list') {
      return (
        <ListContainer variant="simple" withDividers compact className="mt-2.5">
          {children}
        </ListContainer>
      );
    }

    // Simple list with radio on right variant
    if (variant === 'simple-right-radio-list') {
      return (
        <ListContainer variant="flat" withDividers compact className="mt-4">
          {children}
        </ListContainer>
      );
    }

    // Table variant
    if (variant === 'table' || variant === 'panel') {
      return (
        <ListContainer variant="card" withDividers compact>
          {children}
        </ListContainer>
      );
    }

    // Picker variant
    if (variant === 'picker') {
      return <div className="mt-6 flex items-center gap-x-3">{children}</div>;
    }

    // Cards variant
    if (variant === 'cards') {
      return <div className="mt-6 grid grid-cols-1 gap-y-6 sm:grid-cols-3 sm:gap-x-4">{children}</div>;
    }

    // Small cards variant
    if (variant === 'small-cards') {
      return <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-6">{children}</div>;
    }

    // Stacked cards variant
    if (variant === 'stacked-cards') {
      return <div className="space-y-4">{children}</div>;
    }

    return <>{children}</>;
  };

  return (
    <RadioGroupContext.Provider value={contextValue}>
      <HeadlessRadioGroup
        value={currentValue}
        onChange={handleChange}
        disabled={disabled}
        className={className}
        name={name}
        aria-label={ariaLabel}
      >
        {legend && (
          <HeadlessRadioGroup.Label
            className={clsx('font-semibold text-foreground', {
              'text-sm/6': variant !== 'small-cards',
              'block text-sm/6': variant === 'picker' || variant === 'small-cards',
            })}
          >
            {legend}
          </HeadlessRadioGroup.Label>
        )}
        {description && variant !== 'small-cards' && (
          <HeadlessRadioGroup.Description className="mt-1 text-sm/6 text-muted">
            {description}
          </HeadlessRadioGroup.Description>
        )}
        {variant === 'small-cards' && description && (
          <div className="flex items-center justify-between">
            <div className="text-sm/6 font-medium text-primary hover:text-primary/75">{description}</div>
          </div>
        )}
        {renderContent()}
      </HeadlessRadioGroup>
    </RadioGroupContext.Provider>
  );
}
