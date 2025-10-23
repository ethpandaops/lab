import type { JSX } from 'react';
import {
  Popover as HeadlessPopover,
  PopoverButton as HeadlessPopoverButton,
  PopoverPanel as HeadlessPopoverPanel,
} from '@headlessui/react';
import clsx from 'clsx';
import { Button } from '@/components/Elements/Button';
import type { PopoverProps, PopoverButtonProps, PopoverPanelProps } from './Popover.types';

/**
 * Popover component built on Headless UI's Popover
 *
 * A floating panel that displays content when triggered by a button.
 *
 * Features:
 * - Automatic positioning with anchor prop
 * - Click outside to close
 * - Keyboard support (Esc to close)
 * - Flexible trigger element (use `as` prop)
 * - Dark mode support
 *
 * @example
 * ```tsx
 * <Popover className="relative">
 *   <PopoverButton variant="primary">
 *     Solutions
 *   </PopoverButton>
 *   <PopoverPanel anchor="bottom" className="flex flex-col p-3">
 *     <a href="/analytics">Analytics</a>
 *     <a href="/engagement">Engagement</a>
 *   </PopoverPanel>
 * </Popover>
 * ```
 */
export function Popover({ children, className, ...props }: PopoverProps): JSX.Element {
  return (
    <HeadlessPopover className={className} {...props}>
      {children}
    </HeadlessPopover>
  );
}

/**
 * PopoverButton component - Button component wrapped with Headless UI's PopoverButton
 *
 * Inherits all Button component props (variant, size, rounded, icons, etc.)
 *
 * @example
 * ```tsx
 * <PopoverButton variant="primary" leadingIcon={<ChevronDownIcon />}>
 *   Open Menu
 * </PopoverButton>
 *
 * <PopoverButton variant="outline" size="sm">
 *   Options
 * </PopoverButton>
 * ```
 */
export function PopoverButton({ children, ...props }: PopoverButtonProps): JSX.Element {
  return (
    <HeadlessPopoverButton as={Button} {...props}>
      {children}
    </HeadlessPopoverButton>
  );
}

/**
 * PopoverPanel component for the floating content
 *
 * Features:
 * - Automatic positioning via anchor prop
 * - Styled with background, border, shadow
 * - Dark mode support
 * - Customizable via className
 *
 * @example
 * ```tsx
 * // No padding - content fills panel
 * <PopoverPanel anchor="bottom">
 *   <img src="/map.png" className="w-full" />
 * </PopoverPanel>
 *
 * // With padding via className
 * <PopoverPanel anchor="bottom" className="p-3">
 *   <button>Item 1</button>
 *   <button>Item 2</button>
 * </PopoverPanel>
 * ```
 */
export function PopoverPanel({ children, className, ...props }: PopoverPanelProps): JSX.Element {
  return (
    <HeadlessPopoverPanel
      className={clsx(
        'z-10 bg-surface shadow-sm',
        'outline-1 -outline-offset-1 outline-border',
        'dark:shadow-none',
        className
      )}
      {...props}
    >
      {children}
    </HeadlessPopoverPanel>
  );
}
