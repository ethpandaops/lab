import { RadioGroup as HeadlessRadioGroup, Description, Label } from '@headlessui/react';
import { CheckCircleIcon } from '@heroicons/react/20/solid';
import { clsx } from 'clsx';
import { type JSX, createContext, useContext } from 'react';
import { Avatar } from '@/components/Elements/Avatar';
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
  src,
  detail,
  caption,
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
            <Label
              className={clsx(
                'ml-3 cursor-pointer text-sm/6 font-medium',
                optionDisabled ? 'text-muted' : 'text-foreground'
              )}
            >
              {optionLabel}
            </Label>
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
              <Label className={clsx('cursor-pointer font-medium', optionDisabled ? 'text-muted' : 'text-foreground')}>
                {children ?? name}
              </Label>
              {description && <Description className="text-muted">{description}</Description>}
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
              <Label className={clsx('cursor-pointer font-medium', optionDisabled ? 'text-muted' : 'text-foreground')}>
                {children ?? name}
              </Label>
              {description && (
                <>
                  {' '}
                  <Description as="span" className="inline text-muted">
                    {description}
                  </Description>
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
              <Label className={clsx('cursor-pointer font-medium', optionDisabled ? 'text-muted' : 'text-foreground')}>
                {children ?? name}
              </Label>
              {description && <Description className="text-muted">{description}</Description>}
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
              <Label
                className={clsx(
                  'cursor-pointer font-medium select-none',
                  optionDisabled ? 'text-muted' : 'text-foreground'
                )}
              >
                {children ?? name}
              </Label>
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
              {detail && (
                <>
                  <span className={clsx('font-medium text-foreground', { 'text-primary': checked })}>{detail}</span>
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
              {caption}
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
              <Label
                className={clsx(
                  'block text-sm font-medium',
                  optionDisabled ? 'text-muted' : checked ? 'text-primary' : 'text-foreground'
                )}
              >
                {children ?? name}
              </Label>
              {description && (
                <Description className={clsx('block text-sm text-muted', { 'text-primary/75': checked })}>
                  {description}
                </Description>
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
        className={() => clsx('flex cursor-pointer rounded-full', 'disabled:cursor-not-allowed')}
      >
        {({ checked }) => (
          <Avatar
            src={src || ''}
            alt={String(children ?? name)}
            size="sm"
            rounded
            className={clsx(
              'outline-primary/20!',
              {
                'outline-2! outline-offset-2! outline-primary!': checked,
              },
              'focus-visible:outline-3! focus-visible:outline-offset-3! focus-visible:outline-primary!',
              classes
            )}
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
            className={clsx('w-full', {
              'border-primary bg-primary! dark:bg-primary!': checked,
              'outline-3 -outline-offset-1 outline-primary': focus,
            })}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <Label
                  className={clsx(
                    'block text-sm font-medium',
                    optionDisabled ? 'text-muted' : checked ? 'text-white dark:text-zinc-900' : 'text-foreground'
                  )}
                >
                  {children ?? name}
                </Label>
                {description && (
                  <Description
                    className={clsx(
                      'mt-1 block text-sm',
                      checked ? 'text-white/80 dark:text-zinc-900/80' : 'text-muted'
                    )}
                  >
                    {description}
                  </Description>
                )}
                {detail && (
                  <span
                    className={clsx(
                      'mt-6 block text-sm font-medium',
                      optionDisabled ? 'text-muted' : checked ? 'text-white dark:text-zinc-900' : 'text-foreground'
                    )}
                  >
                    {detail}
                  </span>
                )}
              </div>
              <CheckCircleIcon
                aria-hidden="true"
                className={clsx('size-5', checked ? 'text-white dark:text-zinc-900' : 'text-primary', {
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
            className={clsx('flex w-full items-center justify-center px-3', {
              'border-primary bg-primary! dark:bg-primary!': checked,
              'outline-2 outline-offset-2 outline-primary': focus,
            })}
          >
            <Label
              className={clsx(
                'text-sm font-medium uppercase',
                optionDisabled ? 'text-muted' : checked ? 'text-white dark:text-zinc-900' : 'text-foreground'
              )}
            >
              {children ?? name}
            </Label>
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
            className={clsx('grid grid-cols-[1fr_auto] items-center gap-4 px-4', {
              'border-primary bg-primary dark:bg-primary!': checked,
              'outline-3 -outline-offset-1 outline-primary': focus,
            })}
          >
            <div className="flex flex-col text-sm">
              <Label
                className={clsx(
                  'font-medium',
                  optionDisabled ? 'text-muted' : checked ? 'text-white dark:text-zinc-900' : 'text-foreground'
                )}
              >
                {children ?? name}
              </Label>
              {description && (
                <Description className={clsx(checked ? 'text-white/80 dark:text-zinc-900/80' : 'text-muted')}>
                  {description}
                </Description>
              )}
            </div>
            {detail && (
              <div className="flex items-baseline gap-1 text-right text-sm">
                <span
                  className={clsx(
                    'font-medium',
                    optionDisabled ? 'text-muted' : checked ? 'text-white dark:text-zinc-900' : 'text-foreground'
                  )}
                >
                  {detail}
                </span>
                {caption && (
                  <span className={clsx(checked ? 'text-white/80 dark:text-zinc-900/80' : 'text-muted')}>
                    {caption}
                  </span>
                )}
              </div>
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
          <Label
            className={clsx('font-semibold text-foreground', {
              'text-sm/6': variant !== 'small-cards',
              'block text-sm/6': variant === 'picker' || variant === 'small-cards',
            })}
          >
            {legend}
          </Label>
        )}
        {description && variant !== 'small-cards' && (
          <Description className="mt-1 text-sm/6 text-muted">{description}</Description>
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
