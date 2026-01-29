import React, { type JSX, useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { ChevronRightIcon, ChevronDownIcon, ChevronUpIcon, HomeIcon, EllipsisHorizontalIcon } from '@heroicons/react/20/solid';
import type { FlameGraphProps, FlameGraphNode, FlattenedNode, FlameGraphColorMap } from './FlameGraph.types';
import { EVM_CALL_TYPE_COLORS } from './FlameGraph.types';

/**
 * Tooltip offset from cursor
 */
const TOOLTIP_OFFSET = 12;

/**
 * Viewport padding to keep tooltip away from edges
 */
const VIEWPORT_PADDING = 16;

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
 * Supports zoom/drill-down: click a node to zoom in, use breadcrumbs to zoom out.
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
  height,
  minHeight = 100,
  rowHeight = 24,
  showLabels = true,
  title,
  valueUnit,
  valueFormatter = defaultValueFormatter,
  showLegend,
  legendExtra,
  renderTooltip,
}: FlameGraphProps): JSX.Element {
  const [hoveredNode, setHoveredNode] = useState<FlameGraphNode | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [legendExpanded, setLegendExpanded] = useState(false);

  // Zoom state: track the path of zoomed node IDs (not objects, which become stale)
  const [zoomPathIds, setZoomPathIds] = useState<string[]>([]);

  // Find a node by ID in the tree
  const findNodeById = useCallback((node: FlameGraphNode | null, id: string): FlameGraphNode | null => {
    if (!node) return null;
    if (node.id === id) return node;
    if (node.children) {
      for (const child of node.children) {
        const found = findNodeById(child, id);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Find the path from root to a node (returns array of IDs including the target)
  const findPathToNode = useCallback((root: FlameGraphNode | null, targetId: string, path: string[] = []): string[] | null => {
    if (!root) return null;
    if (root.id === targetId) return [...path, root.id];
    if (root.children) {
      for (const child of root.children) {
        const found = findPathToNode(child, targetId, [...path, root.id]);
        if (found) return found;
      }
    }
    return null;
  }, []);

  // Resolve zoom path IDs to actual nodes from the current tree
  const zoomPath = useMemo(() => {
    if (!data) return [];
    return zoomPathIds
      .map(id => findNodeById(data, id))
      .filter((node): node is FlameGraphNode => node !== null);
  }, [zoomPathIds, data, findNodeById]);

  // The currently zoomed node (last in resolved path, or root if empty)
  const zoomedNode = useMemo(() => {
    if (zoomPath.length === 0) return data;
    return zoomPath[zoomPath.length - 1];
  }, [zoomPath, data]);

  // Reset zoom only when the root node changes (not when children change, e.g., opcodes toggled)
  const rootId = data?.id;
  useEffect(() => {
    setZoomPathIds([]);
  }, [rootId]);

  // Flatten tree and calculate layout from the zoomed node
  const {
    maxDepth: _maxDepth,
    rows,
    categories,
  } = useMemo(() => {
    if (!zoomedNode) {
      return { maxDepth: 0, rows: [] as FlattenedNode[][], categories: new Set<string>() };
    }

    const nodes = flattenTree(zoomedNode, zoomedNode.value);
    const depth = getMaxDepth(zoomedNode);
    // Get categories from the full tree for consistent legend
    const cats = data ? getCategories(data) : new Set<string>();

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
  }, [zoomedNode, data]);

  // Determine if we should show legend
  const shouldShowLegend = showLegend ?? (colorMap && categories.size > 0);

  // Calculate smart tooltip position to keep it within viewport
  useEffect(() => {
    if (!hoveredNode || !tooltipRef.current) return;

    const tooltip = tooltipRef.current;
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = mousePosition.x + TOOLTIP_OFFSET;
    let y = mousePosition.y + TOOLTIP_OFFSET;

    // Check right edge - flip to left side if needed
    if (x + tooltipRect.width + VIEWPORT_PADDING > viewportWidth) {
      x = mousePosition.x - tooltipRect.width - TOOLTIP_OFFSET;
    }

    // Check bottom edge - flip to above cursor if needed
    if (y + tooltipRect.height + VIEWPORT_PADDING > viewportHeight) {
      y = mousePosition.y - tooltipRect.height - TOOLTIP_OFFSET;
    }

    // Ensure we don't go off the left or top edges
    x = Math.max(VIEWPORT_PADDING, x);
    y = Math.max(VIEWPORT_PADDING, y);

    setTooltipPosition({ x, y });
  }, [mousePosition, hoveredNode]);

  // Handle mouse events
  const handleMouseEnter = useCallback(
    (node: FlameGraphNode, event: React.MouseEvent) => {
      setHoveredNode(node);
      setMousePosition({ x: event.clientX, y: event.clientY });
      onNodeHover?.(node);
    },
    [onNodeHover]
  );

  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    setMousePosition({ x: event.clientX, y: event.clientY });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredNode(null);
    onNodeHover?.(null);
  }, [onNodeHover]);

  // Handle click - zoom in if node has children, or call onNodeClick for leaf nodes
  const handleClick = useCallback(
    (node: FlameGraphNode) => {
      // If node has children, zoom into it
      if (node.children && node.children.length > 0) {
        // Don't re-zoom if clicking the already-zoomed root
        if (zoomedNode && node.id === zoomedNode.id) {
          // Clicking the zoomed root does nothing (use breadcrumbs to go back)
          return;
        }
        // Build full path from root to clicked node (for proper breadcrumbs)
        const fullPath = findPathToNode(data, node.id);
        if (fullPath) {
          // Remove the root from the path (it's represented by the home icon)
          setZoomPathIds(fullPath.slice(1));
        } else {
          // Fallback: just add the clicked node
          setZoomPathIds(prev => [...prev, node.id]);
        }
      } else {
        // Leaf node - call the external handler if provided
        onNodeClick?.(node);
      }
    },
    [zoomedNode, onNodeClick, data, findPathToNode]
  );

  // Handle breadcrumb navigation
  const handleBreadcrumbClick = useCallback((index: number) => {
    if (index === -1) {
      // Click on root - reset zoom
      setZoomPathIds([]);
    } else {
      // Click on a breadcrumb - zoom to that level
      setZoomPathIds(prev => prev.slice(0, index + 1));
    }
  }, []);

  // Empty state
  if (!data) {
    return (
      <div
        className="flex items-center justify-center rounded-sm border border-border bg-surface text-muted"
        style={{ height: height ?? minHeight }}
      >
        No data available
      </div>
    );
  }

  // Check if we're zoomed in
  const isZoomed = zoomPath.length > 0;

  return (
    <div className="w-full">
      {/* Controls bar - always visible */}
      <div className="mb-2 flex items-center justify-between gap-4">
        {/* Left side: Breadcrumbs */}
        <div className="flex min-w-0 flex-1 items-center gap-1 text-sm">
          {isZoomed ? (
            <div className="flex min-w-0 items-center gap-1">
              {/* Root/Home */}
              <button
                onClick={() => handleBreadcrumbClick(-1)}
                className="flex shrink-0 items-center gap-1 text-muted transition-colors hover:text-foreground"
                title="Back to root"
              >
                <HomeIcon className="size-4" />
              </button>

              {/* Collapsed middle items (if path > 2) */}
              {zoomPath.length > 2 && (
                <>
                  <ChevronRightIcon className="size-3 shrink-0 text-border" />
                  <div className="group relative">
                    <button className="flex items-center gap-1 rounded-xs border border-border bg-surface/50 px-1.5 py-0.5 text-xs text-muted hover:border-primary/50 hover:text-foreground">
                      <EllipsisHorizontalIcon className="size-3.5" />
                      <span>{zoomPath.length - 2}</span>
                    </button>
                    {/* Dropdown on hover */}
                    <div className="absolute top-full left-0 z-50 hidden min-w-56 pt-1 group-hover:block">
                      <div className="rounded-xs border border-border bg-background p-2 shadow-lg">
                        <div className="mb-1.5 border-b border-border pb-1.5 text-xs text-muted">Full path</div>
                        <div className="space-y-1 text-xs">
                          <button
                            onClick={() => handleBreadcrumbClick(-1)}
                            className="block w-full rounded-xs px-2 py-1 text-left text-muted hover:bg-surface hover:text-foreground"
                          >
                            Root
                          </button>
                          {zoomPath.map((node, index) => {
                            const isLast = index === zoomPath.length - 1;
                            const nodeColors = colorMap?.[node.category ?? ''];
                            return (
                              <button
                                key={node.id}
                                onClick={() => handleBreadcrumbClick(index)}
                                className={clsx(
                                  'flex w-full items-center gap-2 rounded-xs px-2 py-1 text-left',
                                  isLast ? 'bg-primary/10 text-foreground' : 'text-muted hover:bg-surface hover:text-foreground'
                                )}
                              >
                                {node.category && nodeColors && (
                                  <span className={clsx('rounded-xs px-1.5 py-0.5 text-[10px] font-medium text-white', nodeColors.bg)}>
                                    {node.category}
                                  </span>
                                )}
                                <span className="truncate">{node.label}</span>
                                <span className="ml-auto shrink-0 text-muted">d{index + 1}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Parent (second-to-last, if exists) */}
              {zoomPath.length > 1 && (
                <>
                  <ChevronRightIcon className="size-3 shrink-0 text-border" />
                  {(() => {
                    const parent = zoomPath[zoomPath.length - 2];
                    const parentColors = colorMap?.[parent.category ?? ''];
                    return (
                      <button
                        onClick={() => handleBreadcrumbClick(zoomPath.length - 2)}
                        className="flex shrink-0 items-center gap-1.5 text-muted transition-colors hover:text-foreground"
                        title={parent.label}
                      >
                        {parent.category && parentColors && (
                          <span className={clsx('rounded-xs px-1.5 py-0.5 text-[10px] font-medium text-white', parentColors.bg)}>
                            {parent.category}
                          </span>
                        )}
                        <span className="max-w-24 truncate">{parent.label}</span>
                      </button>
                    );
                  })()}
                </>
              )}

              {/* Current (last) */}
              <ChevronRightIcon className="size-3 shrink-0 text-border" />
              {(() => {
                const current = zoomPath[zoomPath.length - 1];
                const currentColors = colorMap?.[current.category ?? ''];
                return (
                  <span className="flex shrink-0 items-center gap-1.5 font-medium text-foreground" title={current.label}>
                    {current.category && currentColors && (
                      <span className={clsx('rounded-xs px-1.5 py-0.5 text-[10px] font-medium text-white', currentColors.bg)}>
                        {current.category}
                      </span>
                    )}
                    <span className="max-w-32 truncate">{current.label}</span>
                  </span>
                );
              })()}
            </div>
          ) : (
            title && <span className="font-medium text-foreground">{title}</span>
          )}
        </div>

        {/* Right side: Controls */}
        <div className="flex shrink-0 items-center gap-2">
          {isZoomed && (
            <button
              onClick={() => setZoomPathIds([])}
              className="rounded-xs bg-surface px-2 py-1 text-xs text-muted transition-colors hover:bg-primary/10 hover:text-foreground"
            >
              Reset Zoom
            </button>
          )}
          {legendExtra}
        </div>
      </div>

      {/* Flame Graph Container */}
      <div className="relative w-full overflow-hidden rounded-sm border border-border bg-surface">
        <div className="relative min-w-full p-2">
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
                const isZoomedRoot = flatNode.depth === 0 && isZoomed;
                const hasChildren = flatNode.node.children && flatNode.node.children.length > 0;
                const colors = getNodeColors(flatNode.node, colorMap, defaultColor, errorColor);

                return (
                  <div
                    key={flatNode.node.id}
                    className={clsx(
                      'absolute flex items-center overflow-hidden rounded-xs px-1 text-xs text-white transition-all',
                      colors.bg,
                      // Only show hover effect if clickable (has children or is not zoomed root)
                      hasChildren && !isZoomedRoot && colors.hover,
                      hasChildren && !isZoomedRoot ? 'cursor-pointer' : 'cursor-default',
                      isSelected && 'ring-2 ring-primary ring-offset-1',
                      isHovered && hasChildren && !isZoomedRoot && 'brightness-110'
                    )}
                    style={{
                      left: `${flatNode.startPercent}%`,
                      width: `calc(${flatNode.widthPercent}% - 1px)`,
                      height: rowHeight - 2,
                    }}
                    onClick={() => handleClick(flatNode.node)}
                    onMouseEnter={e => handleMouseEnter(flatNode.node, e)}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                  >
                    {showLabels && flatNode.widthPercent > 3 && (
                      <span className="truncate font-mono text-xs">
                        {flatNode.widthPercent > 8
                          ? `${flatNode.node.label} - ${valueFormatter(flatNode.node.value)}`
                          : flatNode.node.label}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Tooltip - rendered via portal to escape stacking contexts */}
      {hoveredNode &&
        createPortal(
          <div
            ref={tooltipRef}
            className="pointer-events-none fixed z-[9999] max-w-md min-w-72 overflow-hidden rounded-sm border border-border bg-background shadow-lg"
            style={{
              left: tooltipPosition.x,
              top: tooltipPosition.y,
            }}
          >
            {renderTooltip ? (
              renderTooltip(hoveredNode)
            ) : (
              <>
                {/* Header */}
                <div className="border-b border-border bg-surface/50 px-3 py-2">
                  <div className="text-base/5 font-medium text-foreground">{hoveredNode.label}</div>
                  {/* Target name prominently displayed */}
                  {typeof hoveredNode.metadata?.targetName === 'string' && hoveredNode.metadata.targetName && (
                    <div className="mt-0.5 text-sm text-muted">{hoveredNode.metadata.targetName}</div>
                  )}
                  {/* Colored call type badge */}
                  {hoveredNode.category && (
                    <span
                      className={clsx(
                        'mt-1.5 inline-block rounded-xs px-1.5 py-0.5 text-xs font-medium text-white',
                        colorMap?.[hoveredNode.category]?.bg ?? 'bg-slate-500'
                      )}
                    >
                      {hoveredNode.category}
                    </span>
                  )}
                </div>

                <div className="p-3">
                  {/* Gas Section */}
                  <div className="mb-3">
                    <div className="mb-1.5 text-xs font-semibold tracking-wide text-primary uppercase">Gas</div>
                    <div className="space-y-1">
                      {hoveredNode.selfValue !== undefined && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 text-muted">
                            <span className="size-0.5 rounded-full bg-green-500" />
                            Gas
                          </span>
                          <span className="font-mono text-foreground">
                            {hoveredNode.selfValue.toLocaleString()}
                            {valueUnit && ` ${valueUnit}`}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2 text-muted">
                          <span className="size-0.5 rounded-full bg-blue-500" />
                          Cumulative
                        </span>
                        <span className="font-mono text-foreground">
                          {hoveredNode.value.toLocaleString()}
                          {valueUnit && ` ${valueUnit}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Details Section */}
                  {hoveredNode.metadata && Object.keys(hoveredNode.metadata).length > 0 && (
                    <div>
                      <div className="mb-1.5 text-xs font-semibold tracking-wide text-primary uppercase">Details</div>
                      <div className="space-y-1">
                        {Object.entries(hoveredNode.metadata).map(([key, value]) => {
                          // Skip null/undefined/zero values and internal/redundant fields
                          if (value === null || value === undefined) return null;
                          if (value === 0 || value === -1) return null;
                          // Skip fields shown elsewhere or internal flags
                          const skipKeys = [
                            'targetName', // shown in header
                            'callFrameId', // internal ID
                            'callType', // shown as category badge
                            'isOpcode', // internal flag
                            'depth', // not useful in tooltip
                            'functionSelector', // too technical
                            'gasRefund', // usually null/0
                          ];
                          if (skipKeys.includes(key)) return null;
                          // Format the key name nicely
                          const displayKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                          // Format the value based on type
                          let displayValue: React.ReactNode;
                          const stringValue = typeof value === 'string' ? value : String(value);
                          const isLongValue = stringValue.length > 24;

                          if (typeof value === 'number') {
                            displayValue = <span className="font-mono">{value.toLocaleString()}</span>;
                          } else if (typeof value === 'string' && value.startsWith('0x')) {
                            // Ethereum address or hash - truncate in middle
                            displayValue = (
                              <span className="font-mono" title={value}>
                                {value.length > 16 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value}
                              </span>
                            );
                          } else if (isLongValue) {
                            // Long string values - truncate with tooltip
                            displayValue = (
                              <span className="font-mono" title={stringValue}>
                                {stringValue.slice(0, 20)}...
                              </span>
                            );
                          } else {
                            displayValue = stringValue;
                          }
                          return (
                            <div key={key} className="flex items-center justify-between gap-4 text-xs">
                              <span className="shrink-0 text-muted">{displayKey}</span>
                              <span className="text-right text-foreground">{displayValue}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Click hint for zoomable nodes */}
                  {hoveredNode.children && hoveredNode.children.length > 0 && (
                    <div className="mt-3 text-center text-xs text-muted">Click to zoom in</div>
                  )}

                  {/* Error indicator */}
                  {hoveredNode.hasError && (
                    <div className="mt-3 flex items-center gap-2 rounded-xs bg-danger/10 px-2 py-1.5 text-xs text-danger">
                      <span className="size-1.5 rounded-full bg-danger" />
                      <span>Error in this call</span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>,
          document.body
        )}

      {/* Collapsible Legend */}
      {shouldShowLegend && colorMap && (
        <div className="mt-2">
          <button
            onClick={() => setLegendExpanded(!legendExpanded)}
            className="flex items-center gap-1 text-xs text-muted transition-colors hover:text-foreground"
          >
            {legendExpanded ? (
              <ChevronUpIcon className="size-4" />
            ) : (
              <ChevronDownIcon className="size-4" />
            )}
            <span>Legend ({categories.size} categories)</span>
          </button>
          {legendExpanded && (
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {Array.from(categories)
                .sort()
                .map(cat => {
                  const colors = colorMap[cat];
                  if (!colors) return null;
                  return (
                    <span key={cat} className="flex items-center gap-1">
                      <span className={clsx('size-2.5 rounded-xs', colors.bg)} />
                      <span className="text-foreground">{cat}</span>
                    </span>
                  );
                })}
              <span className="flex items-center gap-1">
                <span className={clsx('size-2.5 rounded-xs', errorColor.bg)} />
                <span className="text-foreground">Error</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
