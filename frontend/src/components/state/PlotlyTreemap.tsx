import { useState, useEffect, useMemo } from 'react';
import Plot from 'react-plotly.js';
import { Card, CardBody, CardHeader } from '@/components/common/Card';
import useContext from '@/contexts/api';
import { useNetwork } from '@/stores/appStore';
import type { HierarchicalStateResponse, StateNode } from '@/types/state-analytics';
import { PARADIGM_COLORS } from './paradigmColors';

// Helper function to format bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

interface PlotlyData {
  labels: string[];
  parents: string[];
  values: number[];
  customdata: string[];
}

interface PlotlyDataWithColors extends PlotlyData {
  colors: string[];
}

// Generate lighter/darker variants of a color
function adjustColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xff) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + percent));
  const b = Math.min(255, Math.max(0, (num & 0xff) + percent));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// Transform hierarchical StateNode to Plotly treemap format
function transformToPlotlyFormat(root: StateNode, totalSize: number): PlotlyDataWithColors {
  const labels: string[] = [];
  const parents: string[] = [];
  const values: number[] = [];
  const customdata: string[] = [];
  const colors: string[] = [];

  // Track colors per category
  const categoryColors = new Map<string, string>();
  let categoryIndex = 0;

  function traverse(node: StateNode, parentName: string | null, depth: number, categoryColor?: string) {
    // Format label with line breaks for better display
    let formattedName = node.name;
    if (
      node.type !== 'root' &&
      !formattedName.includes(' / ') &&
      !formattedName.endsWith(' Pool') &&
      !formattedName.endsWith(' Pools')
    ) {
      // Add line breaks for long names (similar to Paradigm)
      formattedName = formattedName.replace(/, /g, '<br>').replace(/ /g, '<br>');
    }

    labels.push(formattedName);
    parents.push(parentName || '');
    values.push(node.size_bytes);

    // Format custom hover data
    const sizeFormatted = formatBytes(node.size_bytes);
    const percentage = ((node.size_bytes / totalSize) * 100).toFixed(1);
    customdata.push(`${sizeFormatted}<br>${percentage}% of state`);

    // Assign colors based on depth
    let nodeColor: string;
    if (node.type === 'root') {
      nodeColor = 'rgba(0,0,0,0)'; // Transparent for root
    } else if (node.type === 'category') {
      // Categories get base colors from PARADIGM_COLORS
      if (!categoryColors.has(node.name)) {
        categoryColors.set(node.name, PARADIGM_COLORS[categoryIndex % PARADIGM_COLORS.length]);
        categoryIndex++;
      }
      nodeColor = categoryColors.get(node.name)!;
      categoryColor = nodeColor; // Pass down to children
    } else if (node.type === 'protocol' || node.type === 'contract') {
      // Protocols and contracts get variations of their category color
      if (categoryColor) {
        // Create variations: slightly lighter/darker based on index within siblings
        const siblingIndex = node.children?.length || 0;
        const adjustment = (siblingIndex % 5 - 2) * 15; // Range: -30 to +30
        nodeColor = adjustColor(categoryColor, adjustment);
      } else {
        nodeColor = PARADIGM_COLORS[categoryIndex % PARADIGM_COLORS.length];
      }
    } else {
      nodeColor = categoryColor || PARADIGM_COLORS[0];
    }

    colors.push(nodeColor);

    // Recursively traverse children
    if (node.children && node.children.length > 0) {
      node.children.forEach((child, idx) => {
        // For contracts, create more distinct variations
        let childColor = categoryColor;
        if (node.type === 'protocol' && child.type === 'contract') {
          // Create distinct colors for contracts within a protocol
          const adjustment = ((idx % 10) - 5) * 20; // Wider range: -100 to +100
          childColor = adjustColor(categoryColor || PARADIGM_COLORS[0], adjustment);
        }
        traverse(child, formattedName, depth + 1, childColor);
      });
    }
  }

  traverse(root, null, 0);
  return { labels, parents, values, customdata, colors };
}

export function PlotlyTreemap() {
  const { restClient } = useContext();
  const { selectedNetwork } = useNetwork();
  const [data, setData] = useState<HierarchicalStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maxDepth, setMaxDepth] = useState<number>(3); // Default to showing contracts

  useEffect(() => {
    async function fetchData() {
      if (!selectedNetwork || !restClient) return;

      try {
        setLoading(true);
        setError(null);
        const result = await restClient.getHierarchicalState(selectedNetwork, {
          max_depth: maxDepth,
          contracts_per_protocol: 100, // Show many more contracts to fill the space
        });
        setData(result);
      } catch (err) {
        console.error('Error fetching hierarchical state:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [selectedNetwork, restClient, maxDepth]);

  // Memoize the plotly data transformation
  const plotlyData = useMemo(() => {
    if (!data || !data.root) return null;
    const totalSize = data.root.size_bytes;

    // Use the backend data directly - it's already categorized
    return transformToPlotlyFormat(data.root, totalSize);
  }, [data]);

  if (loading && !data) {
    return (
      <Card>
        <CardBody className="text-center py-12">
          <div className="animate-pulse text-secondary">Loading state composition...</div>
        </CardBody>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardBody className="text-center py-12">
          <div className="text-red-500">Error: {error}</div>
        </CardBody>
      </Card>
    );
  }

  if (!plotlyData) {
    return (
      <Card>
        <CardBody className="text-center py-12">
          <div className="text-secondary">No data available</div>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="w-full flex flex-col" style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}>
      {/* Header */}
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <div>
          <h2 className="text-xl font-bold text-primary">State Composition</h2>
          <p className="text-sm text-secondary">
            Ethereum state organized by category and protocol
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setMaxDepth(2)}
            className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
              maxDepth === 2
                ? 'bg-accent/20 text-accent'
                : 'text-secondary hover:bg-hover'
            }`}
          >
            By Protocol
          </button>
          <button
            onClick={() => setMaxDepth(3)}
            className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
              maxDepth === 3
                ? 'bg-accent/20 text-accent'
                : 'text-secondary hover:bg-hover'
            }`}
          >
            By Contract
          </button>
        </div>
      </div>

      {/* Treemap */}
      <div className="w-full bg-surface border border-border rounded-lg flex-1" style={{ minHeight: '500px' }}>
        <Plot
          data={[
            {
              type: 'treemap',
              labels: plotlyData.labels,
              parents: plotlyData.parents,
              values: plotlyData.values,
              customdata: plotlyData.customdata,
              textfont: {
                family: 'monospace',
                size: 20,
              },
              branchvalues: 'total',
              hovertemplate: '<b>%{label}</b><br>%{customdata}<extra></extra>',
              hoverlabel: {
                font: {
                  size: 22,
                  family: 'Monospace',
                },
              },
              marker: {
                colors: plotlyData.colors,
                line: {
                  width: 0.5,
                },
              },
              textposition: 'middle center',
            } as any,
          ]}
          layout={{
            margin: { l: 0, r: 0, t: 0, b: 0 },
            paper_bgcolor: 'transparent',
            plot_bgcolor: 'transparent',
            font: {
              color: '#fff',
            },
          }}
          config={{
            displayModeBar: false,
            responsive: true,
          }}
          style={{ width: '100%', height: '100%' }}
          useResizeHandler={true}
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 justify-center text-xs mt-4 p-4 bg-surface border border-border rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: PARADIGM_COLORS[0] }} />
          <span className="text-secondary">ERC-20</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: PARADIGM_COLORS[1] }} />
          <span className="text-secondary">ERC-721</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: PARADIGM_COLORS[9] }} />
          <span className="text-secondary">ERC-1155</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: PARADIGM_COLORS[4] }} />
          <span className="text-secondary">DEX / DeFi</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: PARADIGM_COLORS[7] }} />
          <span className="text-secondary">Bridge</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: PARADIGM_COLORS[6] }} />
          <span className="text-secondary">Infra</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded" style={{ backgroundColor: PARADIGM_COLORS[8] }} />
          <span className="text-secondary">Game</span>
        </div>
      </div>
    </div>
  );
}
