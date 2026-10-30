/**
 * Node in the flame graph tree structure
 */
export interface FlameGraphNode {
  /**
   * Unique identifier for this node
   */
  id: string;

  /**
   * Display label
   */
  label: string;

  /**
   * Total value for this node AND all descendants
   */
  value: number;

  /**
   * Value for this node only (excludes children)
   */
  selfValue?: number;

  /**
   * Child nodes
   */
  children?: FlameGraphNode[];

  /**
   * Category/type for color mapping (e.g., "CALL", "STATICCALL", "folder", "component")
   */
  category?: string;

  /**
   * Whether this node has an error/warning state
   */
  hasError?: boolean;

  /**
   * Additional metadata (displayed in tooltip, passed to click handlers)
   */
  metadata?: Record<string, unknown>;
}

/**
 * Color mapping for node categories
 * Key is the category name, value is the Tailwind color class
 */
export interface FlameGraphColorMap {
  [category: string]: {
    bg: string;
    hover: string;
  };
}

/**
 * Props for the FlameGraph component
 *
 * A hierarchical visualization for displaying nested data.
 * Can be used for call trees, file systems, org charts, or any hierarchical data.
 */
export interface FlameGraphProps {
  /**
   * Root node of the tree
   */
  data: FlameGraphNode | null;

  /**
   * Callback when a node is clicked
   */
  onNodeClick?: (node: FlameGraphNode) => void;

  /**
   * Callback when hovering over a node (null when leaving)
   */
  onNodeHover?: (node: FlameGraphNode | null) => void;

  /**
   * ID of the currently selected node
   */
  selectedNodeId?: string;

  /**
   * Custom color mapping for categories
   * If not provided, uses default colors based on category or auto-assigns
   */
  colorMap?: FlameGraphColorMap;

  /**
   * Default color for nodes without a category match
   * @default { bg: 'bg-data-slate', hover: 'hover:bg-data-slate/80' }
   */
  defaultColor?: { bg: string; hover: string };

  /**
   * Color for error nodes (hasError: true)
   * @default { bg: 'bg-danger', hover: 'hover:bg-danger/80' }
   */
  errorColor?: { bg: string; hover: string };

  /**
   * Minimum width percentage to render a node (hides very small nodes)
   * @default 0.5
   */
  minWidthPercent?: number;

  /**
   * Fixed height of the chart container in pixels.
   * If not provided, height is calculated dynamically based on tree depth.
   */
  height?: number;

  /**
   * Minimum height when using dynamic height calculation
   * @default 100
   */
  minHeight?: number;

  /**
   * Height of each row in pixels
   * @default 24
   */
  rowHeight?: number;

  /**
   * Show labels on nodes
   * @default true
   */
  showLabels?: boolean;

  /**
   * Title displayed above the chart
   */
  title?: string;

  /**
   * Unit label for values (e.g., "gas", "bytes", "ms")
   * @default undefined
   */
  valueUnit?: string;

  /**
   * Custom value formatter
   * @default Formats with K/M suffix
   */
  valueFormatter?: (value: number) => string;

  /**
   * Show legend with category colors
   * @default true if colorMap is provided
   */
  showLegend?: boolean;

  /**
   * Extra content to render on the right side of the legend row
   * Useful for adding controls like view toggles
   */
  legendExtra?: React.ReactNode;

  /**
   * Custom tooltip renderer
   * If provided, replaces the default tooltip
   */
  renderTooltip?: (node: FlameGraphNode) => React.ReactNode;
}

/**
 * Internal representation of a flattened node for rendering
 */
export interface FlattenedNode {
  node: FlameGraphNode;
  depth: number;
  startPercent: number;
  widthPercent: number;
  parent?: FlameGraphNode;
}

// ============================================================================
// Preset Color Maps
// ============================================================================

/**
 * EVM call type colors (for Ethereum transaction call trees)
 */
export const EVM_CALL_TYPE_COLORS: FlameGraphColorMap = {
  CALL: { bg: 'bg-data-blue', hover: 'hover:bg-data-blue/80' },
  DELEGATECALL: { bg: 'bg-data-purple', hover: 'hover:bg-data-purple/80' },
  STATICCALL: { bg: 'bg-data-cyan', hover: 'hover:bg-data-cyan/80' },
  CALLCODE: { bg: 'bg-data-indigo', hover: 'hover:bg-data-indigo/80' },
  CREATE: { bg: 'bg-data-orange', hover: 'hover:bg-data-orange/80' },
  CREATE2: { bg: 'bg-data-amber', hover: 'hover:bg-data-amber/80' },
};

/**
 * EVM opcode category colors (for opcode-level flame graphs)
 */
export const EVM_OPCODE_CATEGORY_COLORS: FlameGraphColorMap = {
  // Opcode categories
  Math: { bg: 'bg-data-amber', hover: 'hover:bg-data-amber/80' },
  Comparisons: { bg: 'bg-data-violet', hover: 'hover:bg-data-violet/80' },
  Logic: { bg: 'bg-data-cyan', hover: 'hover:bg-data-cyan/80' },
  'Bit Ops': { bg: 'bg-data-teal', hover: 'hover:bg-data-teal/80' },
  Misc: { bg: 'bg-data-slate', hover: 'hover:bg-data-slate/80' },
  'Ethereum State': { bg: 'bg-data-blue', hover: 'hover:bg-data-blue/80' },
  Pop: { bg: 'bg-data-fuchsia', hover: 'hover:bg-data-fuchsia/80' },
  Memory: { bg: 'bg-data-green', hover: 'hover:bg-data-green/80' },
  Storage: { bg: 'bg-data-red', hover: 'hover:bg-data-red/80' },
  Jump: { bg: 'bg-data-pink', hover: 'hover:bg-data-pink/80' },
  'Transient Storage': { bg: 'bg-data-orange', hover: 'hover:bg-data-orange/80' },
  Push: { bg: 'bg-data-slate', hover: 'hover:bg-data-slate/80' },
  Dup: { bg: 'bg-data-slate', hover: 'hover:bg-data-slate/80' },
  Swap: { bg: 'bg-data-lime', hover: 'hover:bg-data-lime/80' },
  Log: { bg: 'bg-data-yellow', hover: 'hover:bg-data-yellow/80' },
  Contract: { bg: 'bg-data-sky', hover: 'hover:bg-data-sky/80' },
  Other: { bg: 'bg-data-slate/60', hover: 'hover:bg-data-slate/40' },
};

/**
 * Combined EVM colors for call types + opcode categories
 */
export const EVM_COMBINED_COLORS: FlameGraphColorMap = {
  ...EVM_CALL_TYPE_COLORS,
  ...EVM_OPCODE_CATEGORY_COLORS,
};

/**
 * File type colors (for file system visualization)
 */
export const FILE_TYPE_COLORS: FlameGraphColorMap = {
  folder: { bg: 'bg-data-amber', hover: 'hover:bg-data-amber/80' },
  file: { bg: 'bg-data-blue', hover: 'hover:bg-data-blue/80' },
  image: { bg: 'bg-data-green', hover: 'hover:bg-data-green/80' },
  video: { bg: 'bg-data-purple', hover: 'hover:bg-data-purple/80' },
  document: { bg: 'bg-data-cyan', hover: 'hover:bg-data-cyan/80' },
};

/**
 * Process type colors (for profiling visualization)
 */
export const PROCESS_TYPE_COLORS: FlameGraphColorMap = {
  cpu: { bg: 'bg-data-red', hover: 'hover:bg-data-red/80' },
  memory: { bg: 'bg-data-blue', hover: 'hover:bg-data-blue/80' },
  io: { bg: 'bg-data-green', hover: 'hover:bg-data-green/80' },
  network: { bg: 'bg-data-purple', hover: 'hover:bg-data-purple/80' },
  wait: { bg: 'bg-data-slate', hover: 'hover:bg-data-slate/80' },
};
