import clsx from 'clsx';
import type { DataAvailabilityLegendProps } from './DataAvailabilityHeatmap.types';

/** Availability bands, matching the cell colors */
const BANDS = [
  { label: '0-20%', className: 'bg-danger-70 text-on-fill' },
  { label: '20-40%', className: 'bg-danger-50 text-on-fill' },
  { label: '40-60%', className: 'bg-warning-50 text-foreground' },
  { label: '60-80%', className: 'bg-warning-70 text-foreground' },
  { label: '80-95%', className: 'bg-success-70 text-on-fill' },
  { label: '95-100%', className: 'bg-success-90 text-on-fill' },
];

/**
 * Legend showing the availability percentage bands
 */
export const DataAvailabilityLegend = ({
  className,
  orientation = 'vertical',
}: DataAvailabilityLegendProps): React.JSX.Element => {
  const directionClass =
    orientation === 'vertical' ? 'flex-col gap-2' : 'flex-row flex-wrap items-center gap-x-4 gap-y-2';

  return (
    <div className={clsx('flex', directionClass, className)}>
      <div className="text-xs/4 whitespace-nowrap text-muted">Availability %</div>
      <div className="flex flex-wrap gap-1">
        {BANDS.map(band => (
          <div
            key={band.label}
            className={clsx('flex grow items-center justify-center rounded-xs px-2 py-1', band.className)}
          >
            <span className="text-xs/4 font-medium whitespace-nowrap">{band.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
