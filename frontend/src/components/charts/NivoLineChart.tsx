import { ResponsiveLine, LineProps } from '@nivo/line'
import { withNivoTheme } from '@/components/charts/NivoProvider'
import { defaultNivoTheme } from '@/components/charts/NivoTheme.ts'

// Create a themed version of ResponsiveLine
export const ThemedResponsiveLine = withNivoTheme(ResponsiveLine)

export interface NivoLineChartProps extends Omit<LineProps, 'height' | 'width'> {
  height?: number | string
  width?: number | string
}

/**
 * NivoLineChart is a wrapper around Nivo's ResponsiveLine component
 * that applies consistent theming and makes it compatible with ChartWithStats.
 */
export const NivoLineChart = ({
  height = '100%',
  width = '100%',
  margin = { top: 20, right: 20, bottom: 40, left: 60 },
  axisBottom = {
    tickSize: 5,
    tickPadding: 5,
    tickRotation: 0,
    legend: 'Time',
    legendOffset: 36,
    legendPosition: 'middle'
  },
  axisLeft = {
    tickSize: 5,
    tickPadding: 5,
    tickRotation: 0,
    legend: 'Value',
    legendOffset: -40,
    legendPosition: 'middle'
  },
  enableGridX = true,
  enableGridY = true,
  colors = { scheme: 'category10' },
  lineWidth = 2,
  pointSize = 6,
  pointBorderWidth = 1,
  pointBorderColor = { from: 'color', modifiers: [['darker', 0.3]] },
  enableSlices = 'x',
  theme = defaultNivoTheme,
  ...rest
}: NivoLineChartProps) => {
  return (
    <div style={{ height, width }}>
      <ThemedResponsiveLine
        margin={margin}
        axisBottom={axisBottom}
        axisLeft={axisLeft}
        enableGridX={enableGridX}
        enableGridY={enableGridY}
        colors={colors}
        lineWidth={lineWidth}
        pointSize={pointSize}
        pointBorderWidth={pointBorderWidth}
        pointBorderColor={pointBorderColor}
        enableSlices={enableSlices}
        theme={theme}
        {...rest}
      />
    </div>
  )
} 