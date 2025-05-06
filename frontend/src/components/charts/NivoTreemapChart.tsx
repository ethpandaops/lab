import { ResponsiveTreeMap } from '@nivo/treemap';
import { withNivoTheme } from './NivoProvider';
import { defaultNivoTheme } from './NivoTheme';

// Themed component using HOC
export const ThemedResponsiveTreeMap = withNivoTheme(ResponsiveTreeMap);

// TreeMap data node type
export interface TreeMapNode {
  id: string;
  value?: number;
  children?: TreeMapNode[];
  color?: string;
  [key: string]: any;
}

export interface NivoTreemapChartProps {
  // Base props
  data: TreeMapNode;
  height?: number | string;
  width?: number | string;

  // Visual options
  valueFormat?: string;
  padding?: number;
  margin?: { top?: number; right?: number; bottom?: number; left?: number };
  colors?: string[] | ((node: TreeMapNode) => string);
  colorBy?: 'id' | 'depth' | ((node: TreeMapNode) => string);
  borderWidth?: number;
  borderColor?: string | ((node: TreeMapNode) => string);

  // Enable/disable features
  enableLabel?: boolean;
  enableParentLabel?: boolean;
  orientLabel?: boolean;

  // Interaction props
  isInteractive?: boolean;
  onClick?: (node: TreeMapNode, event: React.MouseEvent) => void;
  tooltip?: React.ComponentType<{ node: TreeMapNode }>;
}

export const NivoTreemapChart = ({
  data,
  height = '100%',
  width = '100%',
  valueFormat = ',.0f',
  padding = 4,
  margin = { top: 5, right: 5, bottom: 5, left: 5 },
  colors = { scheme: 'paired' },
  colorBy = 'depth',
  borderWidth = 1,
  borderColor = 'rgba(255, 255, 255, 0.2)',
  enableLabel = true,
  enableParentLabel = true,
  orientLabel = false,
  isInteractive = true,
  onClick,
  tooltip,
}: NivoTreemapChartProps) => {
  return (
    <div style={{ height, width }}>
      <ThemedResponsiveTreeMap
        data={data}
        identity="id"
        value="value"
        valueFormat={valueFormat}
        padding={padding}
        margin={margin}
        colors={colors}
        colorBy={colorBy}
        borderWidth={borderWidth}
        borderColor={borderColor}
        enableLabel={enableLabel}
        enableParentLabel={enableParentLabel}
        orientLabel={orientLabel}
        isInteractive={isInteractive}
        onClick={onClick}
        tooltip={tooltip}
        labelTextColor={{
          from: 'color',
          modifiers: [['darker', 3]],
        }}
        parentLabelTextColor={{
          from: 'color',
          modifiers: [['darker', 3]],
        }}
        nodeOpacity={1}
      />
    </div>
  );
};

export default NivoTreemapChart;
