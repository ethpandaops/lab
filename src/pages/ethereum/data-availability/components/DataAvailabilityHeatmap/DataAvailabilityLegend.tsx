import clsx from 'clsx';
import type { DataAvailabilityLegendProps } from './DataAvailabilityHeatmap.types';

/**
 * Legend showing availability percentage color scale
 */
export const DataAvailabilityLegend = ({ className }: DataAvailabilityLegendProps): React.JSX.Element => {
  return (
    <div className={clsx('flex gap-1', className)}>
      <div className="flex grow items-center justify-center rounded-xs bg-danger/70 px-2 py-1">
        <span className="text-xs font-medium text-white">0-20%</span>
      </div>
      <div className="flex grow items-center justify-center rounded-xs bg-danger/50 px-2 py-1">
        <span className="text-xs font-medium text-white">20-40%</span>
      </div>
      <div className="flex grow items-center justify-center rounded-xs bg-warning/50 px-2 py-1">
        <span className="text-xs font-medium text-foreground">40-60%</span>
      </div>
      <div className="flex grow items-center justify-center rounded-xs bg-warning/70 px-2 py-1">
        <span className="text-xs font-medium text-foreground">60-80%</span>
      </div>
      <div className="flex grow items-center justify-center rounded-xs bg-success/70 px-2 py-1">
        <span className="text-xs font-medium text-white">80-95%</span>
      </div>
      <div className="flex grow items-center justify-center rounded-xs bg-success/90 px-2 py-1">
        <span className="text-xs font-medium text-white">95-100%</span>
      </div>
    </div>
  );
};
