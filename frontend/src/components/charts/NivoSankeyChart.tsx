import { ResponsiveSankey, SankeySvgProps, DefaultNode, DefaultLink } from '@nivo/sankey';
import { withNivoTheme } from '@/components/charts/NivoProvider';
import { defaultNivoTheme } from '@/components/charts/NivoTheme.ts';

// Create a themed version of ResponsiveSankey
export const ThemedResponsiveSankey = withNivoTheme(ResponsiveSankey);

export interface NivoSankeyChartProps
  extends Omit<SankeySvgProps<DefaultNode, DefaultLink>, 'height' | 'width'> {
  height?: number | string;
  width?: number | string;
}

/**
 * NivoSankeyChart is a wrapper around Nivo's ResponsiveSankey component
 * that applies consistent theming and makes it compatible with ChartWithStats.
 */
export const NivoSankeyChart = ({
  height = '100%',
  width = '100%',
  margin = { top: 20, right: 20, bottom: 20, left: 20 },
  colors = { scheme: 'category10' },
  theme = defaultNivoTheme,
  nodeOpacity = 1,
  nodeThickness = 18,
  nodeSpacing = 24,
  nodeBorderWidth = 0,
  linkOpacity = 0.5,
  linkBlendMode = 'multiply',
  enableLinkGradient = false,
  labelPosition = 'outside',
  labelOrientation = 'horizontal',
  ...rest
}: NivoSankeyChartProps) => {
  return (
    <div style={{ height, width }}>
      <ThemedResponsiveSankey
        margin={margin}
        colors={colors}
        theme={theme}
        nodeOpacity={nodeOpacity}
        nodeThickness={nodeThickness}
        nodeSpacing={nodeSpacing}
        nodeBorderWidth={nodeBorderWidth}
        linkOpacity={linkOpacity}
        linkBlendMode={linkBlendMode}
        enableLinkGradient={enableLinkGradient}
        labelPosition={labelPosition}
        labelOrientation={labelOrientation}
        {...rest}
      />
    </div>
  );
};
