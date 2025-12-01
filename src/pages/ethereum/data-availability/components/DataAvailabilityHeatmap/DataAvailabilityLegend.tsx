import clsx from 'clsx';
import type { DataAvailabilityLegendProps } from './DataAvailabilityHeatmap.types';

/**
 * Legend showing color scale based on view mode
 * - Percentage mode: Shows availability percentage ranges
 * - Threshold mode: Shows observation count relative to threshold
 */
export const DataAvailabilityLegend = ({
  viewMode = 'percentage',
  threshold = 30,
  className,
}: DataAvailabilityLegendProps): React.JSX.Element => {
  if (viewMode === 'threshold') {
    // Threshold mode legend - shows observation count ranges relative to threshold
    return (
      <div className={clsx('flex flex-col gap-2', className)}>
        <div className="text-xs/4 text-muted">Observations (threshold: {threshold})</div>
        <div className="flex gap-1">
          <div className="flex grow items-center justify-center rounded-xs bg-warning/20 px-2 py-1">
            <span className="text-xs/4 font-medium text-foreground">&lt;{Math.round(threshold * 0.25)}</span>
          </div>
          <div className="flex grow items-center justify-center rounded-xs bg-warning/30 px-2 py-1">
            <span className="text-xs/4 font-medium text-foreground">
              {Math.round(threshold * 0.25)}-{Math.round(threshold * 0.5)}
            </span>
          </div>
          <div className="flex grow items-center justify-center rounded-xs bg-warning/50 px-2 py-1">
            <span className="text-xs/4 font-medium text-foreground">
              {Math.round(threshold * 0.5)}-{threshold}
            </span>
          </div>
          <div className="flex grow items-center justify-center rounded-xs bg-success/50 px-2 py-1">
            <span className="text-xs/4 font-medium text-foreground">
              {threshold}-{threshold * 2}
            </span>
          </div>
          <div className="flex grow items-center justify-center rounded-xs bg-success/70 px-2 py-1">
            <span className="text-xs/4 font-medium text-white">
              {threshold * 2}-{threshold * 3}
            </span>
          </div>
          <div className="flex grow items-center justify-center rounded-xs bg-success/90 px-2 py-1">
            <span className="text-xs/4 font-medium text-white">&gt;{threshold * 3}</span>
          </div>
        </div>
      </div>
    );
  }

  // Percentage mode legend
  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      <div className="text-xs/4 text-muted">Availability %</div>
      <div className="flex gap-1">
        <div className="flex grow items-center justify-center rounded-xs bg-danger/70 px-2 py-1">
          <span className="text-xs/4 font-medium text-white">0-20%</span>
        </div>
        <div className="flex grow items-center justify-center rounded-xs bg-danger/50 px-2 py-1">
          <span className="text-xs/4 font-medium text-white">20-40%</span>
        </div>
        <div className="flex grow items-center justify-center rounded-xs bg-warning/50 px-2 py-1">
          <span className="text-xs/4 font-medium text-foreground">40-60%</span>
        </div>
        <div className="flex grow items-center justify-center rounded-xs bg-warning/70 px-2 py-1">
          <span className="text-xs/4 font-medium text-foreground">60-80%</span>
        </div>
        <div className="flex grow items-center justify-center rounded-xs bg-success/70 px-2 py-1">
          <span className="text-xs/4 font-medium text-white">80-95%</span>
        </div>
        <div className="flex grow items-center justify-center rounded-xs bg-success/90 px-2 py-1">
          <span className="text-xs/4 font-medium text-white">95-100%</span>
        </div>
      </div>
    </div>
  );
};
