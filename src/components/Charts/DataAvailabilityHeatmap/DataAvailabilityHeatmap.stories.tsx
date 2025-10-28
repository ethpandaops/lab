import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { DataAvailabilityHeatmap } from './DataAvailabilityHeatmap';
import {
  generateWindowLevelData,
  generateDayLevelData,
  generateHourLevelData,
  generateEpochLevelData,
  generateSlotLevelData,
} from './mockData';

const meta = {
  title: 'Components/Charts/DataAvailabilityHeatmap',
  component: DataAvailabilityHeatmap,
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof DataAvailabilityHeatmap>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Window-level view (Level 1) showing the entire 19-day custody window across all 128 columns.
 * This is the top level of the hierarchy at `/ethereum/data-availability`.
 */
export const WindowLevel: Story = {
  args: {
    rows: generateWindowLevelData(19),
    granularity: 'window',
    cellSize: 'xs',
    showColumnHeader: true,
    showLegend: true,
  },
};

/**
 * Window-level view with a selected column. Other columns are dimmed to 10% opacity.
 * Shows the clear selection UI banner at the top.
 */
export const WindowLevelWithSelectedColumn: Story = {
  args: {
    rows: generateWindowLevelData(19),
    granularity: 'window',
    cellSize: 'xs',
    selectedColumnIndex: 42,
    showColumnHeader: true,
    showLegend: true,
    onClearColumnSelection: () => alert('Clear selection clicked'),
  },
};

/**
 * Day-level view (Level 2) showing 24 hours in a single day.
 * Accessed via `/ethereum/data-availability/$window`.
 */
export const DayLevel: Story = {
  args: {
    rows: generateDayLevelData('2024-01-15'),
    granularity: 'day',
    cellSize: 'xs',
    showColumnHeader: true,
    showLegend: true,
  },
};

/**
 * Day-level view with a selected column dimmed.
 */
export const DayLevelWithSelectedColumn: Story = {
  args: {
    rows: generateDayLevelData('2024-01-15'),
    granularity: 'day',
    cellSize: 'xs',
    selectedColumnIndex: 42,
    showColumnHeader: true,
    showLegend: true,
    onClearColumnSelection: () => alert('Clear selection clicked'),
  },
};

/**
 * Hour-level view (Level 3) showing ~9 epochs in a single hour.
 * Accessed via `/ethereum/data-availability/$window/$hour`.
 */
export const HourLevel: Story = {
  args: {
    rows: generateHourLevelData('2024-01-15-hour-8', '2024-01-15', 8),
    granularity: 'hour',
    cellSize: 'xs',
    showColumnHeader: true,
    showLegend: true,
  },
};

/**
 * Hour-level view with a selected column dimmed.
 */
export const HourLevelWithSelectedColumn: Story = {
  args: {
    rows: generateHourLevelData('2024-01-15-hour-8', '2024-01-15', 8),
    granularity: 'hour',
    cellSize: 'xs',
    selectedColumnIndex: 42,
    showColumnHeader: true,
    showLegend: true,
    onClearColumnSelection: () => alert('Clear selection clicked'),
  },
};

/**
 * Epoch-level view (Level 4) showing 32 slots in a single epoch.
 * Accessed via `/ethereum/data-availability/$window/$hour/$epoch`.
 */
export const EpochLevel: Story = {
  args: {
    rows: generateEpochLevelData('epoch-100000', 100000),
    granularity: 'epoch',
    cellSize: 'xs',
    showColumnHeader: true,
    showLegend: true,
  },
};

/**
 * Epoch-level view with a selected column dimmed.
 */
export const EpochLevelWithSelectedColumn: Story = {
  args: {
    rows: generateEpochLevelData('epoch-100000', 100000),
    granularity: 'epoch',
    cellSize: 'xs',
    selectedColumnIndex: 42,
    showColumnHeader: true,
    showLegend: true,
    onClearColumnSelection: () => alert('Clear selection clicked'),
  },
};

/**
 * Slot-level view (Level 5) showing blobs × columns.
 * This is the bottom level showing each blob's availability across all columns.
 */
export const SlotLevel: Story = {
  args: {
    rows: generateSlotLevelData('slot-3200000', 3200000, 6),
    granularity: 'slot',
    cellSize: 'xs',
    showColumnHeader: true,
    showLegend: true,
  },
};

/**
 * Slot-level view with a selected column dimmed.
 */
export const SlotLevelWithSelectedColumn: Story = {
  args: {
    rows: generateSlotLevelData('slot-3200000', 3200000, 6),
    granularity: 'slot',
    cellSize: 'xs',
    selectedColumnIndex: 42,
    showColumnHeader: true,
    showLegend: true,
    onClearColumnSelection: () => alert('Clear selection clicked'),
  },
};

/**
 * Interactive demo showing the full drill-down hierarchy with column selection.
 * Hover over column headers or row labels to preview selection.
 * Click cells to select a column and see the dimming effect.
 */
export const InteractiveHierarchyDemo: Story = {
  args: {
    rows: [],
    granularity: 'window',
  },
  render: () => {
    const [selectedColumn, setSelectedColumn] = useState<number | undefined>();
    const windowData = generateWindowLevelData(19);

    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-sm bg-background p-4">
          <h3 className="mb-2 text-lg/7 font-semibold text-foreground">Level 1: Window View (19 days)</h3>
          <p className="mb-4 text-sm/6 text-muted">
            Hover column headers or row labels to preview selection
            <br />
            Click a cell to select a column (others will dim to 10% opacity)
            <br />
            Click a day label to view all columns for that day
          </p>
          <DataAvailabilityHeatmap
            rows={windowData}
            granularity="window"
            cellSize="xs"
            selectedColumnIndex={selectedColumn}
            onCellClick={(identifier, columnIndex) => {
              console.log(`Navigate to: /ethereum/data-availability/date/${identifier}?column_index=${columnIndex}`);
              setSelectedColumn(columnIndex);
            }}
            onRowClick={identifier => {
              console.log(`Navigate to: /ethereum/data-availability/date/${identifier}`);
              alert(`Would navigate to day view for ${identifier} (all columns)`);
            }}
            onClearColumnSelection={() => setSelectedColumn(undefined)}
          />
        </div>
      </div>
    );
  },
};

/**
 * Interactive demo showing day-level (hours) drill-down with column selection.
 */
export const InteractiveDayDrillDown: Story = {
  args: {
    rows: [],
    granularity: 'day',
  },
  render: () => {
    const [selectedColumn, setSelectedColumn] = useState<number | undefined>(42);
    const dayData = generateDayLevelData('2024-01-15');

    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-sm bg-background p-4">
          <h3 className="mb-2 text-lg/7 font-semibold text-foreground">Level 2: Day View - Hours</h3>
          <p className="mb-4 text-sm/6 text-muted">
            Column {selectedColumn} is selected. Try clearing the selection or selecting a different column.
            <br />
            Click a cell → drill down to hour view (epochs)
            <br />
            Click an hour label → view all columns for that hour
          </p>
          <DataAvailabilityHeatmap
            rows={dayData}
            granularity="day"
            cellSize="xs"
            selectedColumnIndex={selectedColumn}
            onCellClick={(identifier, columnIndex) => {
              const hourMatch = identifier.match(/hour-(\d+)/);
              const hourNum = hourMatch ? hourMatch[1] : 'unknown';
              console.log(
                `Navigate to: /ethereum/data-availability/date/2024-01-15/${hourNum}?column_index=${columnIndex}`
              );
              setSelectedColumn(columnIndex);
              alert(`Would navigate to hour view (epochs) for hour ${hourNum}, column ${columnIndex}`);
            }}
            onRowClick={identifier => {
              const hourMatch = identifier.match(/hour-(\d+)/);
              const hourNum = hourMatch ? hourMatch[1] : 'unknown';
              console.log(`Navigate to: /ethereum/data-availability/date/2024-01-15/${hourNum}`);
              alert(`Would navigate to hour view (epochs) for hour ${hourNum} (all columns)`);
            }}
            onClearColumnSelection={() => setSelectedColumn(undefined)}
          />
        </div>
      </div>
    );
  },
};

/**
 * Interactive demo showing hour-level (epochs) drill-down with column selection.
 */
export const InteractiveHourDrillDown: Story = {
  args: {
    rows: [],
    granularity: 'hour',
  },
  render: () => {
    const [selectedColumn, setSelectedColumn] = useState<number | undefined>(42);
    const hourData = generateHourLevelData('2024-01-15-hour-8', '2024-01-15', 8);

    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-sm bg-background p-4">
          <h3 className="mb-2 text-lg/7 font-semibold text-foreground">Level 3: Hour View - Epochs</h3>
          <p className="mb-4 text-sm/6 text-muted">
            Column {selectedColumn} is selected. Try clearing the selection or selecting a different column.
            <br />
            Click a cell → drill down to epoch view (slots)
            <br />
            Click an epoch label → view all columns for that epoch
          </p>
          <DataAvailabilityHeatmap
            rows={hourData}
            granularity="hour"
            cellSize="xs"
            selectedColumnIndex={selectedColumn}
            onCellClick={(identifier, columnIndex) => {
              const epochMatch = identifier.match(/epoch-(\d+)/);
              const epochNum = epochMatch ? epochMatch[1] : 'unknown';
              console.log(`Navigate to: /ethereum/data-availability/epoch/${epochNum}?column_index=${columnIndex}`);
              setSelectedColumn(columnIndex);
              alert(`Would navigate to epoch view (slots) for epoch ${epochNum}, column ${columnIndex}`);
            }}
            onRowClick={identifier => {
              const epochMatch = identifier.match(/epoch-(\d+)/);
              const epochNum = epochMatch ? epochMatch[1] : 'unknown';
              console.log(`Navigate to: /ethereum/data-availability/epoch/${epochNum}`);
              alert(`Would navigate to epoch view (slots) for epoch ${epochNum} (all columns)`);
            }}
            onClearColumnSelection={() => setSelectedColumn(undefined)}
          />
        </div>
      </div>
    );
  },
};

/**
 * Interactive demo showing epoch-level (slots) drill-down with column selection.
 */
export const InteractiveEpochDrillDown: Story = {
  args: {
    rows: [],
    granularity: 'epoch',
  },
  render: () => {
    const [selectedColumn, setSelectedColumn] = useState<number | undefined>(42);
    const epochData = generateEpochLevelData('epoch-100000', 100000);

    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-sm bg-background p-4">
          <h3 className="mb-2 text-lg/7 font-semibold text-foreground">Level 3: Epoch View - Slots</h3>
          <p className="mb-4 text-sm/6 text-muted">
            Click a cell → show slot detail view (blobs) for that slot
            <br />
            Click a slot label → show all columns for that slot
          </p>
          <DataAvailabilityHeatmap
            rows={epochData}
            granularity="epoch"
            cellSize="xs"
            selectedColumnIndex={selectedColumn}
            onCellClick={(identifier, columnIndex) => {
              const slotMatch = identifier.match(/slot-(\d+)/);
              const slotNum = slotMatch ? slotMatch[1] : 'unknown';
              console.log(`Navigate to: /ethereum/data-availability/slot/${slotNum}?column_index=${columnIndex}`);
              setSelectedColumn(columnIndex);
              alert(`Would show slot detail view (blobs) for slot ${slotNum}, column ${columnIndex}`);
            }}
            onRowClick={identifier => {
              const slotMatch = identifier.match(/slot-(\d+)/);
              const slotNum = slotMatch ? slotMatch[1] : 'unknown';
              console.log(`Navigate to: /ethereum/data-availability/slot/${slotNum}`);
              alert(`Would show slot detail view (blobs) for slot ${slotNum} (all columns)`);
            }}
            onClearColumnSelection={() => setSelectedColumn(undefined)}
          />
        </div>
      </div>
    );
  },
};

/**
 * Interactive demo showing slot-level (blobs) view with column selection.
 * This is the bottom level where rows represent blob indices.
 */
export const InteractiveSlotView: Story = {
  args: {
    rows: [],
    granularity: 'slot',
  },
  render: () => {
    const [selectedColumn, setSelectedColumn] = useState<number | undefined>(42);
    const slotData = generateSlotLevelData('slot-3200000', 3200000, 6);

    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-sm bg-background p-4">
          <h3 className="mb-2 text-lg/7 font-semibold text-foreground">Level 4: Slot View - Blobs × Columns</h3>
          <p className="mb-4 text-sm/6 text-muted">
            This is the bottom level. Each row is a blob index, each column is a data column.
            <br />
            Click cells to see detailed metrics for that blob and column.
          </p>
          <DataAvailabilityHeatmap
            rows={slotData}
            granularity="slot"
            cellSize="xs"
            selectedColumnIndex={selectedColumn}
            onCellClick={(identifier, columnIndex) => {
              console.log(`Show details for ${identifier}, column ${columnIndex}`);
              setSelectedColumn(columnIndex);
              alert(`Would show detailed metrics for ${identifier}, column ${columnIndex}`);
            }}
            onRowClick={identifier => {
              console.log(`Show details for ${identifier} (all columns)`);
              alert(`Would show detailed metrics for ${identifier} (all columns)`);
            }}
            onClearColumnSelection={() => setSelectedColumn(undefined)}
          />
        </div>
      </div>
    );
  },
};

/**
 * Compact view without legend and column headers for embedding.
 */
export const CompactView: Story = {
  args: {
    rows: generateWindowLevelData(10),
    granularity: 'window',
    showColumnHeader: false,
    showLegend: false,
  },
};

/**
 * Small dataset showing just a few days.
 */
export const SmallDataset: Story = {
  args: {
    rows: generateWindowLevelData(5),
    granularity: 'window',
    showColumnHeader: true,
    showLegend: true,
  },
};

/**
 * Extra small cells (12px) - useful for very dense data or small viewports
 */
export const CellSizeXS: Story = {
  args: {
    rows: generateWindowLevelData(19),
    granularity: 'window',
    cellSize: 'xs',
    showColumnHeader: true,
    showLegend: true,
  },
};

/**
 * Small cells (16px) - compact view for dense data
 */
export const CellSizeSM: Story = {
  args: {
    rows: generateWindowLevelData(19),
    granularity: 'window',
    cellSize: 'sm',
    showColumnHeader: true,
    showLegend: true,
  },
};

/**
 * Medium cells (24px) - default size with good balance
 */
export const CellSizeMD: Story = {
  args: {
    rows: generateWindowLevelData(19),
    granularity: 'window',
    cellSize: 'md',
    showColumnHeader: true,
    showLegend: true,
  },
};

/**
 * Large cells (32px) - easier to see and interact with
 */
export const CellSizeLG: Story = {
  args: {
    rows: generateWindowLevelData(19),
    granularity: 'window',
    cellSize: 'lg',
    showColumnHeader: true,
    showLegend: true,
  },
};

/**
 * Extra large cells (40px) - maximum visibility and interaction area
 */
export const CellSizeXL: Story = {
  args: {
    rows: generateWindowLevelData(19),
    granularity: 'window',
    cellSize: 'xl',
    showColumnHeader: true,
    showLegend: true,
  },
};

/**
 * Side-by-side comparison of all cell sizes
 */
export const CellSizeComparison: Story = {
  args: {
    rows: [],
    granularity: 'window',
  },
  render: () => {
    const data = generateWindowLevelData(5); // Smaller dataset for comparison

    return (
      <div className="flex flex-col gap-8">
        <div className="rounded-sm bg-background p-4">
          <h3 className="mb-2 text-base/7 font-semibold text-foreground">Extra Small (xs - 12px)</h3>
          <p className="mb-4 text-sm/6 text-muted">Most compact, useful for very dense data or small viewports</p>
          <DataAvailabilityHeatmap
            rows={data}
            granularity="window"
            cellSize="xs"
            showColumnHeader={true}
            showLegend={false}
          />
        </div>

        <div className="rounded-sm bg-background p-4">
          <h3 className="mb-2 text-base/7 font-semibold text-foreground">Small (sm - 16px)</h3>
          <p className="mb-4 text-sm/6 text-muted">Compact view for dense data</p>
          <DataAvailabilityHeatmap
            rows={data}
            granularity="window"
            cellSize="sm"
            showColumnHeader={true}
            showLegend={false}
          />
        </div>

        <div className="rounded-sm bg-background p-4">
          <h3 className="mb-2 text-base/7 font-semibold text-foreground">Medium (md - 24px) - Default</h3>
          <p className="mb-4 text-sm/6 text-muted">Good balance between density and readability</p>
          <DataAvailabilityHeatmap
            rows={data}
            granularity="window"
            cellSize="md"
            showColumnHeader={true}
            showLegend={false}
          />
        </div>

        <div className="rounded-sm bg-background p-4">
          <h3 className="mb-2 text-base/7 font-semibold text-foreground">Large (lg - 32px)</h3>
          <p className="mb-4 text-sm/6 text-muted">Easier to see and interact with</p>
          <DataAvailabilityHeatmap
            rows={data}
            granularity="window"
            cellSize="lg"
            showColumnHeader={true}
            showLegend={false}
          />
        </div>

        <div className="rounded-sm bg-background p-4">
          <h3 className="mb-2 text-base/7 font-semibold text-foreground">Extra Large (xl - 40px)</h3>
          <p className="mb-4 text-sm/6 text-muted">Maximum visibility and interaction area</p>
          <DataAvailabilityHeatmap
            rows={data}
            granularity="window"
            cellSize="xl"
            showColumnHeader={true}
            showLegend={false}
          />
        </div>
      </div>
    );
  },
};
