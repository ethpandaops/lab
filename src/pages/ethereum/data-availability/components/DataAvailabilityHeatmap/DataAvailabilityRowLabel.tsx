import clsx from 'clsx';
import {
  CalendarDaysIcon,
  ClockIcon,
  CubeIcon,
  Square2StackIcon,
  CircleStackIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import type { RowLabelRenderProps } from '@/components/Charts/GridHeatmap';
import { BlobPosterLogo, getBlobPosterShortName } from '@/components/Ethereum/BlobPosterLogo';
import type { DataAvailabilityGranularity } from './DataAvailabilityHeatmap.types';

interface DataAvailabilityRowLabelProps extends RowLabelRenderProps {
  /** Current granularity level - determines what type of data the row represents */
  granularity: DataAvailabilityGranularity;
}

/**
 * Get icon component for the row type based on granularity
 * The icon represents what type of data this row shows
 */
function getRowIcon(granularity: DataAvailabilityGranularity): React.ComponentType<{ className?: string }> {
  switch (granularity) {
    case 'window':
      return CalendarDaysIcon; // Days
    case 'day':
      return ClockIcon; // Hours
    case 'hour':
      return CubeIcon; // Epochs
    case 'epoch':
      return Square2StackIcon; // Slots
    case 'slot':
      return CircleStackIcon; // Blobs
  }
}

/**
 * Get type label for the row based on granularity
 */
function getRowTypeLabel(granularity: DataAvailabilityGranularity): string {
  switch (granularity) {
    case 'window':
      return 'Day';
    case 'day':
      return 'Hour';
    case 'hour':
      return 'Epoch';
    case 'epoch':
      return 'Slot';
    case 'slot':
      return 'Blob';
  }
}

/**
 * Parse blob label to extract index and submitter
 * Label format: "0 · arbitrum" or just "0"
 */
function parseBlobLabel(label: string): { index: string; submitter: string | null } {
  const parts = label.split(' · ');
  return {
    index: parts[0],
    submitter: parts[1] ?? null,
  };
}

/**
 * Purpose-built row label for the Data Availability heatmap.
 *
 * Shows:
 * - Type icon (calendar for days, clock for hours, etc.)
 * - Type badge (Day, Hour, Epoch, Slot, Blob)
 * - The actual value
 * - For blobs: submitter logo and name
 * - Drill-down chevron (when clickable)
 */
export function DataAvailabilityRowLabel({
  label,
  isHovered,
  canDrillDown,
  onDrillDown,
  onMouseEnter,
  onMouseLeave,
  granularity,
}: DataAvailabilityRowLabelProps): React.JSX.Element {
  const Icon = getRowIcon(granularity);
  const typeLabel = getRowTypeLabel(granularity);

  // For blobs, parse submitter info
  const isBlob = granularity === 'slot';
  const blobInfo = isBlob ? parseBlobLabel(label) : null;

  return (
    <button
      type="button"
      onClick={onDrillDown}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      disabled={!canDrillDown}
      className={clsx(
        'group flex h-full w-full items-center gap-1.5 pr-2 text-left transition-all',
        canDrillDown ? 'cursor-pointer' : 'cursor-default',
        isHovered && canDrillDown ? 'text-accent' : 'text-muted'
      )}
      title={canDrillDown ? `Drill down into ${typeLabel} ${label}` : `${typeLabel} ${label}`}
    >
      {/* Type icon */}
      <Icon
        className={clsx(
          'size-3 shrink-0 transition-colors',
          isHovered && canDrillDown ? 'text-accent' : 'text-muted/60'
        )}
      />

      {/* Type badge */}
      <span
        className={clsx(
          'w-8 shrink-0 rounded-xs px-1 py-px text-center text-[9px] font-medium tracking-wide uppercase transition-colors',
          isHovered && canDrillDown ? 'bg-accent/20 text-accent' : 'bg-muted/20 text-muted'
        )}
      >
        {typeLabel}
      </span>

      {/* Value - different layout for blobs with submitters */}
      {isBlob && blobInfo ? (
        <div className="flex flex-1 items-center gap-1.5 overflow-hidden">
          {/* Blob index - fixed width for alignment */}
          <span
            className={clsx(
              'w-4 shrink-0 text-center font-mono text-[11px] transition-colors',
              isHovered && canDrillDown ? 'font-semibold text-accent' : 'text-foreground/80'
            )}
          >
            {blobInfo.index}
          </span>

          {/* Submitter logo and short name */}
          {blobInfo.submitter && (
            <>
              <BlobPosterLogo poster={blobInfo.submitter} size={14} className="shrink-0" />
              <span
                className={clsx(
                  'truncate font-mono text-[10px] transition-colors',
                  isHovered && canDrillDown ? 'text-accent' : 'text-muted'
                )}
                title={blobInfo.submitter}
              >
                {getBlobPosterShortName(blobInfo.submitter)}
              </span>
            </>
          )}
        </div>
      ) : (
        <span
          className={clsx(
            'flex-1 truncate text-right font-mono text-[11px] transition-colors',
            isHovered && canDrillDown ? 'font-semibold text-accent' : 'text-foreground/80'
          )}
        >
          {label}
        </span>
      )}

      {/* Drill-down chevron */}
      {canDrillDown && (
        <ChevronRightIcon
          className={clsx(
            'size-3 shrink-0 transition-all',
            isHovered ? 'translate-x-0.5 text-accent opacity-100' : 'text-muted opacity-40'
          )}
        />
      )}
    </button>
  );
}
