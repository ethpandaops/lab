import type { JSX, ReactNode } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { CardChainItem, CardChainProps } from './CardChain.types';

/**
 * Skeleton loading state for a single card
 */
function CardSkeleton(): JSX.Element {
  return (
    <div className="relative flex-1">
      <div className="relative">
        {/* 3D top face */}
        <div className="absolute -top-2 right-1 left-1 h-3 rounded-t-xs bg-border/30" />
        {/* Main card */}
        <div className="animate-pulse rounded-xs border-2 border-border/50 bg-surface p-4">
          <div className="mb-3 pt-1">
            <div className="mb-1 h-3 w-10 rounded-xs bg-border/50" />
            <div className="h-6 w-24 rounded-xs bg-border/50" />
          </div>
          <div className="border-t border-border/50 pt-3">
            <div className="flex gap-3">
              <div className="flex-1">
                <div className="mb-1 h-3 w-8 rounded-xs bg-border/50" />
                <div className="h-4 w-12 rounded-xs bg-border/50" />
              </div>
              <div className="flex-1">
                <div className="mb-1 h-3 w-10 rounded-xs bg-border/50" />
                <div className="h-4 w-14 rounded-xs bg-border/50" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * A single card in the chain
 */
function ChainCard({
  item,
  isLast,
  highlightBadgeText,
}: {
  item: CardChainItem;
  isLast: boolean;
  highlightBadgeText: string;
}): JSX.Element {
  const isHighlighted = item.isHighlighted ?? false;
  const fillPercentage = item.fillPercentage ?? 0;

  return (
    <div
      className={clsx(
        'relative transition-all duration-300',
        isLast ? 'z-10 scale-105' : 'hover:z-10 hover:scale-[1.02]'
      )}
    >
      {/* Glow effect for highlighted items */}
      {isHighlighted && <div className="absolute -inset-3 animate-pulse rounded-xs bg-primary/20 blur-xl" />}

      {/* Top face (3D effect) */}
      <div
        className={clsx(
          'absolute -top-2 right-1 left-1 h-3 rounded-t-xs',
          isHighlighted ? 'bg-linear-to-b from-primary/40 to-primary/20' : 'bg-linear-to-b from-border/60 to-border/30'
        )}
        style={{ transform: 'perspective(500px) rotateX(45deg)' }}
      />

      {/* Main card face */}
      <div
        className={clsx(
          'relative overflow-hidden rounded-xs border-2 transition-all duration-300',
          isHighlighted
            ? 'border-primary bg-linear-to-b from-primary/10 via-surface to-surface shadow-lg shadow-primary/20'
            : 'border-border/80 bg-linear-to-b from-surface to-background group-hover:border-primary/50 group-hover:shadow-md'
        )}
      >
        {/* Fill visualization (background) */}
        <div
          className={clsx(
            'absolute inset-x-0 bottom-0 transition-all duration-500',
            isHighlighted ? 'bg-primary/10' : 'bg-muted/5'
          )}
          style={{ height: `${fillPercentage}%` }}
        />

        {/* Content */}
        <div className="relative p-4">
          {/* Highlight badge */}
          {isHighlighted && (
            <div className="absolute -top-px right-3 rounded-b-xs bg-primary px-2 py-0.5">
              <span className="text-[10px] font-bold tracking-wider text-white">{highlightBadgeText}</span>
            </div>
          )}

          {/* Label and main value */}
          <div className="mb-3 pt-1">
            <div className="text-[10px] font-medium tracking-wider text-muted uppercase">{item.label}</div>
            <div
              className={clsx(
                'font-mono text-xl font-bold tabular-nums',
                isHighlighted ? 'text-primary' : 'text-foreground'
              )}
            >
              {typeof item.value === 'number' ? item.value.toLocaleString() : item.value}
            </div>
          </div>

          {/* Stats */}
          {item.stats && item.stats.length > 0 && (
            <div
              className={clsx(
                'grid gap-x-3 border-t border-border/50 pt-3',
                item.stats.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
              )}
            >
              {item.stats.map(stat => (
                <div key={stat.label}>
                  <div className="text-[10px] text-muted">{stat.label}</div>
                  <div className="font-mono text-sm font-semibold text-foreground">
                    {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-primary/0 opacity-0 transition-all duration-300 group-hover:bg-primary/5 group-hover:opacity-100">
          <div className="rounded-full bg-primary/90 p-2 shadow-lg">
            <ArrowRightIcon className="size-4 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Navigation arrow button
 */
function NavArrow({
  direction,
  onClick,
  disabled,
  title,
}: {
  direction: 'left' | 'right';
  onClick?: () => void;
  disabled: boolean;
  title: string;
}): JSX.Element {
  const Icon = direction === 'left' ? ChevronLeftIcon : ChevronRightIcon;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'z-10 flex size-10 shrink-0 items-center justify-center rounded-full border-2 transition-all',
        !disabled
          ? 'border-border bg-surface text-muted hover:border-primary hover:bg-primary/10 hover:text-primary'
          : 'cursor-not-allowed border-border/50 bg-surface/50 text-muted/30'
      )}
      title={title}
    >
      <Icon className="size-5" />
    </button>
  );
}

/**
 * CardChain displays a horizontal chain of linked cards with 3D styling,
 * connecting lines, and navigation arrows. Useful for displaying sequential
 * items like blocks, epochs, or slots.
 */
export function CardChain({
  items,
  highlightBadgeText = 'LATEST',
  renderItemWrapper,
  onLoadPrevious,
  onLoadNext,
  hasPreviousItems = false,
  hasNextItems = false,
  isLoading = false,
  skeletonCount = 6,
  className,
}: CardChainProps): JSX.Element {
  // Default wrapper just renders children
  const wrapItem = (item: CardChainItem, index: number, children: ReactNode): ReactNode => {
    if (renderItemWrapper) {
      return renderItemWrapper(item, index, children);
    }
    return (
      <div key={item.id} className="group relative flex-1">
        {children}
      </div>
    );
  };

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-xs border border-border bg-linear-to-br from-surface via-surface to-background p-6',
        className
      )}
    >
      {/* Background grid pattern */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Flowing line connecting all cards */}
      <div className="absolute top-1/2 right-[60px] left-[60px] h-[2px] -translate-y-1/2">
        <div className="h-full w-full bg-linear-to-r from-border via-primary/30 to-primary opacity-60" />
        {/* Animated pulse along the line */}
        <div className="absolute inset-0 animate-[shimmer_3s_ease-in-out_infinite] bg-linear-to-r from-transparent via-primary to-transparent opacity-40" />
      </div>

      <div className="relative flex items-center gap-3">
        {/* Left arrow - load previous items */}
        {onLoadPrevious && (
          <NavArrow
            direction="left"
            onClick={onLoadPrevious}
            disabled={!hasPreviousItems || isLoading}
            title={hasPreviousItems ? 'Load previous items' : 'No previous items available'}
          />
        )}

        {/* Cards */}
        <div className="flex flex-1 items-stretch justify-between gap-4">
          {isLoading
            ? // Loading skeleton
              Array.from({ length: skeletonCount }).map((_, index) => <CardSkeleton key={index} />)
            : // Actual items
              items.map((item, index) => {
                const isLast = index === items.length - 1;
                const cardElement = <ChainCard item={item} isLast={isLast} highlightBadgeText={highlightBadgeText} />;
                return wrapItem(item, index, cardElement);
              })}
        </div>

        {/* Right arrow - load next items (only show when there are next items) */}
        {onLoadNext && hasNextItems && (
          <NavArrow direction="right" onClick={onLoadNext} disabled={isLoading} title="Load next items" />
        )}
      </div>
    </div>
  );
}
