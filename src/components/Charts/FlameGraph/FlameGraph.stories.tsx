import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { FlameGraph } from './FlameGraph';
import { EVM_CALL_TYPE_COLORS, FILE_TYPE_COLORS, PROCESS_TYPE_COLORS } from './FlameGraph.types';
import type { FlameGraphNode, FlameGraphColorMap } from './FlameGraph.types';

const meta = {
  title: 'Components/Charts/FlameGraph',
  component: FlameGraph,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    Story => (
      <div className="min-w-[800px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
  argTypes: {
    minWidthPercent: {
      control: { type: 'number', min: 0, max: 10, step: 0.1 },
      description: 'Minimum width % to render a node',
    },
    height: {
      control: { type: 'number' },
      description: 'Chart height in pixels',
    },
    rowHeight: {
      control: { type: 'number' },
      description: 'Height of each row',
    },
    showLabels: {
      control: { type: 'boolean' },
      description: 'Show labels on nodes',
    },
    showLegend: {
      control: { type: 'boolean' },
      description: 'Show legend',
    },
    selectedNodeId: {
      control: { type: 'text' },
      description: 'ID of selected node',
    },
  },
} satisfies Meta<typeof FlameGraph>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// EVM Call Tree Examples (Ethereum use case)
// ============================================================================

const EVM_CALL_TREE: FlameGraphNode = {
  id: '0',
  label: 'Root',
  value: 1969778,
  selfValue: 45000,
  category: 'CALL',
  children: [
    {
      id: '1',
      label: '0x7a25...Router',
      value: 420000,
      selfValue: 45000,
      category: 'CALL',
      metadata: { address: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D', opcodeCount: 850 },
      children: [
        {
          id: '2',
          label: '0xPair...',
          value: 180000,
          selfValue: 180000,
          category: 'STATICCALL',
          metadata: { opcodeCount: 320 },
        },
        {
          id: '3',
          label: '0xToken...',
          value: 95000,
          selfValue: 95000,
          category: 'CALL',
          metadata: { opcodeCount: 180 },
        },
        {
          id: '10',
          label: '0xFactory...',
          value: 100000,
          selfValue: 100000,
          category: 'STATICCALL',
          metadata: { opcodeCount: 200 },
        },
      ],
    },
    {
      id: '4',
      label: '0xImpl...',
      value: 120000,
      selfValue: 120000,
      category: 'DELEGATECALL',
      metadata: { opcodeCount: 280 },
    },
    {
      id: '5',
      label: '0xProxy...',
      value: 800000,
      selfValue: 200000,
      category: 'CALL',
      metadata: { opcodeCount: 450 },
      children: [
        {
          id: '6',
          label: '0xLogic...',
          value: 600000,
          selfValue: 300000,
          category: 'DELEGATECALL',
          metadata: { opcodeCount: 680 },
          children: [
            {
              id: '7',
              label: '0xOracle...',
              value: 150000,
              selfValue: 150000,
              category: 'STATICCALL',
              metadata: { opcodeCount: 220 },
            },
            {
              id: '8',
              label: '0xPool...',
              value: 150000,
              selfValue: 150000,
              category: 'CALL',
              metadata: { opcodeCount: 310 },
            },
          ],
        },
      ],
    },
    {
      id: '9',
      label: '0xCreate...',
      value: 584778,
      selfValue: 584778,
      category: 'CREATE2',
      metadata: { opcodeCount: 1200 },
    },
  ],
};

/**
 * EVM transaction call tree with gas breakdown
 */
export const EVMCallTree: Story = {
  args: {
    data: EVM_CALL_TREE,
    colorMap: EVM_CALL_TYPE_COLORS,
    title: 'Transaction Call Tree',
    valueUnit: 'gas',
  },
};

/**
 * EVM call tree with errors
 */
export const EVMCallTreeWithErrors: Story = {
  args: {
    data: {
      ...EVM_CALL_TREE,
      children: [
        ...(EVM_CALL_TREE.children || []).slice(0, 2),
        {
          id: 'err',
          label: '0xFailed...',
          value: 500000,
          selfValue: 500000,
          category: 'CALL',
          hasError: true,
          metadata: { error: 'Out of gas' },
        },
      ],
    },
    colorMap: EVM_CALL_TYPE_COLORS,
    title: 'Failed Transaction',
    valueUnit: 'gas',
  },
};

// ============================================================================
// File System Examples
// ============================================================================

const FILE_TREE: FlameGraphNode = {
  id: 'root',
  label: '/',
  value: 1024000000,
  category: 'folder',
  children: [
    {
      id: 'home',
      label: 'home',
      value: 512000000,
      category: 'folder',
      children: [
        {
          id: 'docs',
          label: 'Documents',
          value: 256000000,
          category: 'folder',
          children: [
            { id: 'doc1', label: 'report.pdf', value: 150000000, category: 'document' },
            { id: 'doc2', label: 'notes.txt', value: 50000000, category: 'file' },
            { id: 'doc3', label: 'data.xlsx', value: 56000000, category: 'document' },
          ],
        },
        {
          id: 'pics',
          label: 'Pictures',
          value: 180000000,
          category: 'folder',
          children: [
            { id: 'pic1', label: 'vacation.jpg', value: 80000000, category: 'image' },
            { id: 'pic2', label: 'family.png', value: 100000000, category: 'image' },
          ],
        },
        {
          id: 'vids',
          label: 'Videos',
          value: 76000000,
          category: 'folder',
          children: [{ id: 'vid1', label: 'clip.mp4', value: 76000000, category: 'video' }],
        },
      ],
    },
    {
      id: 'var',
      label: 'var',
      value: 312000000,
      category: 'folder',
      children: [
        { id: 'log', label: 'log', value: 200000000, category: 'folder' },
        { id: 'cache', label: 'cache', value: 112000000, category: 'folder' },
      ],
    },
    {
      id: 'usr',
      label: 'usr',
      value: 200000000,
      category: 'folder',
    },
  ],
};

/**
 * File system disk usage visualization
 */
export const FileSystemUsage: Story = {
  args: {
    data: FILE_TREE,
    colorMap: FILE_TYPE_COLORS,
    title: 'Disk Usage',
    valueUnit: 'bytes',
    valueFormatter: (v: number) => {
      if (v >= 1e9) return `${(v / 1e9).toFixed(1)}GB`;
      if (v >= 1e6) return `${(v / 1e6).toFixed(0)}MB`;
      if (v >= 1e3) return `${(v / 1e3).toFixed(0)}KB`;
      return `${v}B`;
    },
  },
};

// ============================================================================
// Profiling / Performance Examples
// ============================================================================

const PROFILE_DATA: FlameGraphNode = {
  id: 'main',
  label: 'main()',
  value: 1000,
  selfValue: 50,
  category: 'cpu',
  children: [
    {
      id: 'process',
      label: 'processData()',
      value: 600,
      selfValue: 100,
      category: 'cpu',
      children: [
        {
          id: 'read',
          label: 'readFile()',
          value: 200,
          selfValue: 200,
          category: 'io',
        },
        {
          id: 'parse',
          label: 'parseJSON()',
          value: 150,
          selfValue: 150,
          category: 'cpu',
        },
        {
          id: 'alloc',
          label: 'allocateBuffers()',
          value: 150,
          selfValue: 150,
          category: 'memory',
        },
      ],
    },
    {
      id: 'network',
      label: 'sendResults()',
      value: 350,
      selfValue: 50,
      category: 'network',
      children: [
        {
          id: 'wait',
          label: 'waitForResponse()',
          value: 300,
          selfValue: 300,
          category: 'wait',
        },
      ],
    },
  ],
};

/**
 * CPU/Memory profiling flame graph
 */
export const ProfilingData: Story = {
  args: {
    data: PROFILE_DATA,
    colorMap: PROCESS_TYPE_COLORS,
    title: 'Performance Profile',
    valueUnit: 'ms',
  },
};

// ============================================================================
// Generic Examples
// ============================================================================

const SIMPLE_TREE: FlameGraphNode = {
  id: '0',
  label: 'Root',
  value: 1000,
  selfValue: 100,
  children: [
    {
      id: '1',
      label: 'Child A',
      value: 500,
      selfValue: 200,
      children: [
        { id: '2', label: 'Grandchild 1', value: 200, selfValue: 200 },
        { id: '3', label: 'Grandchild 2', value: 100, selfValue: 100 },
      ],
    },
    {
      id: '4',
      label: 'Child B',
      value: 400,
      selfValue: 400,
    },
  ],
};

/**
 * Default view with simple tree (no categories)
 */
export const Default: Story = {
  args: {
    data: SIMPLE_TREE,
    title: 'Hierarchy',
    colorMap: undefined,
    showLegend: false,
  },
};

/**
 * Custom color scheme
 */
export const CustomColors: Story = {
  args: {
    data: {
      id: 'root',
      label: 'Total Budget',
      value: 1000000,
      category: 'total',
      children: [
        { id: 'eng', label: 'Engineering', value: 500000, category: 'engineering' },
        { id: 'mkt', label: 'Marketing', value: 300000, category: 'marketing' },
        { id: 'ops', label: 'Operations', value: 200000, category: 'operations' },
      ],
    },
    colorMap: {
      total: { bg: 'bg-slate-600', hover: 'hover:bg-slate-500' },
      engineering: { bg: 'bg-blue-500', hover: 'hover:bg-blue-400' },
      marketing: { bg: 'bg-green-500', hover: 'hover:bg-green-400' },
      operations: { bg: 'bg-amber-500', hover: 'hover:bg-amber-400' },
    } as FlameGraphColorMap,
    title: 'Budget Allocation',
    valueFormatter: (v: number) => `$${(v / 1000).toFixed(0)}K`,
  },
};

/**
 * Interactive with click handler
 */
export const Interactive: Story = {
  args: {
    data: SIMPLE_TREE,
    title: 'Click a Node',
    onNodeClick: fn(),
    onNodeHover: fn(),
  },
};

/**
 * With selected node
 */
export const WithSelection: Story = {
  args: {
    data: SIMPLE_TREE,
    title: 'Selection',
    selectedNodeId: '1',
  },
};

/**
 * Without labels (compact view)
 */
export const NoLabels: Story = {
  args: {
    data: SIMPLE_TREE,
    title: 'Compact View',
    showLabels: false,
    rowHeight: 16,
  },
};

/**
 * Without legend
 */
export const NoLegend: Story = {
  args: {
    data: EVM_CALL_TREE,
    colorMap: EVM_CALL_TYPE_COLORS,
    title: 'No Legend',
    showLegend: false,
  },
};

/**
 * Empty data
 */
export const Empty: Story = {
  args: {
    data: null,
    title: 'No Data',
  },
};

/**
 * Single node
 */
export const SingleNode: Story = {
  args: {
    data: {
      id: '0',
      label: 'Only Node',
      value: 1000,
    },
    title: 'Single Node',
    height: 100,
  },
};

/**
 * Deep nesting
 */
export const DeepNesting: Story = {
  render: () => {
    // Create deep tree programmatically
    const createDeepTree = (depth: number, maxDepth: number, value: number): FlameGraphNode => {
      const hasChildren = depth < maxDepth;
      const childValue = hasChildren ? Math.floor(value * 0.8) : 0;
      return {
        id: `depth-${depth}`,
        label: `Level ${depth}`,
        value,
        selfValue: value - childValue,
        category: ['cpu', 'memory', 'io', 'network'][depth % 4],
        children: hasChildren ? [createDeepTree(depth + 1, maxDepth, childValue)] : undefined,
      };
    };

    return (
      <FlameGraph
        data={createDeepTree(0, 10, 1000)}
        colorMap={PROCESS_TYPE_COLORS}
        title="Deep Call Stack"
        valueUnit="ms"
        height={350}
      />
    );
  },
};

/**
 * Selection demo with state
 */
export const SelectionDemo: Story = {
  render: () => {
    const [selected, setSelected] = useState<string | undefined>(undefined);
    return (
      <div>
        <p className="mb-4 text-sm text-muted">Selected: {selected || 'None'} - Click a node</p>
        <FlameGraph
          data={EVM_CALL_TREE}
          colorMap={EVM_CALL_TYPE_COLORS}
          title="Click to Select"
          valueUnit="gas"
          selectedNodeId={selected}
          onNodeClick={node => setSelected(node.id)}
        />
      </div>
    );
  },
};

/**
 * Custom tooltip
 */
export const CustomTooltip: Story = {
  args: {
    data: PROFILE_DATA,
    colorMap: PROCESS_TYPE_COLORS,
    title: 'Custom Tooltip',
    valueUnit: 'ms',
    renderTooltip: node => (
      <div className="text-sm">
        <div className="font-bold text-primary">{node.label}</div>
        <div className="mt-1 text-xs text-muted">
          Duration: {node.value}ms ({node.category})
        </div>
      </div>
    ),
  },
};
