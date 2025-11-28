import { type JSX, cloneElement, isValidElement } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import clsx from 'clsx';
import type { DropdownProps, DropdownItemProps, DropdownHeaderProps, DropdownSectionProps } from './Dropdown.types';

/**
 * Dropdown component using Headless UI Menu
 *
 * @example
 * ```tsx
 * <Dropdown trigger={<Button>Options</Button>}>
 *   <DropdownSection>
 *     <DropdownItem icon={<PencilIcon />}>Edit</DropdownItem>
 *     <DropdownItem icon={<TrashIcon />}>Delete</DropdownItem>
 *   </DropdownSection>
 * </Dropdown>
 * ```
 */
export function Dropdown({
  trigger,
  children,
  align = 'right',
  withDividers = false,
  className,
  menuProps,
}: DropdownProps): JSX.Element {
  return (
    <Menu as="div" className={clsx('relative inline-block', className)} {...menuProps}>
      {/* Render trigger as MenuButton if it's a valid element */}
      {isValidElement(trigger) ? <MenuButton as="div">{trigger}</MenuButton> : <MenuButton>{trigger}</MenuButton>}

      <MenuItems
        anchor={align === 'left' ? 'bottom start' : 'bottom end'}
        transition
        className={clsx(
          'z-50 mt-2 w-56 rounded-md bg-surface shadow-lg outline-1 outline-border [--anchor-gap:8px]',
          'transition data-closed:scale-95 data-closed:transform data-closed:opacity-0',
          'data-enter:duration-100 data-enter:ease-out data-leave:duration-75 data-leave:ease-in',
          'dark:bg-surface dark:shadow-none dark:-outline-offset-1 dark:outline-border',
          withDividers && 'divide-y divide-border dark:divide-border'
        )}
      >
        {children}
      </MenuItems>
    </Menu>
  );
}

/**
 * Dropdown item component
 *
 * @example
 * ```tsx
 * <DropdownItem icon={<PencilIcon />} onClick={() => console.log('Edit')}>
 *   Edit
 * </DropdownItem>
 * ```
 */
export function DropdownItem({
  children,
  icon,
  onClick,
  href,
  variant = 'default',
  disabled = false,
  className,
}: DropdownItemProps): JSX.Element {
  const itemClasses = clsx(
    'flex w-full items-center px-4 py-2 text-sm',
    'transition-colors duration-150',
    'data-focus:outline-hidden',
    variant === 'default' && [
      'text-foreground dark:text-muted',
      'data-focus:bg-background data-focus:text-foreground',
      'dark:data-focus:bg-muted/10 dark:data-focus:text-foreground',
    ],
    variant === 'danger' && [
      'text-danger dark:text-danger',
      'data-focus:bg-danger/10 data-focus:text-danger',
      'dark:data-focus:bg-danger/20',
    ],
    disabled && 'cursor-not-allowed opacity-50',
    className
  );

  const iconClasses = clsx(
    'mr-3 size-5',
    variant === 'default' && [
      'text-muted group-data-focus:text-muted',
      'dark:text-muted dark:group-data-focus:text-foreground',
    ],
    variant === 'danger' && 'text-danger'
  );

  // Render icon with appropriate styles
  const iconElement = icon
    ? cloneElement(icon as React.ReactElement<{ className?: string }>, {
        className: iconClasses,
      })
    : null;

  const content = (
    <>
      {iconElement}
      <span>{children}</span>
    </>
  );

  // Render as link if href is provided
  if (href) {
    return (
      <MenuItem disabled={disabled}>
        <a href={href} className={clsx(itemClasses, 'group')}>
          {content}
        </a>
      </MenuItem>
    );
  }

  // Render as button otherwise
  return (
    <MenuItem disabled={disabled}>
      <button type="button" onClick={onClick} className={clsx(itemClasses, 'group')} disabled={disabled}>
        {content}
      </button>
    </MenuItem>
  );
}

/**
 * Dropdown header component for displaying non-interactive header content
 *
 * @example
 * ```tsx
 * <DropdownHeader>
 *   <p className="text-sm text-muted">Signed in as</p>
 *   <p className="truncate text-sm font-medium">user@example.com</p>
 * </DropdownHeader>
 * ```
 */
export function DropdownHeader({ children, className }: DropdownHeaderProps): JSX.Element {
  return <div className={clsx('px-4 py-3', className)}>{children}</div>;
}

/**
 * Dropdown section component for grouping items with dividers
 *
 * @example
 * ```tsx
 * <DropdownSection>
 *   <DropdownItem>Edit</DropdownItem>
 *   <DropdownItem>Duplicate</DropdownItem>
 * </DropdownSection>
 * <DropdownSection>
 *   <DropdownItem variant="danger">Delete</DropdownItem>
 * </DropdownSection>
 * ```
 */
export function DropdownSection({ children, className }: DropdownSectionProps): JSX.Element {
  return <div className={clsx('py-1', className)}>{children}</div>;
}
