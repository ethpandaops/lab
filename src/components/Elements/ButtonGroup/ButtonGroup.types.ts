import type { ComponentPropsWithoutRef, ReactNode, Ref } from 'react';

export interface ButtonGroupProps extends ComponentPropsWithoutRef<'span'> {
  /**
   * Ref to the group's span element
   */
  ref?: Ref<HTMLSpanElement>;
  /**
   * Button elements to group together (use Button components from @/components/Button)
   */
  children: ReactNode;
  /**
   * Apply rounded corners to the button group. Default: true
   */
  rounded?: boolean;
}
