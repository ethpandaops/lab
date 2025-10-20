import { CheckCircleIcon } from '@heroicons/react/20/solid';
import { type RadioGroupProps } from './RadioGroup.types';

function classNames(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

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
}: RadioGroupProps): React.JSX.Element | null {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    onChange?.(e.target.value);
  };

  // Base radio input styles used across most variants
  const baseRadioStyles =
    'relative size-4 appearance-none rounded-full border border-border bg-background before:absolute before:inset-1 before:rounded-full before:bg-background not-checked:before:hidden checked:border-primary checked:bg-primary checked:before:bg-background focus-visible:outline-2 focus-visible:outline-primary disabled:border-border/50 disabled:bg-surface disabled:before:bg-muted dark:border-zinc-600 forced-colors:appearance-auto forced-colors:before:hidden';

  // Simple list variant
  if (variant === 'simple-list') {
    return (
      <fieldset className={className} disabled={disabled}>
        {legend && <legend className="text-sm/6 font-semibold text-foreground">{legend}</legend>}
        {description && <p className="text-muted-foreground mt-1 text-sm/6">{description}</p>}
        <div className="mt-6 space-y-6">
          {options.map(option => (
            <div key={option.id} className="flex items-center">
              <input
                id={option.id}
                name={name}
                type="radio"
                value={option.value ?? option.id}
                defaultChecked={defaultValue === (option.value ?? option.id)}
                checked={value === (option.value ?? option.id)}
                onChange={handleChange}
                disabled={option.disabled}
                className={baseRadioStyles}
              />
              <label htmlFor={option.id} className="ml-3 block text-sm/6 font-medium text-foreground">
                {option.title ?? option.name}
              </label>
            </div>
          ))}
        </div>
      </fieldset>
    );
  }

  // Simple inline list variant
  if (variant === 'simple-inline') {
    return (
      <fieldset className={className} disabled={disabled}>
        {legend && <legend className="text-sm/6 font-semibold text-foreground">{legend}</legend>}
        {description && <p className="text-muted-foreground mt-1 text-sm/6">{description}</p>}
        <div className="mt-6 space-y-6 sm:flex sm:items-center sm:space-y-0 sm:space-x-10">
          {options.map(option => (
            <div key={option.id} className="flex items-center">
              <input
                id={option.id}
                name={name}
                type="radio"
                value={option.value ?? option.id}
                defaultChecked={defaultValue === (option.value ?? option.id)}
                checked={value === (option.value ?? option.id)}
                onChange={handleChange}
                disabled={option.disabled}
                className={baseRadioStyles}
              />
              <label htmlFor={option.id} className="ml-3 block text-sm/6 font-medium text-foreground">
                {option.title ?? option.name}
              </label>
            </div>
          ))}
        </div>
      </fieldset>
    );
  }

  // List with description variant
  if (variant === 'description-list') {
    return (
      <fieldset aria-label={ariaLabel} className={className} disabled={disabled}>
        {legend && <legend className="text-sm/6 font-semibold text-foreground">{legend}</legend>}
        {description && <p className="text-muted-foreground mt-1 text-sm/6">{description}</p>}
        <div className="space-y-5">
          {options.map(option => (
            <div key={option.id} className="relative flex items-start">
              <div className="flex h-6 items-center">
                <input
                  id={option.id}
                  name={name}
                  type="radio"
                  value={option.value ?? option.id}
                  defaultChecked={defaultValue === (option.value ?? option.id)}
                  checked={value === (option.value ?? option.id)}
                  onChange={handleChange}
                  disabled={option.disabled}
                  aria-describedby={option.description ? `${option.id}-description` : undefined}
                  className={baseRadioStyles}
                />
              </div>
              <div className="ml-3 text-sm/6">
                <label htmlFor={option.id} className="font-medium text-foreground">
                  {option.name}
                </label>
                {option.description && (
                  <p id={`${option.id}-description`} className="text-muted-foreground">
                    {option.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </fieldset>
    );
  }

  // List with inline description variant
  if (variant === 'inline-description-list') {
    return (
      <fieldset aria-label={ariaLabel} className={className} disabled={disabled}>
        {legend && <legend className="text-sm/6 font-semibold text-foreground">{legend}</legend>}
        {description && <p className="text-muted-foreground mt-1 text-sm/6">{description}</p>}
        <div className="space-y-5">
          {options.map(option => (
            <div key={option.id} className="relative flex items-start">
              <div className="flex h-6 items-center">
                <input
                  id={option.id}
                  name={name}
                  type="radio"
                  value={option.value ?? option.id}
                  defaultChecked={defaultValue === (option.value ?? option.id)}
                  checked={value === (option.value ?? option.id)}
                  onChange={handleChange}
                  disabled={option.disabled}
                  aria-describedby={option.description ? `${option.id}-description` : undefined}
                  className={baseRadioStyles}
                />
              </div>
              <div className="ml-3 text-sm/6">
                <label htmlFor={option.id} className="font-medium text-foreground">
                  {option.name}
                </label>{' '}
                {option.description && (
                  <span id={`${option.id}-description`} className="text-muted-foreground">
                    {option.description}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </fieldset>
    );
  }

  // List with radio on right variant
  if (variant === 'right-radio-list') {
    return (
      <fieldset className={className} disabled={disabled}>
        {legend && <legend className="text-sm/6 font-semibold text-foreground">{legend}</legend>}
        {description && <p className="text-muted-foreground mt-1 text-sm/6">{description}</p>}
        <div className="mt-2.5 divide-y divide-border">
          {options.map(option => (
            <div key={option.id} className="relative flex items-start pt-3.5 pb-4">
              <div className="min-w-0 flex-1 text-sm/6">
                <label htmlFor={option.id} className="font-medium text-foreground">
                  {option.name}
                </label>
                {option.description && (
                  <p id={`${option.id}-description`} className="text-muted-foreground">
                    {option.description}
                  </p>
                )}
              </div>
              <div className="ml-3 flex h-6 items-center">
                <input
                  id={option.id}
                  name={name}
                  type="radio"
                  value={option.value ?? option.id}
                  defaultChecked={defaultValue === (option.value ?? option.id)}
                  checked={value === (option.value ?? option.id)}
                  onChange={handleChange}
                  disabled={option.disabled}
                  aria-describedby={option.description ? `${option.id}-description` : undefined}
                  className={baseRadioStyles}
                />
              </div>
            </div>
          ))}
        </div>
      </fieldset>
    );
  }

  // Simple list with radio on right variant
  if (variant === 'simple-right-radio-list') {
    return (
      <fieldset className={className} disabled={disabled}>
        {legend && <legend className="text-sm/6 font-semibold text-foreground">{legend}</legend>}
        {description && <p className="text-muted-foreground mt-1 text-sm/6">{description}</p>}
        <div className="mt-4 divide-y divide-border border-t border-b border-border">
          {options.map(option => (
            <div key={option.id} className="relative flex items-start py-4">
              <div className="min-w-0 flex-1 text-sm/6">
                <label htmlFor={option.id} className="font-medium text-foreground select-none">
                  {option.name}
                </label>
              </div>
              <div className="ml-3 flex h-6 items-center">
                <input
                  id={option.id}
                  name={name}
                  type="radio"
                  value={option.value ?? option.id}
                  defaultChecked={defaultValue === (option.value ?? option.id)}
                  checked={value === (option.value ?? option.id)}
                  onChange={handleChange}
                  disabled={option.disabled}
                  className={baseRadioStyles}
                />
              </div>
            </div>
          ))}
        </div>
      </fieldset>
    );
  }

  // Table variant
  if (variant === 'table') {
    return (
      <fieldset
        aria-label={ariaLabel}
        className={classNames('relative -space-y-px rounded-md bg-surface', className)}
        disabled={disabled}
      >
        {options.map(option => (
          <label
            key={option.id}
            aria-label={option.name}
            aria-description={option.description}
            className="group flex flex-col border border-border p-4 first:rounded-tl-md first:rounded-tr-md last:rounded-br-md last:rounded-bl-md focus:outline-hidden has-checked:relative has-checked:border-primary has-checked:bg-primary/10 md:grid md:grid-cols-3 md:pr-6 md:pl-4"
          >
            <span className="flex items-center gap-3 text-sm">
              <input
                id={option.id}
                name={name}
                type="radio"
                value={option.value ?? option.id}
                defaultChecked={defaultValue === (option.value ?? option.id)}
                checked={value === (option.value ?? option.id)}
                onChange={handleChange}
                disabled={option.disabled}
                className={baseRadioStyles}
              />
              <span className="font-medium text-foreground group-has-checked:text-primary">{option.name}</span>
            </span>
            {option.extraInfo && (
              <span className="ml-6 pl-1 text-sm md:ml-0 md:pl-0 md:text-center">
                <span className="font-medium text-foreground group-has-checked:text-primary">{option.extraInfo}</span>
                {option.description && (
                  <>
                    {' '}
                    <span className="text-muted-foreground group-has-checked:text-primary/75">
                      ({option.description})
                    </span>
                  </>
                )}
              </span>
            )}
            {option.additionalInfo && (
              <span className="text-muted-foreground ml-6 pl-1 text-sm group-has-checked:text-primary/75 md:ml-0 md:pl-0 md:text-right">
                {option.additionalInfo}
              </span>
            )}
          </label>
        ))}
      </fieldset>
    );
  }

  // Panel variant
  if (variant === 'panel') {
    return (
      <fieldset
        aria-label={ariaLabel}
        className={classNames('-space-y-px rounded-md bg-surface', className)}
        disabled={disabled}
      >
        {options.map(option => (
          <label
            key={option.id}
            aria-label={option.name}
            aria-description={option.description}
            className="group flex border border-border p-4 first:rounded-tl-md first:rounded-tr-md last:rounded-br-md last:rounded-bl-md focus:outline-hidden has-checked:relative has-checked:border-primary has-checked:bg-primary/10"
          >
            <input
              id={option.id}
              name={name}
              type="radio"
              value={option.value ?? option.id}
              defaultChecked={defaultValue === (option.value ?? option.id)}
              checked={value === (option.value ?? option.id)}
              onChange={handleChange}
              disabled={option.disabled}
              className="relative mt-0.5 size-4 shrink-0 appearance-none rounded-full border border-border bg-background before:absolute before:inset-1 before:rounded-full before:bg-background not-checked:before:hidden checked:border-primary checked:bg-primary checked:before:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:border-border/50 disabled:bg-surface disabled:before:bg-muted dark:border-zinc-600 forced-colors:appearance-auto forced-colors:before:hidden"
            />
            <span className="ml-3 flex flex-col">
              <span className="block text-sm font-medium text-foreground group-has-checked:text-primary">
                {option.name}
              </span>
              {option.description && (
                <span className="text-muted-foreground block text-sm group-has-checked:text-primary/75">
                  {option.description}
                </span>
              )}
            </span>
          </label>
        ))}
      </fieldset>
    );
  }

  // Picker variant
  if (variant === 'picker') {
    return (
      <fieldset className={className} disabled={disabled}>
        {legend && <legend className="block text-sm/6 font-semibold text-foreground">{legend}</legend>}
        <div className="mt-6 flex items-center gap-x-3">
          {options.map(option => (
            <div key={option.id} className="flex rounded-full outline -outline-offset-1 outline-border">
              <input
                id={option.id}
                name={name}
                type="radio"
                value={option.value ?? option.id}
                defaultChecked={defaultValue === (option.value ?? option.id)}
                checked={value === (option.value ?? option.id)}
                onChange={handleChange}
                disabled={option.disabled}
                aria-label={option.name}
                className={classNames(
                  option.classes || 'bg-primary',
                  'size-8 appearance-none rounded-full border-0 bg-none forced-color-adjust-none checked:outline-2 checked:outline-offset-2 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-primary'
                )}
              />
            </div>
          ))}
        </div>
      </fieldset>
    );
  }

  // Cards variant
  if (variant === 'cards') {
    return (
      <fieldset className={className} disabled={disabled}>
        {legend && <legend className="text-sm/6 font-semibold text-foreground">{legend}</legend>}
        <div className="mt-6 grid grid-cols-1 gap-y-6 sm:grid-cols-3 sm:gap-x-4">
          {options.map(option => (
            <label
              key={option.id}
              aria-label={option.name}
              aria-description={option.description}
              className="group relative flex rounded-lg border border-border bg-surface p-4 has-checked:outline-2 has-checked:-outline-offset-2 has-checked:outline-primary has-focus-visible:outline-3 has-focus-visible:-outline-offset-1 has-focus-visible:outline-primary has-disabled:border-muted has-disabled:bg-muted has-disabled:opacity-25"
            >
              <input
                id={option.id}
                name={name}
                type="radio"
                value={option.value ?? option.id}
                defaultChecked={defaultValue === (option.value ?? option.id)}
                checked={value === (option.value ?? option.id)}
                onChange={handleChange}
                disabled={option.disabled}
                className="absolute inset-0 cursor-pointer appearance-none opacity-0 focus:outline-hidden"
              />
              <div className="flex-1">
                <span className="block text-sm font-medium text-foreground">{option.name}</span>
                {option.description && (
                  <span className="text-muted-foreground mt-1 block text-sm">{option.description}</span>
                )}
                {option.extraInfo && (
                  <span className="mt-6 block text-sm font-medium text-foreground">{option.extraInfo}</span>
                )}
              </div>
              <CheckCircleIcon aria-hidden="true" className="invisible size-5 text-primary group-has-checked:visible" />
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  // Small cards variant
  if (variant === 'small-cards') {
    return (
      <fieldset aria-label={ariaLabel} className={className} disabled={disabled}>
        {legend && (
          <div className="flex items-center justify-between">
            <div className="text-sm/6 font-medium text-foreground">{legend}</div>
            {description && (
              <div className="text-sm/6 font-medium text-primary hover:text-primary/75">{description}</div>
            )}
          </div>
        )}
        <div className="mt-2 grid grid-cols-3 gap-3 sm:grid-cols-6">
          {options.map(option => (
            <label
              key={option.id}
              aria-label={option.name}
              className="group relative flex items-center justify-center rounded-md border border-border bg-surface p-3 has-checked:border-primary has-checked:bg-primary has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary has-disabled:border-muted has-disabled:bg-muted has-disabled:opacity-25"
            >
              <input
                id={option.id}
                name={name}
                type="radio"
                value={option.value ?? option.id}
                defaultChecked={defaultValue === (option.value ?? option.id)}
                checked={value === (option.value ?? option.id)}
                onChange={handleChange}
                disabled={option.disabled}
                className="absolute inset-0 cursor-pointer appearance-none opacity-0 focus:outline-hidden disabled:cursor-not-allowed"
              />
              <span className="text-sm font-medium text-foreground uppercase group-has-checked:text-background">
                {option.name}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  // Stacked cards variant
  if (variant === 'stacked-cards') {
    return (
      <fieldset aria-label={ariaLabel} className={className} disabled={disabled}>
        <div className="space-y-4">
          {options.map(option => (
            <label
              key={option.id}
              aria-label={option.name}
              aria-description={option.description}
              className="group relative block rounded-lg border border-border bg-surface px-6 py-4 has-checked:outline-2 has-checked:-outline-offset-2 has-checked:outline-primary has-focus-visible:outline-3 has-focus-visible:-outline-offset-1 has-focus-visible:outline-primary sm:flex sm:justify-between"
            >
              <input
                id={option.id}
                name={name}
                type="radio"
                value={option.value ?? option.id}
                defaultChecked={defaultValue === (option.value ?? option.id)}
                checked={value === (option.value ?? option.id)}
                onChange={handleChange}
                disabled={option.disabled}
                className="absolute inset-0 cursor-pointer appearance-none opacity-0 focus:outline-hidden"
              />
              <span className="flex items-center">
                <span className="flex flex-col text-sm">
                  <span className="font-medium text-foreground">{option.name}</span>
                  {option.description && <span className="text-muted-foreground">{option.description}</span>}
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
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  // Default fallback to simple-list
  return null;
}
