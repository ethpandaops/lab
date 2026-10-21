import { type FormEvent, type JSX, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';
import { Button } from '@/components/Elements/Button';
import type { RangePage } from './RangePager.utils';

export interface RangePagerProps {
  /** The page currently shown, from `getRangePage` */
  page: RangePage;
  /** Singular noun for the numbers being paged, e.g. "slot" or "epoch" */
  noun: string;
  /** Navigate to the page whose top row is `from`; undefined returns to the latest page */
  onNavigate: (from: number | undefined) => void;
  className?: string;
}

/**
 * Navigation for a newest-first numeric sequence (slots, epochs): the range on screen, a way back to
 * the latest page, newer/older steps and a jump to any number. Pages are addressed by their top
 * number so every page has a stable URL.
 */
export function RangePager({ page, noun, onNavigate, className }: RangePagerProps): JSX.Element {
  const [jump, setJump] = useState('');

  const submitJump = (event: FormEvent): void => {
    event.preventDefault();
    const value = Number.parseInt(jump.trim(), 10);
    if (Number.isNaN(value) || value < 0) return;
    onNavigate(value);
    setJump('');
  };

  return (
    <div className={clsx('flex flex-wrap items-center gap-x-4 gap-y-2', className)}>
      <p className="text-sm text-muted tabular-nums">
        <span className="text-foreground">{page.top}</span> – <span className="text-foreground">{page.bottom}</span>
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="secondary"
          size="sm"
          disabled={page.isLatest}
          onClick={() => onNavigate(undefined)}
          aria-label={`Latest ${noun}s`}
        >
          Latest
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page.newerTop === undefined}
          onClick={() => onNavigate(page.newerTop)}
          leadingIcon={<ChevronLeftIcon className="size-4" />}
        >
          Newer
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={page.olderTop === undefined}
          onClick={() => onNavigate(page.olderTop)}
          trailingIcon={<ChevronRightIcon className="size-4" />}
        >
          Older
        </Button>
      </div>

      <form onSubmit={submitJump} className="ml-auto flex items-center gap-1">
        <label htmlFor={`range-pager-${noun}`} className="sr-only">
          Go to {noun}
        </label>
        <input
          id={`range-pager-${noun}`}
          inputMode="numeric"
          value={jump}
          onChange={event => setJump(event.target.value.replace(/[^\d]/g, ''))}
          placeholder={`Go to ${noun}`}
          className="h-8 w-36 rounded-sm border border-border bg-surface px-2.5 text-sm text-foreground tabular-nums placeholder:text-muted focus:border-primary focus:ring-0 focus:outline-hidden"
        />
        <Button type="submit" variant="secondary" size="sm" disabled={jump === ''}>
          Go
        </Button>
      </form>
    </div>
  );
}
