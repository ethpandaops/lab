import { Checkbox } from '@/components/Forms/Checkbox';
import { ListContainer, ListItem } from '@/components/Layout/ListContainer';
import type { CheckboxGroupProps } from './CheckboxGroup.types';

export function CheckboxGroup({
  legend,
  srOnlyLegend = false,
  options,
  variant = 'list',
  className = '',
  rounded = false,
}: CheckboxGroupProps): React.JSX.Element {
  // Render checkbox based on variant
  const renderCheckbox = (option: (typeof options)[0]): React.JSX.Element => {
    const descriptionId = option.description ? `${option.id}-description` : undefined;

    switch (variant) {
      case 'list':
        return (
          <ListItem key={option.id} className="flex gap-3">
            <div className="flex h-6 shrink-0 items-center">
              <Checkbox
                id={option.id}
                name={option.name}
                checked={option.checked}
                defaultChecked={option.defaultChecked}
                onChange={option.onChange}
                disabled={option.disabled}
                indeterminate={option.indeterminate}
                aria-describedby={descriptionId}
                rounded={rounded}
              />
            </div>
            <div className="text-sm/6">
              <label htmlFor={option.id} className="font-medium text-foreground">
                {option.label}
              </label>
              {option.description && (
                <p id={descriptionId} className="text-muted">
                  {option.description}
                </p>
              )}
            </div>
          </ListItem>
        );

      case 'list-inline':
        return (
          <ListItem key={option.id} className="flex gap-3">
            <div className="flex h-6 shrink-0 items-center">
              <Checkbox
                id={option.id}
                name={option.name}
                checked={option.checked}
                defaultChecked={option.defaultChecked}
                onChange={option.onChange}
                disabled={option.disabled}
                indeterminate={option.indeterminate}
                aria-describedby={descriptionId}
                rounded={rounded}
              />
            </div>
            <div className="text-sm/6">
              <label htmlFor={option.id} className="font-medium text-foreground">
                {option.label}
              </label>{' '}
              {option.description && (
                <span id={descriptionId} className="text-muted">
                  <span className="sr-only">{option.label} </span>
                  {option.description}
                </span>
              )}
            </div>
          </ListItem>
        );

      case 'list-right':
        return (
          <ListItem key={option.id} className="relative flex gap-3">
            <div className="min-w-0 flex-1 text-sm/6">
              <label htmlFor={option.id} className="font-medium text-foreground">
                {option.label}
              </label>
              {option.description && (
                <p id={descriptionId} className="text-muted">
                  {option.description}
                </p>
              )}
            </div>
            <div className="flex h-6 shrink-0 items-center">
              <Checkbox
                id={option.id}
                name={option.name}
                checked={option.checked}
                defaultChecked={option.defaultChecked}
                onChange={option.onChange}
                disabled={option.disabled}
                indeterminate={option.indeterminate}
                aria-describedby={descriptionId}
                rounded={rounded}
              />
            </div>
          </ListItem>
        );

      case 'simple':
        return (
          <ListItem key={option.id} className="relative flex gap-3">
            <div className="min-w-0 flex-1 text-sm/6">
              <label htmlFor={option.id} className="font-medium text-foreground select-none">
                {option.label}
              </label>
            </div>
            <div className="flex h-6 shrink-0 items-center">
              <Checkbox
                id={option.id}
                name={option.name}
                checked={option.checked}
                defaultChecked={option.defaultChecked}
                onChange={option.onChange}
                disabled={option.disabled}
                indeterminate={option.indeterminate}
                rounded={rounded}
              />
            </div>
          </ListItem>
        );

      default:
        return (
          <ListItem key={option.id}>
            <span>Invalid variant</span>
          </ListItem>
        );
    }
  };

  // Map CheckboxGroup variants to ListContainer configuration
  const getListContainerProps = (): {
    variant: 'simple';
    withDividers: boolean;
    compact: boolean;
    className?: string;
  } => {
    switch (variant) {
      case 'list':
        return {
          variant: 'simple' as const,
          withDividers: false,
          compact: true,
          className: 'space-y-5',
        };
      case 'list-inline':
        return {
          variant: 'simple' as const,
          withDividers: false,
          compact: true,
          className: 'space-y-5',
        };
      case 'list-right':
        return {
          variant: 'simple' as const,
          withDividers: true,
          compact: true,
          className: 'border-t border-b border-border',
        };
      case 'simple':
        return {
          variant: 'simple' as const,
          withDividers: true,
          compact: true,
          className: 'mt-4 border-t border-b border-border',
        };
      default:
        return {
          variant: 'simple' as const,
          withDividers: false,
          compact: true,
        };
    }
  };

  const listContainerProps = getListContainerProps();

  return (
    <fieldset className={className}>
      {legend && (
        <legend className={srOnlyLegend ? 'sr-only' : 'text-base font-semibold text-foreground'}>{legend}</legend>
      )}
      <ListContainer {...listContainerProps}>{options.map(renderCheckbox)}</ListContainer>
    </fieldset>
  );
}
