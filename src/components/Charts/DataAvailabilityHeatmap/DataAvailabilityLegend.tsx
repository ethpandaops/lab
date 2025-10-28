import clsx from 'clsx';
import type { DataAvailabilityLegendProps } from './DataAvailabilityHeatmap.types';

/**
 * Legend showing availability percentage color scale
 */
export const DataAvailabilityLegend = ({ granularity, className }: DataAvailabilityLegendProps): React.JSX.Element => {
  const granularityLabel = {
    window: 'Window',
    day: 'Daily',
    hour: 'Hourly',
    epoch: 'Epoch',
    slot: 'Slot',
  }[granularity];

  return (
    <div className={clsx('flex flex-col gap-3', className)}>
      <div className="text-sm/6 font-medium text-foreground">{granularityLabel} Availability</div>

      {/* Color scale with labels */}
      <div className="flex items-center gap-2">
        <div className="flex grow gap-1">
          <div className="flex grow flex-col items-center gap-1">
            <div className="h-4 w-full rounded-xs bg-danger/70" />
            <span className="text-xs text-muted">0-20%</span>
          </div>
          <div className="flex grow flex-col items-center gap-1">
            <div className="h-4 w-full rounded-xs bg-danger/50" />
            <span className="text-xs text-muted">20-40%</span>
          </div>
          <div className="flex grow flex-col items-center gap-1">
            <div className="h-4 w-full rounded-xs bg-warning/50" />
            <span className="text-xs text-muted">40-60%</span>
          </div>
          <div className="flex grow flex-col items-center gap-1">
            <div className="h-4 w-full rounded-xs bg-warning/70" />
            <span className="text-xs text-muted">60-80%</span>
          </div>
          <div className="flex grow flex-col items-center gap-1">
            <div className="h-4 w-full rounded-xs bg-success/70" />
            <span className="text-xs text-muted">80-95%</span>
          </div>
          <div className="flex grow flex-col items-center gap-1">
            <div className="h-4 w-full rounded-xs bg-success/90" />
            <span className="text-xs text-muted">95-100%</span>
          </div>
        </div>
      </div>
    </div>
  );
};
