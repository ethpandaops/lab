import { type JSX, useState, type FormEvent, type KeyboardEvent } from 'react';
import clsx from 'clsx';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';
import { Button } from '@/components/Elements/Button';
import type { ItemNavigationProps } from './ItemNavigation.types';

/**
 * ItemNavigation provides navigation controls for sequential items
 *
 * Generic navigation component for moving between items in a sequence.
 * Supports previous/next buttons, current item display, and optional jump-to functionality.
 *
 * @example
 * ```tsx
 * <ItemNavigation
 *   currentItem={12345}
 *   itemLabel="Slot"
 *   hasNext={true}
 *   hasPrevious={true}
 *   onNext={() => navigate(`/slots/${currentSlot + 1}`)}
 *   onPrevious={() => navigate(`/slots/${currentSlot - 1}`)}
 *   onJumpTo={(slot) => navigate(`/slots/${slot}`)}
 * />
 * ```
 */
export function ItemNavigation({
  currentItem,
  itemLabel,
  hasNext,
  hasPrevious,
  onNext,
  onPrevious,
  onJumpTo,
  showJumpTo = true,
  className,
  size = 'md',
  loading = false,
  leadingContent,
  trailingContent,
}: ItemNavigationProps): JSX.Element {
  const [jumpValue, setJumpValue] = useState('');
  const [jumpError, setJumpError] = useState('');

  const sizeClasses = {
    sm: {
      container: 'gap-2',
      label: 'text-xs',
      current: 'text-sm/6 font-semibold',
      input: 'h-7 px-2 text-xs',
      button: 'sm' as const,
    },
    md: {
      container: 'gap-3',
      label: 'text-sm/6',
      current: 'text-base/7 font-semibold',
      input: 'h-8 px-2.5 text-sm/6',
      button: 'md' as const,
    },
    lg: {
      container: 'gap-4',
      label: 'text-base/7',
      current: 'text-lg/8 font-semibold',
      input: 'h-9 px-3 text-sm/6',
      button: 'lg' as const,
    },
  };

  const styles = sizeClasses[size];

  const handleJumpSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (!onJumpTo || !jumpValue.trim()) return;

    // Parse the jump value - support both numbers and strings
    const parsedValue = typeof currentItem === 'number' ? parseInt(jumpValue, 10) : jumpValue;

    // Validate numeric items
    if (typeof currentItem === 'number' && (isNaN(parsedValue as number) || (parsedValue as number) < 0)) {
      setJumpError('Please enter a valid positive number');
      return;
    }

    setJumpError('');
    onJumpTo(parsedValue);
    setJumpValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    // Arrow key navigation
    if (e.key === 'ArrowLeft' && hasPrevious && !loading) {
      e.preventDefault();
      onPrevious();
    } else if (e.key === 'ArrowRight' && hasNext && !loading) {
      e.preventDefault();
      onNext();
    }
  };

  return (
    <div
      className={clsx('flex flex-wrap items-center', styles.container, className)}
      onKeyDown={handleKeyDown}
      role="navigation"
      aria-label={`${itemLabel} navigation`}
    >
      {/* Leading content (optional) */}
      {leadingContent && <div className="flex items-center">{leadingContent}</div>}

      {/* Previous button */}
      <Button
        variant="secondary"
        size={styles.button}
        iconOnly
        leadingIcon={<ChevronLeftIcon />}
        onClick={onPrevious}
        disabled={!hasPrevious || loading}
        aria-label={`Previous ${itemLabel.toLowerCase()}`}
      />

      {/* Current item display */}
      <div className="flex flex-col items-center gap-0.5">
        <span className={clsx('text-muted', styles.label)}>{itemLabel}</span>
        <span className={clsx('text-foreground', styles.current)} aria-label={`Current ${itemLabel.toLowerCase()}`}>
          {loading ? '...' : currentItem}
        </span>
      </div>

      {/* Next button */}
      <Button
        variant="secondary"
        size={styles.button}
        iconOnly
        leadingIcon={<ChevronRightIcon />}
        onClick={onNext}
        disabled={!hasNext || loading}
        aria-label={`Next ${itemLabel.toLowerCase()}`}
      />

      {/* Jump to input (optional) */}
      {showJumpTo && onJumpTo && (
        <form onSubmit={handleJumpSubmit} className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <label htmlFor="jump-to-input" className="sr-only">
              Jump to {itemLabel.toLowerCase()}
            </label>
            <input
              id="jump-to-input"
              type={typeof currentItem === 'number' ? 'number' : 'text'}
              value={jumpValue}
              onChange={e => {
                setJumpValue(e.target.value);
                setJumpError('');
              }}
              placeholder={`Go to ${itemLabel.toLowerCase()}...`}
              disabled={loading}
              className={clsx(
                'w-48 rounded-sm border border-border bg-surface text-foreground transition-colors',
                'placeholder:text-muted',
                'focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden',
                'disabled:cursor-not-allowed disabled:opacity-50',
                styles.input,
                jumpError && 'border-danger focus:border-danger focus:ring-danger/20'
              )}
              min={typeof currentItem === 'number' ? 0 : undefined}
            />
            <Button type="submit" variant="primary" size={styles.button} disabled={!jumpValue.trim() || loading} nowrap>
              Go
            </Button>
          </div>
          {jumpError && (
            <p className="text-xs text-danger" role="alert">
              {jumpError}
            </p>
          )}
        </form>
      )}

      {/* Trailing content (optional) */}
      {trailingContent && <div className="flex items-center">{trailingContent}</div>}
    </div>
  );
}
