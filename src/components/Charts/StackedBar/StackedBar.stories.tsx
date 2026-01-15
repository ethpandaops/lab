import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';
import { StackedBar } from './StackedBar';
import type { StackedBarSegment } from './StackedBar.types';

const meta = {
  title: 'Components/Charts/StackedBar',
  component: StackedBar,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-xs bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
  argTypes: {
    showLabels: {
      control: { type: 'boolean' },
      description: 'Show labels on segments',
    },
    showPercentages: {
      control: { type: 'boolean' },
      description: 'Show percentage values',
    },
    showLegend: {
      control: { type: 'boolean' },
      description: 'Show legend below the bar',
    },
    animated: {
      control: { type: 'boolean' },
      description: 'Enable animation',
    },
    height: {
      control: { type: 'number' },
      description: 'Component height in pixels',
    },
    minWidthPercent: {
      control: { type: 'number', min: 0, max: 10, step: 0.1 },
      description: 'Minimum % to render a segment',
    },
    minLabelWidthPercent: {
      control: { type: 'number', min: 0, max: 20, step: 1 },
      description: 'Minimum % to show labels',
    },
    selectedSegmentName: {
      control: { type: 'text' },
      description: 'Name of selected segment',
    },
  },
} satisfies Meta<typeof StackedBar>;

export default meta;
type Story = StoryObj<typeof meta>;

// ============================================================================
// Gas Breakdown Examples (Ethereum use case)
// ============================================================================

/**
 * Gas breakdown for a typical Ethereum transaction
 */
export const GasBreakdown: Story = {
  args: {
    segments: [
      { name: 'Intrinsic', value: 46864, color: '#6366f1', description: 'Base transaction cost' },
      { name: 'EVM Execution', value: 761334, color: '#3b82f6', description: 'Smart contract execution' },
    ],
    title: 'Gas Breakdown',
    subtitle: 'Receipt: 646K',
    footerLeft: 'Total consumed: 808K',
    footerRight: 'Refund: -162K (capped at 20%)',
    footerRightClassName: 'text-success',
  },
};

/**
 * Gas breakdown with legend
 */
export const GasBreakdownWithLegend: Story = {
  args: {
    segments: [
      { name: 'Intrinsic', value: 46864, color: '#6366f1', description: 'Base transaction cost' },
      { name: 'EVM Execution', value: 761334, color: '#3b82f6', description: 'Smart contract execution' },
    ],
    title: 'Gas Breakdown',
    subtitle: 'Receipt: 646K',
    showLegend: true,
  },
};

/**
 * Gas breakdown for a failed transaction
 */
export const GasBreakdownFailed: Story = {
  name: 'Gas Breakdown - Failed Transaction',
  args: {
    segments: [{ name: 'EVM Execution', value: 80000, color: '#3b82f6' }],
    title: 'Gas Breakdown',
    subtitle: 'Receipt: 80K',
    footerLeft: 'Intrinsic: N/A (failed transaction)',
    footerLeftClassName: 'text-warning',
  },
};

/**
 * Gas breakdown with high EVM usage
 */
export const GasBreakdownEVMHeavy: Story = {
  name: 'Gas Breakdown - EVM Heavy',
  args: {
    segments: [
      { name: 'Intrinsic', value: 21000, color: '#6366f1' },
      { name: 'EVM Execution', value: 2500000, color: '#3b82f6' },
    ],
    title: 'Gas Breakdown',
    subtitle: 'Receipt: 2.12M',
    footerRight: 'Refund: -400K (capped)',
    footerRightClassName: 'text-success',
  },
};

// ============================================================================
// Interactive Examples
// ============================================================================

/**
 * Interactive with click handler
 */
export const Interactive: Story = {
  args: {
    segments: [
      { name: 'Engineering', value: 500000, color: '#3b82f6', description: 'Development team budget' },
      { name: 'Marketing', value: 200000, color: '#10b981', description: 'Marketing campaigns' },
      { name: 'Operations', value: 150000, color: '#f59e0b', description: 'Day-to-day operations' },
      { name: 'Other', value: 50000, color: '#6b7280', description: 'Miscellaneous expenses' },
    ],
    title: 'Annual Budget',
    subtitle: 'Click a segment',
    showLegend: true,
    onSegmentClick: fn(),
    onSegmentHover: fn(),
    valueFormatter: (v: number) => `$${(v / 1000).toFixed(0)}K`,
  },
};

/**
 * Selection demo with state
 */
export const SelectionDemo: Story = {
  render: () => {
    const [selected, setSelected] = useState<string | undefined>(undefined);
    const segments: StackedBarSegment[] = [
      { name: 'Engineering', value: 500000, color: '#3b82f6' },
      { name: 'Marketing', value: 200000, color: '#10b981' },
      { name: 'Operations', value: 150000, color: '#f59e0b' },
      { name: 'Other', value: 50000, color: '#6b7280' },
    ];

    return (
      <div>
        <p className="mb-4 text-sm text-muted">Selected: {selected || 'None'} - Click a segment or legend item</p>
        <StackedBar
          segments={segments}
          title="Click to Select"
          showLegend
          selectedSegmentName={selected}
          onSegmentClick={seg => setSelected(seg.name === selected ? undefined : seg.name)}
          valueFormatter={(v: number) => `$${(v / 1000).toFixed(0)}K`}
        />
      </div>
    );
  },
};

// ============================================================================
// Generic Examples
// ============================================================================

/**
 * Default stacked bar with automatic colors
 */
export const Default: Story = {
  args: {
    segments: [
      { name: 'Category A', value: 450 },
      { name: 'Category B', value: 300 },
      { name: 'Category C', value: 150 },
      { name: 'Category D', value: 100 },
    ],
    title: 'Distribution',
    subtitle: 'Total: 1,000',
  },
};

/**
 * With legend shown
 */
export const WithLegend: Story = {
  args: {
    segments: [
      { name: 'Category A', value: 450 },
      { name: 'Category B', value: 300 },
      { name: 'Category C', value: 150 },
      { name: 'Category D', value: 100 },
    ],
    title: 'Distribution',
    subtitle: 'Total: 1,000',
    showLegend: true,
  },
};

/**
 * Budget allocation example
 */
export const BudgetAllocation: Story = {
  args: {
    segments: [
      { name: 'Engineering', value: 500000, color: '#3b82f6' },
      { name: 'Marketing', value: 200000, color: '#10b981' },
      { name: 'Operations', value: 150000, color: '#f59e0b' },
      { name: 'Other', value: 50000, color: '#6b7280' },
    ],
    title: 'Annual Budget',
    subtitle: 'Total: $900K',
    valueFormatter: (v: number) => `$${(v / 1000).toFixed(0)}K`,
  },
};

/**
 * Resource usage example
 */
export const ResourceUsage: Story = {
  args: {
    segments: [
      { name: 'CPU', value: 72, color: '#ef4444' },
      { name: 'Memory', value: 45, color: '#3b82f6' },
      { name: 'Disk', value: 28, color: '#10b981' },
    ],
    total: 100,
    title: 'Resource Utilization',
    subtitle: '145% total',
    valueFormatter: (v: number) => `${v}%`,
    showPercentages: false,
  },
};

/**
 * Time distribution example
 */
export const TimeDistribution: Story = {
  args: {
    segments: [
      { name: 'Development', value: 32, color: '#8b5cf6' },
      { name: 'Meetings', value: 12, color: '#f59e0b' },
      { name: 'Code Review', value: 8, color: '#3b82f6' },
      { name: 'Documentation', value: 4, color: '#10b981' },
    ],
    total: 40,
    title: 'Weekly Time Allocation',
    subtitle: '40 hours',
    valueFormatter: (v: number) => `${v}h`,
    footerLeft: 'Remaining: 0h',
    showPercentages: true,
    showLegend: true,
  },
};

/**
 * Two segments only
 */
export const TwoSegments: Story = {
  args: {
    segments: [
      { name: 'Used', value: 750, color: '#3b82f6' },
      { name: 'Available', value: 250, color: '#e5e7eb' },
    ],
    title: 'Storage',
    subtitle: '75% used',
  },
};

/**
 * Many small segments with auto-hidden labels
 */
export const ManySegments: Story = {
  args: {
    segments: [
      { name: 'A', value: 25 },
      { name: 'B', value: 20 },
      { name: 'C', value: 18 },
      { name: 'D', value: 12 },
      { name: 'E', value: 10 },
      { name: 'F', value: 8 },
      { name: 'G', value: 7 },
    ],
    title: 'Category Distribution',
    showLegend: true,
    minLabelWidthPercent: 15,
  },
};

/**
 * Without labels (compact view)
 */
export const NoLabels: Story = {
  args: {
    segments: [
      { name: 'Complete', value: 65, color: '#10b981' },
      { name: 'In Progress', value: 25, color: '#f59e0b' },
      { name: 'Pending', value: 10, color: '#6b7280' },
    ],
    title: 'Project Status',
    subtitle: '65% complete',
    showLabels: false,
    showLegend: true,
    height: 100,
  },
};

/**
 * Without percentages
 */
export const NoPercentages: Story = {
  args: {
    segments: [
      { name: 'Reads', value: 1250000 },
      { name: 'Writes', value: 450000 },
    ],
    title: 'Database Operations',
    showPercentages: false,
  },
};

/**
 * Compact height
 */
export const Compact: Story = {
  args: {
    segments: [
      { name: 'Success', value: 95, color: '#10b981' },
      { name: 'Failed', value: 5, color: '#ef4444' },
    ],
    total: 100,
    height: 60,
    showLabels: false,
  },
};

/**
 * Large height with legend
 */
export const Large: Story = {
  args: {
    segments: [
      { name: 'Active', value: 1200, color: '#3b82f6' },
      { name: 'Inactive', value: 300, color: '#9ca3af' },
    ],
    title: 'User Status',
    subtitle: '1,500 total users',
    height: 180,
    showLegend: true,
  },
};

/**
 * Without animation
 */
export const NoAnimation: Story = {
  args: {
    segments: [
      { name: 'Part A', value: 60 },
      { name: 'Part B', value: 40 },
    ],
    animated: false,
  },
};

/**
 * Single segment (edge case)
 */
export const SingleSegment: Story = {
  args: {
    segments: [{ name: 'Total', value: 1000, color: '#3b82f6' }],
    title: 'Single Value',
  },
};

/**
 * With very small segments (some hidden)
 */
export const SmallSegments: Story = {
  args: {
    segments: [
      { name: 'Large', value: 900 },
      { name: 'Medium', value: 80 },
      { name: 'Small', value: 15 },
      { name: 'Tiny', value: 4 },
      { name: 'Micro', value: 1 },
    ],
    title: 'Size Distribution',
    subtitle: 'Tiny segments auto-hidden',
    showLegend: true,
    minWidthPercent: 1,
  },
};

/**
 * Empty state
 */
export const Empty: Story = {
  args: {
    segments: [],
    title: 'No Data',
    emptyMessage: 'No segments to display',
  },
};

/**
 * Empty with custom message
 */
export const EmptyCustomMessage: Story = {
  args: {
    segments: [],
    title: 'Transaction Data',
    emptyMessage: 'Select a transaction to view gas breakdown',
  },
};

/**
 * All zero values
 */
export const ZeroValues: Story = {
  args: {
    segments: [
      { name: 'A', value: 0 },
      { name: 'B', value: 0 },
    ],
    title: 'Zero Values',
    emptyMessage: 'All values are zero',
  },
};

/**
 * Pre-selected segment
 */
export const PreSelected: Story = {
  args: {
    segments: [
      { name: 'Engineering', value: 500000, color: '#3b82f6' },
      { name: 'Marketing', value: 200000, color: '#10b981' },
      { name: 'Operations', value: 150000, color: '#f59e0b' },
    ],
    title: 'Budget',
    showLegend: true,
    selectedSegmentName: 'Marketing',
  },
};

/**
 * With segment descriptions in tooltips
 */
export const WithDescriptions: Story = {
  args: {
    segments: [
      { name: 'Frontend', value: 45, description: 'React, TypeScript, Tailwind' },
      { name: 'Backend', value: 35, description: 'Go, PostgreSQL, Redis' },
      { name: 'DevOps', value: 20, description: 'Kubernetes, Terraform, CI/CD' },
    ],
    title: 'Team Composition',
    subtitle: 'Hover for details',
    showLegend: true,
    valueFormatter: (v: number) => `${v}%`,
  },
};
