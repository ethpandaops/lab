import type { ComponentPropsWithoutRef, ReactNode } from 'react';

export interface ButtonGroupProps extends ComponentPropsWithoutRef<'span'> {
  /**
   * Button elements to group together (use Button components from @/components/Button)
   */
  children: ReactNode;
}
