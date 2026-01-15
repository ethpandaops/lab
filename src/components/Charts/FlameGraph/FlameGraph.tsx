import React, { type JSX, useMemo, useState, useCallback } from 'react';
import clsx from 'clsx';
import type { FlameGraphProps, FlameGraphNode, FlattenedNode, FlameGraphColorMap } from './FlameGraph.types';
import { EVM_CALL_TYPE_COLORS } from './FlameGraph.types';

// Default colors
const DEFAULT_COLOR = { bg: 'bg-slate-500', hover: 'hover:bg-slate-400' };
const ERROR_COLOR = { bg: 'bg-red-500', hover: 'hover:bg-red-400' };

/**
 * Default formatter for values (K/M suffix)
 */
function defaultValueFormatter(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(0)}K`;
  }
  return value.toLocaleString();
}

/**
 * Get color classes for a node
 */
function getNodeColors(
  node: FlameGraphNode,
  colorMap: FlameGraphColorMap | undefined,
  defaultColor: { bg: string; hover: string },
  errorColor: { bg: string; hover: string }
): { bg: string; hover: string } {
  // Error nodes always use error color
  if (node.hasError) {
    return errorColor;
  }

  // Look up category in color map
  if (node.category && colorMap?.[node.category]) {
    return colorMap[node.category];
  }

  // Fallback to default
  return defaultColor;
}

/**
 * Flatten the tree into rows for rendering
 */
function flattenTree(
  node: FlameGraphNode,
  rootValue: number,
  depth: number = 0,
  startPercent: number = 0,
  parent?: FlameGraphNode
): FlattenedNode[] {
  const widthPercent = (node.value / rootValue) * 100;
  const result: FlattenedNode[] = [
    {
      node,
      depth,
      startPercent,
      widthPercent,
      parent,
    },
  ];

  if (node.children && node.children.length > 0) {
    let childStart = startPercent;
    for (const child of node.children) {
      result.push(...flattenTree(child, rootValue, depth + 1, childStart, node));
      childStart += (child.value / rootValue) * 100;
    }
  }

  return result;
}

/**
 * Calculate max depth of tree
 */
function getMaxDepth(node: FlameGraphNode, currentDepth: number = 0): number {
  if (!node.children || node.children.length === 0) {
    return currentDepth;
  }
  return Math.max(...node.children.map(child => getMaxDepth(child, currentDepth + 1)));
}

/**
 * Get unique categories from the tree
 */
function getCategories(node: FlameGraphNode, categories: Set<string> = new Set()): Set<string> {
  if (node.category) {
    categories.add(node.category);
  }
  if (node.children) {
    for (const child of node.children) {
      getCategories(child, categories);
    }
  }
  return categories;
}

/**
 * FlameGraph - Hierarchical visualization for nested data
 *
 * A generic component for visualizing hierarchical data where:
 * - Width represents value/size
 * - Color indicates category/type
 * - Depth shows hierarchy
 *
 * Can be used for call trees, file systems, org charts, profiling data, etc.
 *
 * @example
 * ```tsx
 * // EVM call tree
 * <FlameGraph
 *   data={callTree}
 *   colorMap={EVM_CALL_TYPE_COLORS}
 *   title="Call Tree"
 *   valueUnit="gas"
 * />
 *
 * // File system usage
 * <FlameGraph
 *   data={fileTree}
 *   colorMap={FILE_TYPE_COLORS}
 *   title="Disk Usage"
 *   valueUnit="bytes"
 *   valueFormatter={(v) => formatBytes(v)}
 * />
 * ```
 */
export function FlameGraph({
  data,
  onNodeClick,
  onNodeHover,
  selectedNodeId,
  colorMap = EVM_CALL_TYPE_COLORS,
  defaultColor = DEFAULT_COLOR,
  errorColor = ERROR_COLOR,
  minWidthPercent = 0.5,
  height = 400,
  rowHeight = 24,
  showLabels = true,
  title,
  valueUnit,
  valueFormatter = defaultValueFormatter,
  showLegend,
  renderTooltip,
}: FlameGraphProps): JSX.Element {
  const [hoveredNode, setHoveredNode] = useState<FlameGraphNode | null>(null);

  // Flatten tree and calculate layout
  const { maxDepth, rows, categories } = useMemo(() => {
    if (!data) {
      return { maxDepth: 0, rows: [] as FlattenedNode[][], categories: new Set<string>() };
    }

    const nodes = flattenTree(data, data.value);
    const depth = getMaxDepth(data);
    const cats = getCategories(data);

    // Group nodes by depth (row)
    const rowMap = new Map<number, FlattenedNode[]>();
    for (const node of nodes) {
      const row = rowMap.get(node.depth) || [];
      row.push(node);
      rowMap.set(node.depth, row);
    }

    const rowArray = Array.from(rowMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([, nodes]) => nodes);

    return {
      maxDepth: depth,
      rows: rowArray,
      categories: cats,
    };
  }, [data]);

  // Determine if we should show legend
  const shouldShowLegend = showLegend ?? (colorMap && categories.size > 0);

  // Handle mouse events
  const handleMouseEnter = useCallback(
    (node: FlameGraphNode) => {
      setHoveredNode(node);
      onNodeHover?.(node);
    },
    [onNodeHover]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredNode(null);
    onNodeHover?.(null);
  }, [onNodeHover]);

  const handleClick = useCallback(
    (node: FlameGraphNode) => {
      onNodeClick?.(node);
    },
    [onNodeClick]
  );

  // Empty state
  if (!data) {
    return (
      <div
        className="flex items-center justify-center rounded-sm border border-border bg-surface text-muted"
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  const calculatedHeight = Math.max(height, (maxDepth + 1) * rowHeight + 60);

  return (
    <div className="w-full">
      {/* Header */}
      {title && (
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{title}</span>
          <span className="text-xs text-muted">
            Total: {valueFormatter(data.value)}
            {valueUnit && ` ${valueUnit}`}
          </span>
        </div>
      )}

      {/* Flame Graph Container */}
      <div
        className="relative w-full overflow-x-auto rounded-sm border border-border bg-surface"
        style={{ height: calculatedHeight }}
      >
        <div className="relative min-w-full p-2" style={{ minHeight: calculatedHeight - 4 }}>
          {rows.map((row, rowIndex) => (
            <div
              key={rowIndex}
              className="relative flex w-full"
              style={{ height: rowHeight, marginTop: rowIndex > 0 ? 1 : 0 }}
            >
              {row.map(flatNode => {
                // Skip nodes that are too small
                if (flatNode.widthPercent < minWidthPercent) {
                  return null;
                }

                const isSelected = flatNode.node.id === selectedNodeId;
                const isHovered = flatNode.node.id === hoveredNode?.id;
                const colors = getNodeColors(flatNode.node, colorMap, defaultColor, errorColor);

                return (
                  <div
                    key={flatNode.node.id}
                    className={clsx(
                      'absolute flex cursor-pointer items-center overflow-hidden rounded-xs px-1 text-xs text-white transition-all',
                      colors.bg,
                      colors.hover,
                      isSelected && 'ring-2 ring-primary ring-offset-1',
                      isHovered && 'brightness-110'
                    )}
                    style={{
                      left: `${flatNode.startPercent}%`,
                      width: `calc(${flatNode.widthPercent}% - 1px)`,
                      height: rowHeight - 2,
                    }}
                    onClick={() => handleClick(flatNode.node)}
                    onMouseEnter={() => handleMouseEnter(flatNode.node)}
                    onMouseLeave={handleMouseLeave}
                    title={`${flatNode.node.label} - ${valueFormatter(flatNode.node.value)}${valueUnit ? ` ${valueUnit}` : ''}`}
                  >
                    {showLabels && flatNode.widthPercent > 3 && (
                      <span className="truncate font-mono text-xs">
                        {flatNode.widthPercent > 8
                          ? `${flatNode.node.label} (${valueFormatter(flatNode.node.value)})`
                          : flatNode.node.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Tooltip */}
        {hoveredNode && (
          <div className="pointer-events-none fixed right-4 bottom-4 z-50 max-w-xs rounded-sm border border-border bg-background p-3 shadow-lg">
            {renderTooltip ? (
              renderTooltip(hoveredNode)
            ) : (
              <>
                <div className="mb-2 font-mono text-sm font-medium text-foreground">{hoveredNode.label}</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <span className="text-muted">Total:</span>
                  <span className="text-foreground">
                    {hoveredNode.value.toLocaleString()}
                    {valueUnit && ` ${valueUnit}`}
                  </span>

                  {hoveredNode.selfValue !== undefined && (
                    <>
                      <span className="text-muted">Self:</span>
                      <span className="text-foreground">
                        {hoveredNode.selfValue.toLocaleString()}
                        {valueUnit && ` ${valueUnit}`}
                      </span>
                    </>
                  )}

                  {hoveredNode.category && (
                    <>
                      <span className="text-muted">Type:</span>
                      <span className="text-foreground">{hoveredNode.category}</span>
                    </>
                  )}

                  {/* Render metadata fields */}
                  {hoveredNode.metadata &&
                    Object.entries(hoveredNode.metadata).map(([key, value]) => (
                      <React.Fragment key={key}>
                        <span className="text-muted capitalize">{key}:</span>
                        <span className="text-foreground">
                          {typeof value === 'number' ? value.toLocaleString() : String(value)}
                        </span>
                      </React.Fragment>
                    ))}

                  {hoveredNode.hasError && (
                    <>
                      <span className="text-muted">Status:</span>
                      <span className="text-danger">Error</span>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      {shouldShowLegend && colorMap && (
        <div className="mt-3 flex flex-wrap gap-3 text-xs">
          <span className="text-muted">Categories:</span>
          {Array.from(categories).map(cat => {
            const colors = colorMap[cat];
            if (!colors) return null;
            return (
              <span key={cat} className="flex items-center gap-1">
                <span className={clsx('size-3 rounded-xs', colors.bg)} />
                <span className="text-foreground">{cat}</span>
              </span>
            );
          })}
          <span className="flex items-center gap-1">
            <span className={clsx('size-3 rounded-xs', errorColor.bg)} />
            <span className="text-foreground">Error</span>
          </span>
        </div>
      )}
    </div>
  );
}
