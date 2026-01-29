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
   * @default { bg: 'bg-slate-500', hover: 'hover:bg-slate-400' }
   */
  defaultColor?: { bg: string; hover: string };

  /**
   * Color for error nodes (hasError: true)
   * @default { bg: 'bg-red-500', hover: 'hover:bg-red-400' }
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
  CALL: { bg: 'bg-blue-500', hover: 'hover:bg-blue-400' },
  DELEGATECALL: { bg: 'bg-purple-500', hover: 'hover:bg-purple-400' },
  STATICCALL: { bg: 'bg-cyan-500', hover: 'hover:bg-cyan-400' },
  CALLCODE: { bg: 'bg-indigo-500', hover: 'hover:bg-indigo-400' },
  CREATE: { bg: 'bg-orange-500', hover: 'hover:bg-orange-400' },
  CREATE2: { bg: 'bg-amber-500', hover: 'hover:bg-amber-400' },
};

/**
 * EVM opcode category colors (for opcode-level flame graphs)
 */
export const EVM_OPCODE_CATEGORY_COLORS: FlameGraphColorMap = {
  // Opcode categories
  Math: { bg: 'bg-amber-500', hover: 'hover:bg-amber-400' },
  Comparisons: { bg: 'bg-violet-500', hover: 'hover:bg-violet-400' },
  Logic: { bg: 'bg-cyan-500', hover: 'hover:bg-cyan-400' },
  'Bit Ops': { bg: 'bg-teal-500', hover: 'hover:bg-teal-400' },
  Misc: { bg: 'bg-gray-500', hover: 'hover:bg-gray-400' },
  'Ethereum State': { bg: 'bg-blue-500', hover: 'hover:bg-blue-400' },
  Pop: { bg: 'bg-fuchsia-500', hover: 'hover:bg-fuchsia-400' },
  Memory: { bg: 'bg-green-500', hover: 'hover:bg-green-400' },
  Storage: { bg: 'bg-red-500', hover: 'hover:bg-red-400' },
  Jump: { bg: 'bg-pink-500', hover: 'hover:bg-pink-400' },
  'Transient Storage': { bg: 'bg-orange-500', hover: 'hover:bg-orange-400' },
  Push: { bg: 'bg-slate-500', hover: 'hover:bg-slate-400' },
  Dup: { bg: 'bg-stone-500', hover: 'hover:bg-stone-400' },
  Swap: { bg: 'bg-lime-500', hover: 'hover:bg-lime-400' },
  Log: { bg: 'bg-yellow-500', hover: 'hover:bg-yellow-400' },
  Contract: { bg: 'bg-sky-500', hover: 'hover:bg-sky-400' },
  Other: { bg: 'bg-gray-400', hover: 'hover:bg-gray-300' },
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
  folder: { bg: 'bg-amber-500', hover: 'hover:bg-amber-400' },
  file: { bg: 'bg-blue-500', hover: 'hover:bg-blue-400' },
  image: { bg: 'bg-green-500', hover: 'hover:bg-green-400' },
  video: { bg: 'bg-purple-500', hover: 'hover:bg-purple-400' },
  document: { bg: 'bg-cyan-500', hover: 'hover:bg-cyan-400' },
};

/**
 * Process type colors (for profiling visualization)
 */
export const PROCESS_TYPE_COLORS: FlameGraphColorMap = {
  cpu: { bg: 'bg-red-500', hover: 'hover:bg-red-400' },
  memory: { bg: 'bg-blue-500', hover: 'hover:bg-blue-400' },
  io: { bg: 'bg-green-500', hover: 'hover:bg-green-400' },
  network: { bg: 'bg-purple-500', hover: 'hover:bg-purple-400' },
  wait: { bg: 'bg-gray-500', hover: 'hover:bg-gray-400' },
};
