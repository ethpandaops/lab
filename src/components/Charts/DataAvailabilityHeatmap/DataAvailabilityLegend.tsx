import clsx from 'clsx';
import type { DataAvailabilityLegendProps } from './DataAvailabilityHeatmap.types';

/**
 * Legend showing availability percentage color scale
 */
export const DataAvailabilityLegend = ({ granularity, className }: DataAvailabilityLegendProps): React.JSX.Element => {
  const granularityLabel = {
    window: 'Window',
    day: 'Daily',
    epoch: 'Epoch',
    slot: 'Slot',
  }[granularity];

  return (
    <div className={clsx('flex flex-col gap-3', className)}>
      <div className="text-sm/6 font-medium text-foreground">{granularityLabel} Availability</div>

      {/* Color scale */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted">0%</span>
        <div className="flex grow gap-1">
          <div className="h-4 grow rounded-xs bg-danger/70" />
          <div className="h-4 grow rounded-xs bg-danger/50" />
          <div className="h-4 grow rounded-xs bg-warning/50" />
          <div className="h-4 grow rounded-xs bg-warning/70" />
          <div className="h-4 grow rounded-xs bg-success/70" />
          <div className="h-4 grow rounded-xs bg-success/90" />
        </div>
        <span className="text-xs text-muted">100%</span>
      </div>

      {/* Percentage labels */}
      <div className="flex items-center gap-2 text-xs text-muted">
        <span className="w-8 text-right">0%</span>
        <div className="flex grow justify-between px-1">
          <span>20%</span>
          <span>40%</span>
          <span>60%</span>
          <span>80%</span>
          <span>95%</span>
        </div>
        <span className="w-8">100%</span>
      </div>
    </div>
  );
};
