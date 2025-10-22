import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import type { Popover as HeadlessPopover, PopoverPanel as HeadlessPopoverPanel } from '@headlessui/react';
import type { ButtonProps } from '@/components/Elements/Button/Button.types';

export interface PopoverProps extends ComponentPropsWithoutRef<typeof HeadlessPopover> {
  /**
   * Popover content
   */
  children: ReactNode;
}

export interface PopoverButtonProps extends ButtonProps {
  /**
   * Button content
   */
  children?: ReactNode;
}

export interface PopoverPanelProps extends ComponentPropsWithoutRef<typeof HeadlessPopoverPanel> {
  /**
   * Panel content
   */
  children: ReactNode;
}
