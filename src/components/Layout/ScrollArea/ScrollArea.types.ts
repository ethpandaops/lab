import type * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area';
import type { ComponentPropsWithoutRef } from 'react';

/**
 * Props for the ScrollArea component
 */
export interface ScrollAreaProps extends ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> {
  /**
   * Scroll direction(s) to enable.
   * - 'vertical': Only vertical scrollbar (default)
   * - 'horizontal': Only horizontal scrollbar
   * - 'both': Both vertical and horizontal scrollbars
   */
  orientation?: 'vertical' | 'horizontal' | 'both';

  /**
   * When true, converts vertical wheel scrolling to horizontal scrolling.
   * Useful for horizontal-only scroll areas.
   */
  scrollHorizontalWithWheel?: boolean;
}

/**
 * Props for the ScrollBar component
 */
export type ScrollBarProps = ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>;
