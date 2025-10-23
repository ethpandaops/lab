import { forwardRef, Children, isValidElement, cloneElement } from 'react';
import { clsx } from 'clsx';
import type { ButtonGroupProps } from './ButtonGroup.types';

const ButtonGroupRoot = forwardRef<HTMLSpanElement, ButtonGroupProps>(
  ({ children, className = '', rounded = false, ...props }, ref) => {
    const childArray = Children.toArray(children);
    const count = childArray.length;

    const childrenWithPosition = childArray.map((child, index) => {
      if (!isValidElement(child)) return child;

      const isFirst = index === 0;
      const isLast = index === count - 1;

      const positionClasses = clsx(
        // Rounded corners (only when rounded prop is true)
        rounded && isFirst && 'rounded-l-md !rounded-r-none',
        rounded && isLast && 'rounded-r-md !rounded-l-none',
        rounded && !isFirst && !isLast && '!rounded-none',
        // Square corners (when rounded prop is false)
        !rounded && '!rounded-none',
        // Negative margin for overlapping borders
        !isFirst && '-ml-px',
        // Remove individual button shadow (group has shadow)
        '!shadow-none',
        // Focus z-index
        'focus:z-10'
      );

      // Type-safe way to add className to existing element
      const childProps = child.props as { className?: string };
      return cloneElement(child, {
        className: clsx(childProps.className, positionClasses),
      } as Partial<{ className: string }>);
    });

    return (
      <span
        ref={ref}
        className={clsx('isolate inline-flex shadow-xs dark:shadow-none', rounded && 'rounded-md', className)}
        {...props}
      >
        {childrenWithPosition}
      </span>
    );
  }
);

ButtonGroupRoot.displayName = 'ButtonGroup';

export const ButtonGroup = ButtonGroupRoot;
