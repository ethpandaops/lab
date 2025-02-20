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
  headerSize?: 'small' | 'large'
  xTicks?: number[]
  yTicks?: number[]
  height?: number
}

export const ChartWithStats = ({ 
  title, 
  description, 
  chart, 
  series, 
  className = '', 
  notes,
  showSeriesTable = true,
  headerSize = 'large',
  height = 400,
}: ChartWithStatsProps) => {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="space-y-2">
        <h2 className={`font-sans font-bold text-primary ${headerSize === 'large' ? 'text-2xl' : 'text-lg'}`}>{title}</h2>
        {description && (
          <p className="text-sm font-mono text-tertiary">{description}</p>
        )}
      </div>
      
      {/* Desktop: Chart (75%) + Stats (25%) with notes underneath */}
      <div className="flex flex-col gap-6">
        {/* Chart Area */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className={`w-full ${showSeriesTable ? 'lg:w-3/4' : ''}`}>
            {/* Chart container with responsive padding */}
            <div className="-mx-4 sm:mx-0 sm:px-4 lg:px-0" style={{ height: `${height}px` }}>
              {chart}
            </div>
          </div>

          {/* Stats Table */}
          {showSeriesTable && (
            <div className="w-full lg:w-1/4">
              <div className="flex flex-col" style={{ height: `${height - 50}px` }}>
                <div className="text-xs font-mono text-tertiary mb-2 flex justify-between px-2 sticky top-0  z-10">
                  <span>Series</span>
                  <span>Last Value</span>
                </div>
                <div className="space-y-1 overflow-y-scroll cyber-scrollbar">
                  {series.map((item) => (
                    <button
                      key={item.name}
                      onClick={item.onClick}
                      className={clsx(
                        'group w-full px-2 py-1.5 rounded transition-colors',
                        item.isHidden ? 'opacity-50' : '',
                        item.isHighlighted ? ' -prominent' : '',
                        'hover:bg-hover'
                      )}
                      title={`Min: ${typeof item.min === 'number' ? item.min.toFixed(2) : item.min}${item.unit || ''}
Avg: ${typeof item.avg === 'number' ? item.avg.toFixed(2) : item.avg}${item.unit || ''}
Max: ${typeof item.max === 'number' ? item.max.toFixed(2) : item.max}${item.unit || ''}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-2 h-2 flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-xs font-mono text-primary truncate">{item.name}</span>
                        </div>
                        <div className="text-xs font-mono font-medium text-secondary whitespace-nowrap">
                          {typeof item.last === 'number' ? `${item.last.toFixed(2)}${item.unit || ''}` : item.last}
                        </div>
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