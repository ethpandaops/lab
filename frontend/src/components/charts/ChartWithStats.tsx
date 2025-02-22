import { ReactNode } from 'react'
import clsx from 'clsx'

interface SeriesStats {
  name: string
  color: string
  min: number | string
  avg: number | string
  max: number | string
  last: number | string
  isHidden?: boolean
  isHighlighted?: boolean
  unit?: string
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
}

interface ChartWithStatsProps {
  title: ReactNode
  description?: string
  chart: ReactNode
  series: SeriesStats[]
  className?: string
  notes?: ReactNode
  showSeriesTable?: boolean
  showHeader?: boolean
  headerSize?: 'small' | 'large'
  xTicks?: number[]
  yTicks?: number[]
  height?: number
  titleClassName?: string
  descriptionClassName?: string
  titlePlacement?: 'above' | 'inside'
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
  titlePlacement = 'above'
}: ChartWithStatsProps) => {
  const titleContent = (
    <div className="space-y-1">
      <h2 className={clsx(
        'font-sans font-bold text-primary',
        headerSize === 'large' ? 'text-2xl' : 'text-lg',
        titleClassName
      )}>{title}</h2>
      {description && (
        <p className={clsx("text-sm font-mono text-tertiary", descriptionClassName)}>{description}</p>
      )}
    </div>
  )

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Show title above if specified */}
      {titlePlacement === 'above' && showHeader && titleContent}
      
      {/* Desktop: Chart (75%) + Stats (25%) with notes underneath */}
      <div className="flex flex-col gap-6">
        {/* Chart Area */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className={`w-full ${showSeriesTable ? 'lg:w-3/4' : ''}`}>
            {/* Chart container with title inside if specified */}
            <div className="relative" style={{ height: `${height}px` }}>
              {titlePlacement === 'inside' && showHeader && (
                <div className="absolute top-2 left-0 right-0 z-10 flex justify-center">
                  {titleContent}
                </div>
              )}
              <div className="h-full flex items-center justify-center">
                {chart}
              </div>
            </div>
          </div>

          {/* Stats Table */}
          {showSeriesTable && (
            <div className="w-full lg:w-1/4">
              <div className="flex flex-col" style={{ height: `${height}px` }}>
                <div className="text-[8px] font-mono text-tertiary mb-0.5 flex px-1 sticky top-0 z-10">
                  <div className="flex-1">Series</div>
                  <div className="w-8 text-right">Time</div>
                </div>
                <div className="overflow-y-scroll cyber-scrollbar flex flex-col">
                  {series.map((item) => (
                    <button
                      key={item.name}
                      onClick={item.onClick}
                      className={clsx(
                        'group w-full px-1 rounded transition-colors flex items-center',
                        item.isHidden ? 'opacity-50' : '',
                        item.isHighlighted ? ' -prominent' : '',
                        'hover:bg-hover'
                      )}
                      title={`Min: ${typeof item.min === 'number' ? item.min.toFixed(2) : item.min}${item.unit || ''}
Avg: ${typeof item.avg === 'number' ? item.avg.toFixed(2) : item.avg}${item.unit || ''}
Max: ${typeof item.max === 'number' ? item.max.toFixed(2) : item.max}${item.unit || ''}`}
                    >
                      <div className="flex-1 flex items-center gap-0.5 min-w-0">
                        <div className="w-1.5 h-1.5 flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-[8px] font-mono text-primary truncate">{item.name}</span>
                      </div>
                      <div className="text-[8px] font-mono font-medium text-secondary whitespace-nowrap w-8 text-right">
                        {typeof item.last === 'number' ? `${item.last.toFixed(1)}s` : item.last}
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
          <div className="text-sm font-mono text-tertiary -t -subtle pt-4">
            {notes}
          </div>
        )}
      </div>
    </div>
  )
} 