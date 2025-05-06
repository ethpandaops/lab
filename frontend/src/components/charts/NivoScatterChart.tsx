import { ResponsiveScatterPlot, ScatterPlotDatum, ScatterPlotSvgProps } from '@nivo/scatterplot';
import { withNivoTheme } from '@/components/charts/NivoProvider';
import { defaultNivoTheme } from '@/components/charts/NivoTheme.ts';
import { ComponentType } from 'react';

// Create a themed version of ResponsiveScatterPlot
export const ThemedResponsiveScatterPlot = withNivoTheme(ResponsiveScatterPlot);

// Define the node render props type
export interface NodeRenderProps {
  node: {
    id: string | number;
    serieId: string | number;
    data: {
      x: number;
      y: number;
      [key: string]: any;
    };
    [key: string]: any;
  };
  x: number;
  y: number;
  size: number;
  color: string;
  blendMode: string;
  onMouseEnter: () => void;
  onMouseMove: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}

export interface NivoScatterChartProps
  extends Omit<ScatterPlotSvgProps<ScatterPlotDatum>, 'height' | 'width'> {
  height?: number | string;
  width?: number | string;
  nodeComponent?: ComponentType<any>;
}

/**
 * NivoScatterChart is a wrapper around Nivo's ResponsiveScatterPlot component
 * that applies consistent theming and makes it compatible with ChartWithStats.
 */
export const NivoScatterChart = ({
  height = '100%',
  width = '100%',
  margin = { top: 20, right: 20, bottom: 40, left: 60 },
  xScale = { type: 'linear', min: 0, max: 'auto' },
  yScale = { type: 'linear', min: 0, max: 'auto' },
  axisBottom = {
    tickSize: 5,
    tickPadding: 5,
    tickRotation: 0,
    legend: 'X',
    legendOffset: 36,
    legendPosition: 'middle',
  },
  axisLeft = {
    tickSize: 5,
    tickPadding: 5,
    tickRotation: 0,
    legend: 'Y',
    legendOffset: -40,
    legendPosition: 'middle',
  },
  enableGridX = true,
  enableGridY = true,
  colors = { scheme: 'category10' },
  nodeSize = 9,
  useMesh = true,
  theme = defaultNivoTheme,
  nodeComponent,
  ...rest
}: NivoScatterChartProps) => {
  return (
    <div style={{ height, width }}>
      <ThemedResponsiveScatterPlot
        margin={margin}
        xScale={xScale}
        yScale={yScale}
        axisBottom={axisBottom}
        axisLeft={axisLeft}
        enableGridX={enableGridX}
        enableGridY={enableGridY}
        colors={colors}
        nodeSize={nodeSize}
        useMesh={useMesh}
        theme={theme}
        nodeComponent={nodeComponent}
        {...rest}
      />
    </div>
  );
};
