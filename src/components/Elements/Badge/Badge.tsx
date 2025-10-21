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

const colorStyles: Record<BadgeColor, ColorClasses> = {
  gray: {
    border:
      'bg-gray-50 text-gray-600 inset-ring inset-ring-gray-500/10 dark:bg-gray-400/10 dark:text-gray-400 dark:inset-ring-gray-400/20',
    flat: 'bg-gray-100 text-gray-600 dark:bg-gray-400/10 dark:text-gray-400',
    dotFill: 'fill-gray-400',
    removeButton: {
      hover: 'hover:bg-gray-500/20 dark:hover:bg-gray-500/30',
      stroke: 'stroke-gray-600/50 group-hover:stroke-gray-600/75 dark:stroke-gray-400 dark:group-hover:stroke-gray-300',
    },
  },
  red: {
    border:
      'bg-red-50 text-red-700 inset-ring inset-ring-red-600/10 dark:bg-red-400/10 dark:text-red-400 dark:inset-ring-red-400/20',
    flat: 'bg-red-100 text-red-700 dark:bg-red-400/10 dark:text-red-400',
    dotFill: 'fill-red-500 dark:fill-red-400',
    removeButton: {
      hover: 'hover:bg-red-600/20 dark:hover:bg-red-500/30',
      stroke: 'stroke-red-600/50 group-hover:stroke-red-600/75 dark:stroke-red-400 dark:group-hover:stroke-red-300',
    },
  },
  yellow: {
    border:
      'bg-yellow-50 text-yellow-800 inset-ring inset-ring-yellow-600/20 dark:bg-yellow-400/10 dark:text-yellow-500 dark:inset-ring-yellow-400/20',
    flat: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-400/10 dark:text-yellow-500',
    dotFill: 'fill-yellow-500 dark:fill-yellow-400',
    removeButton: {
      hover: 'hover:bg-yellow-600/20 dark:hover:bg-yellow-500/30',
      stroke:
        'stroke-yellow-700/50 group-hover:stroke-yellow-700/75 dark:stroke-yellow-300 dark:group-hover:stroke-yellow-200',
    },
  },
  green: {
    border:
      'bg-green-50 text-green-700 inset-ring inset-ring-green-600/20 dark:bg-green-400/10 dark:text-green-400 dark:inset-ring-green-500/20',
    flat: 'bg-green-100 text-green-700 dark:bg-green-400/10 dark:text-green-400',
    dotFill: 'fill-green-500 dark:fill-green-400',
    removeButton: {
      hover: 'hover:bg-green-600/20 dark:hover:bg-green-500/30',
      stroke:
        'stroke-green-700/50 group-hover:stroke-green-700/75 dark:stroke-green-400 dark:group-hover:stroke-green-300',
    },
  },
  blue: {
    border:
      'bg-blue-50 text-blue-700 inset-ring inset-ring-blue-700/10 dark:bg-blue-400/10 dark:text-blue-400 dark:inset-ring-blue-400/30',
    flat: 'bg-blue-100 text-blue-700 dark:bg-blue-400/10 dark:text-blue-400',
    dotFill: 'fill-blue-500 dark:fill-blue-400',
    removeButton: {
      hover: 'hover:bg-blue-600/20 dark:hover:bg-blue-500/30',
      stroke: 'stroke-blue-700/50 group-hover:stroke-blue-700/75 dark:stroke-blue-400 dark:group-hover:stroke-blue-300',
    },
  },
  indigo: {
    border:
      'bg-indigo-50 text-indigo-700 inset-ring inset-ring-indigo-700/10 dark:bg-indigo-400/10 dark:text-indigo-400 dark:inset-ring-indigo-400/30',
    flat: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-400/10 dark:text-indigo-400',
    dotFill: 'fill-indigo-500 dark:fill-indigo-400',
    removeButton: {
      hover: 'hover:bg-indigo-600/20 dark:hover:bg-indigo-500/30',
      stroke:
        'stroke-indigo-600/50 group-hover:stroke-indigo-600/75 dark:stroke-indigo-400 dark:group-hover:stroke-indigo-300',
    },
  },
  purple: {
    border:
      'bg-purple-50 text-purple-700 inset-ring inset-ring-purple-700/10 dark:bg-purple-400/10 dark:text-purple-400 dark:inset-ring-purple-400/30',
    flat: 'bg-purple-100 text-purple-700 dark:bg-purple-400/10 dark:text-purple-400',
    dotFill: 'fill-purple-500 dark:fill-purple-400',
    removeButton: {
      hover: 'hover:bg-purple-600/20 dark:hover:bg-purple-500/30',
      stroke:
        'stroke-violet-600/50 group-hover:stroke-violet-600/75 dark:stroke-violet-400 dark:group-hover:stroke-violet-300',
    },
  },
  pink: {
    border:
      'bg-pink-50 text-pink-700 inset-ring inset-ring-pink-700/10 dark:bg-pink-400/10 dark:text-pink-400 dark:inset-ring-pink-400/20',
    flat: 'bg-pink-100 text-pink-700 dark:bg-pink-400/10 dark:text-pink-400',
    dotFill: 'fill-pink-500 dark:fill-pink-400',
    removeButton: {
      hover: 'hover:bg-pink-600/20 dark:hover:bg-pink-500/30',
      stroke: 'stroke-pink-700/50 group-hover:stroke-pink-700/75 dark:stroke-pink-400 dark:group-hover:stroke-pink-300',
    },
  },
};

// Special styling for dot badges with border variant
const dotBorderClasses = 'text-gray-900 inset-ring inset-ring-gray-200 dark:text-white dark:inset-ring-white/10';

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
  const shapeClasses = pill ? 'rounded-full' : 'rounded-md';

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
