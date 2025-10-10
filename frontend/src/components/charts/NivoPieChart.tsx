import { ResponsivePie, CommonPieProps, DefaultRawDatum } from '@nivo/pie';
import { withNivoTheme } from '@/components/charts/NivoProvider';
import { defaultNivoTheme } from '@/components/charts/NivoTheme.ts';

// Create a themed version of ResponsivePie
export const ThemedResponsivePie = withNivoTheme(ResponsivePie);

export interface NivoPieChartProps
  extends Omit<CommonPieProps<DefaultRawDatum>, 'height' | 'width'> {
  height?: number | string;
  width?: number | string;
}

/**
 * NivoPieChart is a wrapper around Nivo's ResponsivePie component
 * that applies consistent theming and makes it compatible with ChartWithStats.
 */
export const NivoPieChart = ({
  height = '100%',
  width = '100%',
  margin = { top: 40, right: 80, bottom: 80, left: 80 },
  innerRadius = 0.5,
  padAngle = 0.7,
  cornerRadius = 3,
  activeOuterRadiusOffset = 8,
  borderWidth = 1,
  borderColor = { from: 'color', modifiers: [['darker', 0.2]] },
  arcLinkLabelsSkipAngle = 10,
  arcLinkLabelsTextColor = '#333333',
  arcLinkLabelsThickness = 2,
  arcLinkLabelsColor = { from: 'color' },
  arcLabelsSkipAngle = 10,
  arcLabelsTextColor = { from: 'color', modifiers: [['darker', 2]] },
  theme = defaultNivoTheme,
  ...rest
}: NivoPieChartProps) => {
  return (
    <div style={{ height, width }}>
      <ThemedResponsivePie
        margin={margin}
        innerRadius={innerRadius}
        padAngle={padAngle}
        cornerRadius={cornerRadius}
        activeOuterRadiusOffset={activeOuterRadiusOffset}
        borderWidth={borderWidth}
        borderColor={borderColor}
        arcLinkLabelsSkipAngle={arcLinkLabelsSkipAngle}
        arcLinkLabelsTextColor={arcLinkLabelsTextColor}
        arcLinkLabelsThickness={arcLinkLabelsThickness}
        arcLinkLabelsColor={arcLinkLabelsColor}
        arcLabelsSkipAngle={arcLabelsSkipAngle}
        arcLabelsTextColor={arcLabelsTextColor}
        theme={theme}
        {...rest}
      />
    </div>
  );
};
