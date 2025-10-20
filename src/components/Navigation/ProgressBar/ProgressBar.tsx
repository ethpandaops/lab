import type { JSX } from 'react';
import type { ProgressBarProps, ProgressBarSegment } from './ProgressBar.types';

function classNames(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

/**
 * Calculate percentages for segments if not provided.
 * Evenly distributes segments: 2 = [0, 100], 3 = [0, 50, 100], etc.
 */
function calculateSegmentPercentages(segments: ProgressBarSegment[]): ProgressBarSegment[] {
  if (segments.length === 0) return [];

  // Check if all segments have percentages defined
  const allHavePercentages = segments.every(seg => seg.percentage !== undefined);
  if (allHavePercentages) return segments;

  // Auto-calculate percentages evenly
  return segments.map((segment, index) => ({
    ...segment,
    percentage: segment.percentage ?? (index / (segments.length - 1)) * 100,
  }));
}

export function ProgressBar({
  progress = 0,
  statusMessage,
  segments,
  ariaLabel = 'Progress',
}: ProgressBarProps): JSX.Element {
  const processedSegments = segments ? calculateSegmentPercentages(segments) : [];

  // Find the current active segment based on progress
  const currentSegmentIndex = processedSegments.findIndex((seg, idx) => {
    const nextSeg = processedSegments[idx + 1];
    const currentPercentage = seg.percentage ?? 0;
    const nextPercentage = nextSeg?.percentage ?? 100;
    return progress >= currentPercentage && progress < nextPercentage;
  });

  const activeIndex = currentSegmentIndex >= 0 ? currentSegmentIndex : processedSegments.length - 1;

  return (
    <div>
      <h4 className="sr-only">{ariaLabel}</h4>
      {statusMessage && <p className="text-sm font-medium text-foreground">{statusMessage}</p>}
      <div aria-hidden="true" className="mt-6">
        <div className="relative overflow-hidden rounded-full bg-border">
          {/* Progress bar fill */}
          <div style={{ width: `${progress}%` }} className="h-2 rounded-full bg-primary transition-all duration-300" />

          {/* Segment marks */}
          {processedSegments.map((segment, index) => {
            if (!segment.showMark) return null;
            const percentage = segment.percentage ?? 0;
            const markColorClass = segment.markColor || 'bg-foreground';

            return (
              <div
                key={`${segment.label}-${index}`}
                className={classNames('absolute top-0 h-2 w-0.5 -translate-x-1/2', markColorClass)}
                style={{
                  left: `${percentage}%`,
                }}
              />
            );
          })}
        </div>

        {/* Segment labels */}
        {processedSegments.length > 0 && (
          <div
            className={classNames(
              'mt-6 hidden text-sm font-medium text-muted sm:grid',
              processedSegments.length === 2 && 'grid-cols-2',
              processedSegments.length === 3 && 'grid-cols-3',
              processedSegments.length === 4 && 'grid-cols-4',
              processedSegments.length === 5 && 'grid-cols-5',
              processedSegments.length === 6 && 'grid-cols-6'
            )}
          >
            {processedSegments.map((segment, index) => (
              <div
                key={`${segment.label}-label-${index}`}
                className={classNames(
                  index === 0 && 'text-left',
                  index === processedSegments.length - 1 && 'text-right',
                  index > 0 && index < processedSegments.length - 1 && 'text-center',
                  index <= activeIndex && 'text-primary'
                )}
              >
                {segment.label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
