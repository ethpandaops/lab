import type { ReactNode } from 'react';

export type DividerAlignment = 'center' | 'left';
export type DividerVariant = 'label' | 'icon' | 'title' | 'button' | 'toolbar';

export interface DividerProps {
  /**
   * The content to display with the divider
   */
  children?: ReactNode;

  /**
   * Alignment of the content
   * @default 'center'
   */
  alignment?: DividerAlignment;

  /**
   * Variant type of the divider
   */
  variant?: DividerVariant;

  /**
   * Button component (for 'button' variant)
   * Pass a Button component from @/components/Button
   */
  button?: ReactNode;

  /**
   * Toolbar buttons (for 'toolbar' variant)
   * Pass a ButtonGroup component from @/components/ButtonGroup
   */
  toolbarButtons?: ReactNode;

  /**
   * Additional CSS classes
   */
  className?: string;
}
