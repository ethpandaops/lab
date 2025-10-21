import type { JSX } from 'react';
import clsx from 'clsx';
import type { ProgressBarProps, ProgressBarSegment } from './ProgressBar.types';

function calculateSegmentPercentages(segments: ProgressBarSegment[]): ProgressBarSegment[] {
  if (segments.length === 0 || segments.every(seg => seg.percentage !== undefined)) {
    return segments;
  }

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
  fillColor = 'bg-primary',
  backgroundColor = 'bg-border',
  disableTransition = false,
}: ProgressBarProps): JSX.Element {
  const processedSegments = segments ? calculateSegmentPercentages(segments) : [];

  const activeIndex = processedSegments.findIndex((seg, idx) => {
    const nextSeg = processedSegments[idx + 1];
    const currentPercentage = seg.percentage ?? 0;
    const nextPercentage = nextSeg?.percentage ?? 100;
    return progress >= currentPercentage && progress < nextPercentage;
  });
  const finalActiveIndex = activeIndex >= 0 ? activeIndex : processedSegments.length - 1;

  return (
    <div>
      <h4 className="sr-only">{ariaLabel}</h4>
      {statusMessage && <p className="text-sm font-medium text-foreground">{statusMessage}</p>}
      <div aria-hidden="true" className="mt-6">
        <div className={clsx('relative overflow-hidden rounded-full', backgroundColor)}>
          <div
            style={{ width: `${progress}%` }}
            className={clsx('h-2 rounded-full', !disableTransition && 'transition-all duration-300', fillColor)}
          />

          {processedSegments.map((segment, index) => {
            if (!segment.showMark) return null;

            return (
              <div
                key={`${segment.label}-${index}`}
                className={clsx('absolute top-0 h-2 w-0.5 -translate-x-1/2', segment.markColor ?? 'bg-foreground')}
                style={{ left: `${segment.percentage ?? 0}%` }}
              />
            );
          })}
        </div>

        {processedSegments.length > 0 && (
          <div
            className={clsx(
              'mt-6 hidden text-sm font-medium text-muted sm:grid',
              `grid-cols-${processedSegments.length}`
            )}
          >
            {processedSegments.map((segment, index) => (
              <div
                key={`${segment.label}-label-${index}`}
                className={clsx(
                  index === 0 && 'text-left',
                  index === processedSegments.length - 1 && 'text-right',
                  index > 0 && index < processedSegments.length - 1 && 'text-center',
                  index <= finalActiveIndex && 'text-primary'
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
