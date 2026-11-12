import { type JSX } from 'react';
import clsx from 'clsx';
import type { BadgeProps, BadgeColor, BadgeVariant } from './Badge.types';

interface ColorClasses {
  border: string;
  flat: string;
  dotFill: string;
  removeButton: {
    hover: string;
    stroke: string;
  };
}

/** green, orange and red are status colours and use the theme's status tokens; the rest are category tags */
const colorStyles: Record<BadgeColor, ColorClasses> = {
  gray: {
    border: 'bg-tag-gray-wash text-tag-gray inset-ring inset-ring-tag-gray-ring',
    flat: 'bg-tag-gray-bg text-tag-gray',
    dotFill: 'fill-tag-gray-fill',
    removeButton: {
      hover: 'hover:bg-tag-gray-hover',
      stroke: 'stroke-tag-gray-stroke group-hover:stroke-tag-gray-stroke-hover',
    },
  },
  red: {
    border: 'bg-danger-10 text-danger inset-ring inset-ring-danger-20',
    flat: 'bg-danger-15 text-danger',
    dotFill: 'fill-danger',
    removeButton: {
      hover: 'hover:bg-danger-20',
      stroke: 'stroke-danger-50 group-hover:stroke-danger-75',
    },
  },
  orange: {
    border: 'bg-warning-10 text-warning inset-ring inset-ring-warning-20',
    flat: 'bg-warning-15 text-warning',
    dotFill: 'fill-warning',
    removeButton: {
      hover: 'hover:bg-warning-20',
      stroke: 'stroke-warning-50 group-hover:stroke-warning-75',
    },
  },
  yellow: {
    border: 'bg-tag-yellow-wash text-tag-yellow inset-ring inset-ring-tag-yellow-ring',
    flat: 'bg-tag-yellow-bg text-tag-yellow',
    dotFill: 'fill-tag-yellow-fill',
    removeButton: {
      hover: 'hover:bg-tag-yellow-hover',
      stroke: 'stroke-tag-yellow-stroke group-hover:stroke-tag-yellow-stroke-hover',
    },
  },
  green: {
    border: 'bg-success-10 text-success inset-ring inset-ring-success-20',
    flat: 'bg-success-15 text-success',
    dotFill: 'fill-success',
    removeButton: {
      hover: 'hover:bg-success-20',
      stroke: 'stroke-success-50 group-hover:stroke-success-75',
    },
  },
  teal: {
    border: 'bg-tag-teal-wash text-tag-teal inset-ring inset-ring-tag-teal-ring',
    flat: 'bg-tag-teal-bg text-tag-teal',
    dotFill: 'fill-tag-teal-fill',
    removeButton: {
      hover: 'hover:bg-tag-teal-hover',
      stroke: 'stroke-tag-teal-stroke group-hover:stroke-tag-teal-stroke-hover',
    },
  },
  blue: {
    border: 'bg-tag-blue-wash text-tag-blue inset-ring inset-ring-tag-blue-ring',
    flat: 'bg-tag-blue-bg text-tag-blue',
    dotFill: 'fill-tag-blue-fill',
    removeButton: {
      hover: 'hover:bg-tag-blue-hover',
      stroke: 'stroke-tag-blue-stroke group-hover:stroke-tag-blue-stroke-hover',
    },
  },
  indigo: {
    border: 'bg-tag-indigo-wash text-tag-indigo inset-ring inset-ring-tag-indigo-ring',
    flat: 'bg-tag-indigo-bg text-tag-indigo',
    dotFill: 'fill-tag-indigo-fill',
    removeButton: {
      hover: 'hover:bg-tag-indigo-hover',
      stroke: 'stroke-tag-indigo-stroke group-hover:stroke-tag-indigo-stroke-hover',
    },
  },
  purple: {
    border: 'bg-tag-purple-wash text-tag-purple inset-ring inset-ring-tag-purple-ring',
    flat: 'bg-tag-purple-bg text-tag-purple',
    dotFill: 'fill-tag-purple-fill',
    removeButton: {
      hover: 'hover:bg-tag-purple-hover',
      stroke: 'stroke-tag-purple-stroke group-hover:stroke-tag-purple-stroke-hover',
    },
  },
  pink: {
    border: 'bg-tag-pink-wash text-tag-pink inset-ring inset-ring-tag-pink-ring',
    flat: 'bg-tag-pink-bg text-tag-pink',
    dotFill: 'fill-tag-pink-fill',
    removeButton: {
      hover: 'hover:bg-tag-pink-hover',
      stroke: 'stroke-tag-pink-stroke group-hover:stroke-tag-pink-stroke-hover',
    },
  },
};

// Special styling for dot badges with border variant
const dotBorderClasses = 'text-foreground inset-ring inset-ring-border';

export function Badge({
  children,
  color = 'gray',
  variant = 'border',
  size = 'default',
  pill = false,
  dot = false,
  onRemove,
  truncate = false,
  className,
}: BadgeProps): JSX.Element {
  const styles = colorStyles[color];
  const hasDot = dot;
  const hasRemoveButton = !!onRemove;

  // Base classes
  const baseClasses = 'inline-flex items-center text-xs font-medium';

  // Size classes
  const sizeClasses = size === 'small' ? 'px-1.5 py-0.5' : 'px-2 py-1';

  // Shape classes
  const shapeClasses = pill ? 'rounded-full' : 'rounded-xs';

  // Gap classes
  const gapClasses = hasDot ? 'gap-x-1.5' : hasRemoveButton ? 'gap-x-0.5' : '';

  // Color and variant classes
  const colorClasses = getColorClasses(variant, styles, hasDot);

  // Truncate classes
  const truncateClasses = truncate ? 'max-w-32 truncate' : '';

  return (
    <span
      className={clsx(baseClasses, sizeClasses, shapeClasses, gapClasses, colorClasses, truncateClasses, className)}
    >
      {hasDot && (
        <svg viewBox="0 0 6 6" aria-hidden="true" className={clsx('size-1.5', styles.dotFill)}>
          <circle r={3} cx={3} cy={3} />
        </svg>
      )}
      {children}
      {hasRemoveButton && (
        <button
          type="button"
          onClick={onRemove}
          className={clsx('group relative -mr-1 size-3.5 rounded-xs', styles.removeButton.hover)}
        >
          <span className="sr-only">Remove</span>
          <svg viewBox="0 0 14 14" className={clsx('size-3.5', styles.removeButton.stroke)}>
            <path d="M4 4l6 6m0-6l-6 6" />
          </svg>
          <span className="absolute -inset-1" />
        </button>
      )}
    </span>
  );
}

function getColorClasses(variant: BadgeVariant, styles: ColorClasses, hasDot: boolean): string {
  // When using dot with border variant, use neutral colors with inset-ring
  if (hasDot && variant === 'border') {
    return dotBorderClasses;
  }

  // When using dot with flat variant, use the regular flat styles (no special treatment needed)
  // Otherwise use the appropriate variant styles
  return variant === 'border' ? styles.border : styles.flat;
}
