import type { ReactNode, ComponentPropsWithoutRef } from 'react';
import type { Menu as HeadlessMenu } from '@headlessui/react';

export type DropdownAlign = 'left' | 'right';
export type DropdownItemVariant = 'default' | 'danger';

export interface DropdownProps {
  /**
   * The trigger button content or custom trigger element
   */
  trigger: ReactNode;

  /**
   * The dropdown menu items
   */
  children: ReactNode;

  /**
   * Alignment of the dropdown menu
   * @default 'right'
   */
  align?: DropdownAlign;

  /**
   * Whether to show dividers between sections
   * @default false
   */
  withDividers?: boolean;

  /**
   * Additional CSS classes for the dropdown container
   */
  className?: string;

  /**
   * Props to forward to the Headless UI Menu component
   */
  menuProps?: ComponentPropsWithoutRef<typeof HeadlessMenu>;
}

export interface DropdownItemProps {
  /**
   * The item content
   */
  children: ReactNode;

  /**
   * Optional leading icon
   */
  icon?: ReactNode;

  /**
   * Click handler
   */
  onClick?: () => void;

  /**
   * Link href (renders as anchor tag)
   */
  href?: string;

  /**
   * Visual variant
   * @default 'default'
   */
  variant?: DropdownItemVariant;

  /**
   * Whether the item is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export interface DropdownHeaderProps {
  /**
   * The header content (e.g., title, user info)
   */
  children: ReactNode;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export interface DropdownSectionProps {
  /**
   * Section items
   */
  children: ReactNode;

  /**
   * Additional CSS classes
   */
  className?: string;
}
