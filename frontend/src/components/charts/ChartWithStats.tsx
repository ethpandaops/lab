import { ReactNode } from 'react';
import clsx from 'clsx';

interface SeriesStats {
  name: string;
  color: string;
  min: number | string;
  avg: number | string;
  max: number | string;
  last: number | string;
  isHidden?: boolean;
  isHighlighted?: boolean;
  unit?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

interface ChartWithStatsProps {
  title: ReactNode;
  description?: string;
  chart: ReactNode;
  series: SeriesStats[];
  className?: string;
  notes?: ReactNode;
  showSeriesTable?: boolean;
  showHeader?: boolean;
  headerSize?: 'small' | 'large';
  xTicks?: number[];
  yTicks?: number[];
  height?: number;
  titleClassName?: string;
  descriptionClassName?: string;
  titlePlacement?: 'above' | 'inside';
  compactSeries?: boolean;
  valueHeader?: string;
}

export const ChartWithStats = ({
  title,
  description,
  chart,
  series,
  className = '',
  notes,
  showSeriesTable = true,
  showHeader = true,
  headerSize = 'large',
  height = 400,
  titleClassName = '',
  descriptionClassName = '',
  titlePlacement = 'above',
  compactSeries = false,
  valueHeader = 'Value',
}: ChartWithStatsProps) => {
  const titleContent = (
    <div className="space-y-1">
      <h2
        className={clsx(
          'font-sans font-bold text-primary',
          headerSize === 'large' ? 'text-2xl' : 'text-lg',
          titleClassName,
        )}
      >
        {title}
      </h2>
      {description && (
        <p className={clsx('text-sm font-mono text-tertiary', descriptionClassName)}>
          {description}
        </p>
      )}
    </div>
  );

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Show title above if specified */}
      {titlePlacement === 'above' && showHeader && titleContent}

      {/* Chart and Stats Container */}
      <div className="flex flex-col gap-4">
        {/* Chart Area with Stats */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Chart Container */}
          <div className={clsx('w-full', showSeriesTable ? 'lg:w-3/4' : '')}>
            {/* Chart container with title inside if specified */}
            <div className="relative" style={{ height: `${height}px` }}>
              {titlePlacement === 'inside' && showHeader && (
                <div className="absolute top-2 left-0 right-0 z-10 flex justify-center">
                  {titleContent}
                </div>
              )}
              <div className="h-full flex items-center justify-center">{chart}</div>
            </div>
          </div>

          {/* Stats Table */}
          {showSeriesTable && (
            <div className="w-full lg:w-1/4">
              <div className="flex flex-col" style={{ height: `${height}px` }}>
                <div
                  className={clsx(
                    'font-mono text-tertiary sticky top-0 z-10 flex border-b border-subtle',
                    compactSeries ? 'text-xs p-1.5' : 'text-xs p-2.5',
                  )}
                >
                  <div className="flex-1 font-medium">Series</div>
                  <div className="w-20 text-right font-medium">{valueHeader}</div>
                </div>
                <div className="overflow-y-auto cyber-scrollbar flex flex-col p-1.5">
                  {series.map(item => (
                    <button
                      key={item.name}
                      onClick={item.onClick}
                      className={clsx(
                        'group w-full rounded transition-colors flex items-center',
                        compactSeries ? 'px-1.5 py-1' : 'px-2.5 py-1.5',
                        item.isHidden ? 'opacity-50' : '',
                        item.isHighlighted ? 'bg-prominent' : '',
                        'hover:bg-hover',
                      )}
                      title={`Min: ${typeof item.min === 'number' ? item.min.toFixed(2) : item.min}${item.unit || ''}
Avg: ${typeof item.avg === 'number' ? item.avg.toFixed(2) : item.avg}${item.unit || ''}
Max: ${typeof item.max === 'number' ? item.max.toFixed(2) : item.max}${item.unit || ''}`}
                    >
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <div
                          className={clsx(
                            'rounded-full flex-shrink-0',
                            compactSeries ? 'w-2.5 h-2.5' : 'w-3 h-3',
                          )}
                          style={{ backgroundColor: item.color }}
                        />
                        <span
                          className={clsx(
                            'font-mono text-primary truncate',
                            compactSeries ? 'text-xs' : 'text-sm',
                          )}
                        >
                          {item.name}
                        </span>
                      </div>
                      <div
                        className={clsx(
                          'font-mono font-medium text-secondary whitespace-nowrap w-20 text-right',
                          compactSeries ? 'text-xs' : 'text-sm',
                        )}
                      >
                        {typeof item.last === 'number'
                          ? `${item.last.toFixed(1)}${item.unit || ''}`
                          : item.last}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notes Section */}
        {notes && (
          <div className="text-sm font-mono text-tertiary border-t border-subtle pt-3">{notes}</div>
        )}
      </div>
    </div>
  );
};
