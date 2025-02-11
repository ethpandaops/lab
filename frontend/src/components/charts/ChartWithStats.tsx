import { ReactNode } from 'react'

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
  title: string
  chart: ReactNode
  series: SeriesStats[]
  className?: string
  notes?: ReactNode
}

export const ChartWithStats = ({ title, chart, series, className = '', notes }: ChartWithStatsProps) => {
  return (
    <div className={`space-y-6 ${className}`}>
      <h2 className="text-2xl font-sans font-bold text-cyber-neon">{title}</h2>
      
      {/* Desktop: Chart (75%) + Stats (25%) with notes underneath */}
      <div className="flex flex-col gap-6">
        {/* Chart Area */}
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="w-full lg:w-3/4">
            {/* Chart container with responsive padding */}
            <div className="h-[400px] -mx-4 sm:mx-0 sm:px-4 lg:px-0">
              {chart}
            </div>
          </div>

          {/* Stats Table */}
          <div className="w-full lg:w-1/4">
            <div className="text-xs font-mono text-cyber-neon/70 mb-2 flex justify-between px-2">
              <div>Series Name</div>
              <div>Last</div>
            </div>
            <div className="space-y-1">
              {series.map((item) => (
                <button
                  key={item.name}
                  onClick={item.onClick}
                  className={`group w-full px-2 py-1.5 rounded hover:bg-cyber-neon/5 transition-colors ${
                    item.isHidden ? 'opacity-50' : ''
                  } ${item.isHighlighted ? 'ring-1 ring-cyber-neon' : ''}`}
                  title={`Min: ${typeof item.min === 'number' ? item.min.toFixed(2) : item.min}${item.unit || ''}
Avg: ${typeof item.avg === 'number' ? item.avg.toFixed(2) : item.avg}${item.unit || ''}
Max: ${typeof item.max === 'number' ? item.max.toFixed(2) : item.max}${item.unit || ''}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-2 h-2 flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-xs font-mono truncate">{item.name}</span>
                    </div>
                    <div className="text-xs font-mono font-medium whitespace-nowrap">
                      {typeof item.last === 'number' ? `${item.last.toFixed(2)}${item.unit || ''}` : item.last}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Notes Section */}
        {notes && (
          <div className="text-sm font-mono text-cyber-neon/85 border-t border-cyber-neon/10 pt-4">
            {notes}
          </div>
        )}
      </div>
    </div>
  )
} 