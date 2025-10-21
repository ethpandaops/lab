import { RadioGroup as HeadlessRadioGroup } from '@headlessui/react';
import { CheckCircleIcon } from '@heroicons/react/20/solid';
import { clsx } from 'clsx';
import { type RadioGroupProps } from './RadioGroup.types';

export function RadioGroup({
  name,
  options,
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
      'before:absolute before:inset-1 before:rounded-full before:bg-background',
      {
        'border-primary bg-primary before:block': checked,
        'border-border before:hidden': !checked,
        'opacity-50 cursor-not-allowed': optionDisabled || disabled,
      }
    );

  // Simple list variant
  if (variant === 'simple-list') {
    return (
      <HeadlessRadioGroup
        value={currentValue}
        onChange={handleChange}
        disabled={disabled}
        className={className}
        name={name}
      >
        {legend && (
          <HeadlessRadioGroup.Label className="text-sm/6 font-semibold text-foreground">
            {legend}
          </HeadlessRadioGroup.Label>
        )}
        {description && (
          <HeadlessRadioGroup.Description className="text-muted-foreground mt-1 text-sm/6">
            {description}
          </HeadlessRadioGroup.Description>
        )}
        <div className="mt-6 space-y-6">
          {options.map(option => (
            <HeadlessRadioGroup.Option
              key={option.id}
              value={option.value ?? option.id}
              disabled={option.disabled}
              className="flex cursor-pointer items-center disabled:cursor-not-allowed"
            >
              {({ checked, disabled: optionDisabled }) => (
                <>
                  <div className={getRadioStyles(checked, optionDisabled)} aria-hidden="true" />
                  <HeadlessRadioGroup.Label className="ml-3 cursor-pointer text-sm/6 font-medium text-foreground">
                    {option.title ?? option.name}
                  </HeadlessRadioGroup.Label>
                </>
              )}
            </HeadlessRadioGroup.Option>
          ))}
        </div>
      </HeadlessRadioGroup>
    );
  }

  // Simple inline list variant
  if (variant === 'simple-inline') {
    return (
      <HeadlessRadioGroup
        value={currentValue}
        onChange={handleChange}
        disabled={disabled}
        className={className}
        name={name}
      >
        {legend && (
          <HeadlessRadioGroup.Label className="text-sm/6 font-semibold text-foreground">
            {legend}
          </HeadlessRadioGroup.Label>
        )}
        {description && (
          <HeadlessRadioGroup.Description className="text-muted-foreground mt-1 text-sm/6">
            {description}
          </HeadlessRadioGroup.Description>
        )}
        <div className="mt-6 space-y-6 sm:flex sm:items-center sm:space-y-0 sm:gap-x-10">
          {options.map(option => (
            <HeadlessRadioGroup.Option
              key={option.id}
              value={option.value ?? option.id}
              disabled={option.disabled}
              className="flex cursor-pointer items-center disabled:cursor-not-allowed"
            >
              {({ checked, disabled: optionDisabled }) => (
                <>
                  <div className={getRadioStyles(checked, optionDisabled)} aria-hidden="true" />
                  <HeadlessRadioGroup.Label className="ml-3 cursor-pointer text-sm/6 font-medium text-foreground">
                    {option.title ?? option.name}
                  </HeadlessRadioGroup.Label>
                </>
              )}
            </HeadlessRadioGroup.Option>
          ))}
        </div>
      </HeadlessRadioGroup>
    );
  }

  // List with description variant
  if (variant === 'description-list') {
    return (
      <HeadlessRadioGroup
        value={currentValue}
        onChange={handleChange}
        disabled={disabled}
        className={className}
        name={name}
        aria-label={ariaLabel}
      >
        {legend && (
          <HeadlessRadioGroup.Label className="text-sm/6 font-semibold text-foreground">
            {legend}
          </HeadlessRadioGroup.Label>
        )}
        {description && (
          <HeadlessRadioGroup.Description className="text-muted-foreground mt-1 text-sm/6">
            {description}
          </HeadlessRadioGroup.Description>
        )}
        <div className="mt-6 space-y-5">
          {options.map(option => (
            <HeadlessRadioGroup.Option
              key={option.id}
              value={option.value ?? option.id}
              disabled={option.disabled}
              className="relative flex cursor-pointer items-start disabled:cursor-not-allowed"
            >
              {({ checked, disabled: optionDisabled }) => (
                <>
                  <div className="flex h-6 items-center">
                    <div className={getRadioStyles(checked, optionDisabled)} aria-hidden="true" />
                  </div>
                  <div className="ml-3 text-sm/6">
                    <HeadlessRadioGroup.Label className="cursor-pointer font-medium text-foreground">
                      {option.name}
                    </HeadlessRadioGroup.Label>
                    {option.description && (
                      <HeadlessRadioGroup.Description className="text-muted-foreground">
                        {option.description}
                      </HeadlessRadioGroup.Description>
                    )}
                  </div>
                </>
              )}
            </HeadlessRadioGroup.Option>
          ))}
        </div>
      </HeadlessRadioGroup>
    );
  }

  // List with inline description variant
  if (variant === 'inline-description-list') {
    return (
      <HeadlessRadioGroup
        value={currentValue}
        onChange={handleChange}
        disabled={disabled}
        className={className}
        name={name}
        aria-label={ariaLabel}
      >
        {legend && (
          <HeadlessRadioGroup.Label className="text-sm/6 font-semibold text-foreground">
            {legend}
          </HeadlessRadioGroup.Label>
        )}
        {description && (
          <HeadlessRadioGroup.Description className="text-muted-foreground mt-1 text-sm/6">
            {description}
          </HeadlessRadioGroup.Description>
        )}
        <div className="mt-6 space-y-5">
          {options.map(option => (
            <HeadlessRadioGroup.Option
              key={option.id}
              value={option.value ?? option.id}
              disabled={option.disabled}
              className="relative flex cursor-pointer items-start disabled:cursor-not-allowed"
            >
              {({ checked, disabled: optionDisabled }) => (
                <>
                  <div className="flex h-6 items-center">
                    <div className={getRadioStyles(checked, optionDisabled)} aria-hidden="true" />
                  </div>
                  <div className="ml-3 text-sm/6">
                    <HeadlessRadioGroup.Label className="cursor-pointer font-medium text-foreground">
                      {option.name}
                    </HeadlessRadioGroup.Label>
                    {option.description && (
                      <>
                        {' '}
                        <HeadlessRadioGroup.Description as="span" className="text-muted-foreground inline">
                          {option.description}
                        </HeadlessRadioGroup.Description>
                      </>
                    )}
                  </div>
                </>
              )}
            </HeadlessRadioGroup.Option>
          ))}
        </div>
      </HeadlessRadioGroup>
    );
  }

  // List with radio on right variant
  if (variant === 'right-radio-list') {
    return (
      <HeadlessRadioGroup
        value={currentValue}
        onChange={handleChange}
        disabled={disabled}
        className={className}
        name={name}
      >
        {legend && (
          <HeadlessRadioGroup.Label className="text-sm/6 font-semibold text-foreground">
            {legend}
          </HeadlessRadioGroup.Label>
        )}
        {description && (
          <HeadlessRadioGroup.Description className="text-muted-foreground mt-1 text-sm/6">
            {description}
          </HeadlessRadioGroup.Description>
        )}
        <div className="mt-2.5 divide-y divide-border">
          {options.map(option => (
            <HeadlessRadioGroup.Option
              key={option.id}
              value={option.value ?? option.id}
              disabled={option.disabled}
              className="relative flex cursor-pointer items-start py-4 disabled:cursor-not-allowed"
            >
              {({ checked, disabled: optionDisabled }) => (
                <>
                  <div className="min-w-0 flex-1 text-sm/6">
                    <HeadlessRadioGroup.Label className="cursor-pointer font-medium text-foreground">
                      {option.name}
                    </HeadlessRadioGroup.Label>
                    {option.description && (
                      <HeadlessRadioGroup.Description className="text-muted-foreground">
                        {option.description}
                      </HeadlessRadioGroup.Description>
                    )}
                  </div>
                  <div className="ml-3 flex h-6 items-center">
                    <div className={getRadioStyles(checked, optionDisabled)} aria-hidden="true" />
                  </div>
                </>
              )}
            </HeadlessRadioGroup.Option>
          ))}
        </div>
      </HeadlessRadioGroup>
    );
  }

  // Simple list with radio on right variant
  if (variant === 'simple-right-radio-list') {
    return (
      <HeadlessRadioGroup
        value={currentValue}
        onChange={handleChange}
        disabled={disabled}
        className={className}
        name={name}
      >
        {legend && (
          <HeadlessRadioGroup.Label className="text-sm/6 font-semibold text-foreground">
            {legend}
          </HeadlessRadioGroup.Label>
        )}
        {description && (
          <HeadlessRadioGroup.Description className="text-muted-foreground mt-1 text-sm/6">
            {description}
          </HeadlessRadioGroup.Description>
        )}
        <div className="mt-4 divide-y divide-border border-t border-b border-border">
          {options.map(option => (
            <HeadlessRadioGroup.Option
              key={option.id}
              value={option.value ?? option.id}
              disabled={option.disabled}
              className="relative flex cursor-pointer items-start py-4 disabled:cursor-not-allowed"
            >
              {({ checked, disabled: optionDisabled }) => (
                <>
                  <div className="min-w-0 flex-1 text-sm/6">
                    <HeadlessRadioGroup.Label className="cursor-pointer font-medium text-foreground select-none">
                      {option.name}
                    </HeadlessRadioGroup.Label>
                  </div>
                  <div className="ml-3 flex h-6 items-center">
                    <div className={getRadioStyles(checked, optionDisabled)} aria-hidden="true" />
                  </div>
                </>
              )}
            </HeadlessRadioGroup.Option>
          ))}
        </div>
      </HeadlessRadioGroup>
    );
  }

  // Table variant
  if (variant === 'table') {
    return (
      <HeadlessRadioGroup
        value={currentValue}
        onChange={handleChange}
        disabled={disabled}
        className={clsx('relative -space-y-px rounded-md bg-surface', className)}
        name={name}
        aria-label={ariaLabel}
      >
        {options.map(option => (
          <HeadlessRadioGroup.Option
            key={option.id}
            value={option.value ?? option.id}
            disabled={option.disabled}
            className={({ checked }) =>
              clsx(
                'group flex cursor-pointer flex-col border border-border p-4',
                'first:rounded-tl-md first:rounded-tr-md last:rounded-br-md last:rounded-bl-md',
                'focus:outline-none',
                'disabled:cursor-not-allowed disabled:opacity-50',
                'md:grid md:grid-cols-3 md:pr-6 md:pl-4',
                {
                  'relative z-10 border-primary bg-primary/10': checked,
                }
              )
            }
          >
            {({ checked, disabled: optionDisabled }) => (
              <>
                <span className="flex items-center gap-3 text-sm">
                  <div className={getRadioStyles(checked, optionDisabled)} aria-hidden="true" />
                  <span className={clsx('font-medium text-foreground', { 'text-primary': checked })}>
                    {option.name}
                  </span>
                </span>
                {option.extraInfo && (
                  <span className="ml-6 pl-1 text-sm md:ml-0 md:pl-0 md:text-center">
                    <span className={clsx('font-medium text-foreground', { 'text-primary': checked })}>
                      {option.extraInfo}
                    </span>
                    {option.description && (
                      <>
                        {' '}
                        <span className={clsx('text-muted-foreground', { 'text-primary/75': checked })}>
                          ({option.description})
                        </span>
                      </>
                    )}
                  </span>
                )}
                {option.additionalInfo && (
                  <span
                    className={clsx('text-muted-foreground ml-6 pl-1 text-sm md:ml-0 md:pl-0 md:text-right', {
                      'text-primary/75': checked,
                    })}
                  >
                    {option.additionalInfo}
                  </span>
                )}
              </>
            )}
          </HeadlessRadioGroup.Option>
        ))}
      </HeadlessRadioGroup>
    );
  }

  // Panel variant
  if (variant === 'panel') {
    return (
      <HeadlessRadioGroup
        value={currentValue}
        onChange={handleChange}
        disabled={disabled}
        className={clsx('-space-y-px rounded-md bg-surface', className)}
        name={name}
        aria-label={ariaLabel}
      >
        {options.map(option => (
          <HeadlessRadioGroup.Option
            key={option.id}
            value={option.value ?? option.id}
            disabled={option.disabled}
            className={({ checked }) =>
              clsx(
                'group flex cursor-pointer border border-border p-4',
                'first:rounded-tl-md first:rounded-tr-md last:rounded-br-md last:rounded-bl-md',
                'focus:outline-none',
                'disabled:cursor-not-allowed disabled:opacity-50',
                {
                  'relative z-10 border-primary bg-primary/10': checked,
                }
              )
            }
          >
            {({ checked, disabled: optionDisabled }) => (
              <>
                <div
                  className={clsx('relative mt-0.5 shrink-0', getRadioStyles(checked, optionDisabled))}
                  aria-hidden="true"
                />
                <span className="ml-3 flex flex-col">
                  <HeadlessRadioGroup.Label
                    className={clsx('block text-sm font-medium text-foreground', { 'text-primary': checked })}
                  >
                    {option.name}
                  </HeadlessRadioGroup.Label>
                  {option.description && (
                    <HeadlessRadioGroup.Description
                      className={clsx('text-muted-foreground block text-sm', { 'text-primary/75': checked })}
                    >
                      {option.description}
                    </HeadlessRadioGroup.Description>
                  )}
                </span>
              </>
            )}
          </HeadlessRadioGroup.Option>
        ))}
      </HeadlessRadioGroup>
    );
  }

  // Picker variant
  if (variant === 'picker') {
    return (
      <HeadlessRadioGroup
        value={currentValue}
        onChange={handleChange}
        disabled={disabled}
        className={className}
        name={name}
      >
        {legend && (
          <HeadlessRadioGroup.Label className="block text-sm/6 font-semibold text-foreground">
            {legend}
          </HeadlessRadioGroup.Label>
        )}
        <div className="mt-6 flex items-center gap-x-3">
          {options.map(option => (
            <HeadlessRadioGroup.Option
              key={option.id}
              value={option.value ?? option.id}
              disabled={option.disabled}
              className={() =>
                clsx(
                  'flex cursor-pointer rounded-full outline -outline-offset-1 outline-border',
                  'disabled:cursor-not-allowed disabled:opacity-50'
                )
              }
            >
              {({ checked }) => (
                <div
                  className={clsx(
                    'size-8 rounded-full',
                    option.classes || 'bg-primary',
                    {
                      'outline-2 outline-offset-2': checked,
                    },
                    'focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-primary'
                  )}
                  aria-label={option.name}
                />
              )}
            </HeadlessRadioGroup.Option>
          ))}
        </div>
      </HeadlessRadioGroup>
    );
  }

  // Cards variant
  if (variant === 'cards') {
    return (
      <HeadlessRadioGroup
        value={currentValue}
        onChange={handleChange}
        disabled={disabled}
        className={className}
        name={name}
      >
        {legend && (
          <HeadlessRadioGroup.Label className="text-sm/6 font-semibold text-foreground">
            {legend}
          </HeadlessRadioGroup.Label>
        )}
        <div className="mt-6 grid grid-cols-1 gap-y-6 sm:grid-cols-3 sm:gap-x-4">
          {options.map(option => (
            <HeadlessRadioGroup.Option
              key={option.id}
              value={option.value ?? option.id}
              disabled={option.disabled}
              className={({ checked, focus }) =>
                clsx(
                  'group relative flex cursor-pointer rounded-lg border border-border bg-surface p-4',
                  'disabled:cursor-not-allowed disabled:border-muted disabled:bg-muted disabled:opacity-25',
                  {
                    'outline-2 -outline-offset-2 outline-primary': checked,
                    'outline-3 -outline-offset-1 outline-primary': focus,
                  }
                )
              }
            >
              {({ checked }) => (
                <>
                  <div className="flex-1">
                    <HeadlessRadioGroup.Label className="block text-sm font-medium text-foreground">
                      {option.name}
                    </HeadlessRadioGroup.Label>
                    {option.description && (
                      <HeadlessRadioGroup.Description className="text-muted-foreground mt-1 block text-sm">
                        {option.description}
                      </HeadlessRadioGroup.Description>
                    )}
                    {option.extraInfo && (
                      <span className="mt-6 block text-sm font-medium text-foreground">{option.extraInfo}</span>
                    )}
                  </div>
                  <CheckCircleIcon
                    aria-hidden="true"
                    className={clsx('size-5 text-primary', {
                      visible: checked,
                      invisible: !checked,
                    })}
                  />
                </>
              )}
            </HeadlessRadioGroup.Option>
          ))}
        </div>
      </HeadlessRadioGroup>
    );
  }

  // Small cards variant
  if (variant === 'small-cards') {
    return (
      <HeadlessRadioGroup
        value={currentValue}
        onChange={handleChange}
        disabled={disabled}
        className={className}
        name={name}
        aria-label={ariaLabel}
      >
        {legend && (
          <div className="flex items-center justify-between">
            <HeadlessRadioGroup.Label className="text-sm/6 font-medium text-foreground">
              {legend}
            </HeadlessRadioGroup.Label>
            {description && (
              <div className="text-sm/6 font-medium text-primary hover:text-primary/75">{description}</div>
            )}
          </div>
        )}
        <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {options.map(option => (
            <HeadlessRadioGroup.Option
              key={option.id}
              value={option.value ?? option.id}
              disabled={option.disabled}
              className={({ checked, focus }) =>
                clsx(
                  'group relative flex cursor-pointer items-center justify-center rounded-md border border-border bg-surface p-3',
                  'disabled:cursor-not-allowed disabled:border-muted disabled:bg-muted disabled:opacity-25',
                  {
                    'border-primary bg-primary': checked,
                    'outline-2 outline-offset-2 outline-primary': focus,
                  }
                )
              }
            >
              {({ checked }) => (
                <HeadlessRadioGroup.Label
                  className={clsx('text-sm font-medium uppercase', checked ? 'text-background' : 'text-foreground')}
                >
                  {option.name}
                </HeadlessRadioGroup.Label>
              )}
            </HeadlessRadioGroup.Option>
          ))}
        </div>
      </HeadlessRadioGroup>
    );
  }

  // Stacked cards variant
  if (variant === 'stacked-cards') {
    return (
      <HeadlessRadioGroup
        value={currentValue}
        onChange={handleChange}
        disabled={disabled}
        className={className}
        name={name}
        aria-label={ariaLabel}
      >
        <div className="space-y-4">
          {options.map(option => (
            <HeadlessRadioGroup.Option
              key={option.id}
              value={option.value ?? option.id}
              disabled={option.disabled}
              className={({ checked, focus }) =>
                clsx(
                  'group relative block cursor-pointer rounded-lg border border-border bg-surface px-6 py-4',
                  'sm:flex sm:justify-between',
                  'disabled:cursor-not-allowed disabled:opacity-50',
                  {
                    'outline-2 -outline-offset-2 outline-primary': checked,
                    'outline-3 -outline-offset-1 outline-primary': focus,
                  }
                )
              }
            >
              <span className="flex items-center">
                <span className="flex flex-col text-sm">
                  <HeadlessRadioGroup.Label className="font-medium text-foreground">
                    {option.name}
                  </HeadlessRadioGroup.Label>
                  {option.description && (
                    <HeadlessRadioGroup.Description className="text-muted-foreground">
                      {option.description}
                    </HeadlessRadioGroup.Description>
                  )}
                </span>
              </span>
              {option.extraInfo && (
                <span className="mt-2 flex text-sm sm:mt-0 sm:ml-4 sm:flex-col sm:text-right">
                  <span className="font-medium text-foreground">{option.extraInfo}</span>
                  {option.additionalInfo && (
                    <span className="text-muted-foreground ml-1 sm:ml-0">{option.additionalInfo}</span>
                  )}
                </span>
              )}
            </HeadlessRadioGroup.Option>
          ))}
        </div>
      </HeadlessRadioGroup>
    );
  }

  return <></>;
}
