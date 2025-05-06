import { ResponsiveBar, BarDatum, ResponsiveBarSvgProps } from '@nivo/bar';
import { withNivoTheme } from '@/components/charts/NivoProvider';
import { defaultNivoTheme } from '@/components/charts/NivoTheme.ts';

// Create a themed version of ResponsiveBar
export const ThemedResponsiveBar = withNivoTheme(ResponsiveBar);

export interface NivoBarChartProps
  extends Omit<ResponsiveBarSvgProps<BarDatum>, 'height' | 'width'> {
  height?: number | string;
  width?: number | string;
}

/**
 * NivoBarChart is a wrapper around Nivo's ResponsiveBar component
 * that applies consistent theming and makes it compatible with ChartWithStats.
 */
export const NivoBarChart = ({
  height = '100%',
  width = '100%',
  margin = { top: 20, right: 20, bottom: 40, left: 60 },
  padding = 0.3,
  axisBottom = {
    tickSize: 5,
    tickPadding: 5,
    tickRotation: 0,
    legend: 'Category',
    legendOffset: 36,
    legendPosition: 'middle',
  },
  axisLeft = {
    tickSize: 5,
    tickPadding: 5,
    tickRotation: 0,
    legend: 'Value',
    legendOffset: -40,
    legendPosition: 'middle',
  },
  enableGridX = false,
  enableGridY = true,
  colors = { scheme: 'category10' },
  borderRadius = 0,
  borderWidth = 0,
  borderColor = { from: 'color', modifiers: [['darker', 1.6]] },
  theme = defaultNivoTheme,
  ...rest
}: NivoBarChartProps) => {
  return (
    <div style={{ height, width }}>
      <ThemedResponsiveBar
        margin={margin}
        padding={padding}
        axisBottom={axisBottom}
        axisLeft={axisLeft}
        enableGridX={enableGridX}
        enableGridY={enableGridY}
        colors={colors}
        borderRadius={borderRadius}
        borderWidth={borderWidth}
        borderColor={borderColor}
        theme={theme}
        {...rest}
      />
    </div>
  );
};
