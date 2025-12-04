import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScrollArea, ScrollBar } from './ScrollArea';

const meta = {
  title: 'Components/Layout/ScrollArea',
  component: ScrollArea,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  tags: ['autodocs'],
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

const tags = [
  'Ethereum',
  'Beacon Chain',
  'Validators',
  'Attestations',
  'Blocks',
  'Slots',
  'Epochs',
  'Finality',
  'Consensus',
  'Execution',
  'PeerDAS',
  'Data Availability',
  'Blobs',
  'KZG Commitments',
  'Proposers',
  'Sync Committee',
  'Fork Choice',
  'Checkpoints',
  'Justification',
  'Withdrawals',
];

/**
 * Basic vertical scroll area with a list of items.
 */
export const Basic: Story = {
  render: () => (
    <ScrollArea className="h-72 w-48 rounded-sm border border-border">
      <div className="p-4">
        <h4 className="mb-4 text-sm leading-none font-medium text-foreground">Tags</h4>
        {tags.map(tag => (
          <div key={tag} className="border-b border-border py-2 text-sm text-muted last:border-0">
            {tag}
          </div>
        ))}
      </div>
    </ScrollArea>
  ),
};

/**
 * Horizontal scroll area for wide content.
 */
export const Horizontal: Story = {
  render: () => (
    <ScrollArea className="w-96 rounded-sm border border-border whitespace-nowrap">
      <div className="flex w-max gap-4 p-4">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="flex size-24 shrink-0 items-center justify-center rounded-sm bg-muted/30 text-sm font-medium text-muted"
          >
            Item {i + 1}
          </div>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  ),
};

/**
 * Both vertical and horizontal scrolling enabled.
 */
export const BothDirections: Story = {
  render: () => (
    <ScrollArea className="size-72 rounded-sm border border-border">
      <div className="w-[600px] p-4">
        <h4 className="mb-4 text-sm leading-none font-medium text-foreground">Wide & Tall Content</h4>
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: 60 }).map((_, i) => (
            <div
              key={i}
              className="flex size-16 items-center justify-center rounded-sm bg-muted/30 text-xs font-medium text-muted"
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  ),
};

/**
 * Scroll area styled as a card with header.
 */
export const InCard: Story = {
  render: () => (
    <div className="w-80 rounded-sm border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
        <p className="text-xs text-muted">Last 24 hours</p>
      </div>
      <ScrollArea className="h-64">
        <div className="p-2">
          {Array.from({ length: 15 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-sm px-2 py-2 hover:bg-muted/10">
              <div className="size-8 rounded-full bg-primary/20" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Event {i + 1}</p>
                <p className="text-xs text-muted">{i + 1} minutes ago</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  ),
};

/**
 * Data table with horizontal scrolling for many columns.
 */
export const DataTable: Story = {
  decorators: [
    Story => (
      <div className="min-w-[800px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="rounded-sm border border-border">
      <ScrollArea className="w-full">
        <table className="w-max min-w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20">
              {['Slot', 'Block', 'Proposer', 'Attestations', 'Deposits', 'Exits', 'Status', 'Time', 'Graffiti'].map(
                header => (
                  <th key={header} className="px-4 py-3 text-left font-medium whitespace-nowrap text-foreground">
                    {header}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }).map((_, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                <td className="px-4 py-3 whitespace-nowrap text-muted">{1000000 + i}</td>
                <td className="px-4 py-3 whitespace-nowrap text-primary">0x{(i + 1).toString(16).padStart(8, '0')}</td>
                <td className="px-4 py-3 whitespace-nowrap text-muted">Validator {i + 100}</td>
                <td className="px-4 py-3 whitespace-nowrap text-muted">{64 + i}</td>
                <td className="px-4 py-3 whitespace-nowrap text-muted">{i % 3}</td>
                <td className="px-4 py-3 whitespace-nowrap text-muted">{i % 5}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="rounded-full bg-success/20 px-2 py-0.5 text-xs text-success">Proposed</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-muted">{i + 1}s ago</td>
                <td className="px-4 py-3 whitespace-nowrap text-muted">ethPandaOps</td>
              </tr>
            ))}
          </tbody>
        </table>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  ),
};

/**
 * Code block with scrolling.
 */
export const CodeBlock: Story = {
  render: () => (
    <ScrollArea className="h-48 w-96 rounded-sm border border-border bg-background">
      <pre className="p-4 font-mono text-xs text-muted">
        {`{
  "slot": 1234567,
  "proposer_index": 12345,
  "parent_root": "0x1234...abcd",
  "state_root": "0x5678...efgh",
  "body": {
    "randao_reveal": "0x9abc...ijkl",
    "eth1_data": {
      "deposit_root": "0xdef0...mnop",
      "deposit_count": 123456,
      "block_hash": "0x1234...qrst"
    },
    "graffiti": "ethPandaOps",
    "proposer_slashings": [],
    "attester_slashings": [],
    "attestations": [...],
    "deposits": [],
    "voluntary_exits": [],
    "sync_aggregate": {
      "sync_committee_bits": "0xff...",
      "sync_committee_signature": "0x..."
    }
  }
}`}
      </pre>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  ),
};

/**
 * Heatmap grid with horizontal scrolling (similar to Custody Window).
 */
export const HeatmapGrid: Story = {
  decorators: [
    Story => (
      <div className="min-w-[800px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <div className="rounded-sm border border-border">
      <div className="border-b border-border bg-muted/20 px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">Data Column Availability</h3>
        <p className="text-xs text-muted">128 columns</p>
      </div>
      <ScrollArea className="w-full">
        <div className="p-4">
          {Array.from({ length: 5 }).map((_, rowIndex) => (
            <div key={rowIndex} className="mb-1 flex items-center gap-2">
              <span className="w-20 text-xs text-muted">Row {rowIndex + 1}</span>
              <div className="flex gap-px">
                {Array.from({ length: 128 }).map((_, colIndex) => {
                  const availability = Math.random();
                  const color =
                    availability > 0.95
                      ? 'bg-success'
                      : availability > 0.8
                        ? 'bg-success/70'
                        : availability > 0.6
                          ? 'bg-warning'
                          : 'bg-danger';
                  return <div key={colIndex} className={`size-2 rounded-sm ${color}`} title={`Col ${colIndex}`} />;
                })}
              </div>
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  ),
};
