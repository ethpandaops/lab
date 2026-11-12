import type { Meta, StoryObj } from '@storybook/react-vite';
import { DataAvailabilityHeatmap } from './DataAvailabilityHeatmap';
import type { DataAvailabilityFilters } from './DataAvailabilityFilterPanel.types';
import {
  generateWindowLevelData,
  generateDayLevelData,
  generateHourLevelData,
  generateEpochLevelData,
} from './mockData';

// Default filters for all stories
const defaultFilters: DataAvailabilityFilters = {
  columnGroups: new Set([0, 1, 2, 3]), // All groups selected by default
  minAvailability: 0,
  maxAvailability: 100,
  minObservationCount: 0,
};

const meta = {
  title: 'Components/Charts/DataAvailabilityHeatmap',
  component: DataAvailabilityHeatmap,
  decorators: [
    Story => (
      <div className="min-w-150 rounded-sm bg-surface p-6">
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
    filters: defaultFilters,
    cellSize: 'xs',
    showColumnHeader: true,
    showLegend: true,
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
    filters: defaultFilters,
    cellSize: 'xs',
    showColumnHeader: true,
    showLegend: true,
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
    filters: defaultFilters,
    cellSize: 'xs',
    showColumnHeader: true,
    showLegend: true,
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
    filters: defaultFilters,
    cellSize: 'xs',
    showColumnHeader: true,
    showLegend: true,
  },
};

/**
 * Interactive demo showing the full drill-down hierarchy.
 * Hover over column headers or row labels to highlight them.
 */
export const InteractiveHierarchyDemo: Story = {
  args: {
    rows: [],
    granularity: 'window',
    filters: defaultFilters,
  },
  render: () => {
    const windowData = generateWindowLevelData(19);

    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-sm bg-background p-4">
          <h3 className="mb-2 text-lg/7 font-semibold text-foreground">Level 1: Window View (19 days)</h3>
          <p className="mb-4 text-sm/6 text-muted">
            Hover column headers or row labels to highlight them
            <br />
            Click a day label to view all columns for that day
          </p>
          <DataAvailabilityHeatmap
            filters={defaultFilters}
            rows={windowData}
            granularity="window"
            cellSize="xs"
            onCellClick={(identifier, columnIndex) => {
              console.log(`Navigate to: /ethereum/data-availability/date/${identifier}?column_index=${columnIndex}`);
            }}
            onRowClick={identifier => {
              console.log(`Navigate to: /ethereum/data-availability/date/${identifier}`);
              alert(`Would navigate to day view for ${identifier} (all columns)`);
            }}
          />
        </div>
      </div>
    );
  },
};

/**
 * Interactive demo showing day-level (hours) drill-down.
 */
export const InteractiveDayDrillDown: Story = {
  args: {
    rows: [],
    granularity: 'day',
    filters: defaultFilters,
  },
  render: () => {
    const dayData = generateDayLevelData('2024-01-15');

    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-sm bg-background p-4">
          <h3 className="mb-2 text-lg/7 font-semibold text-foreground">Level 2: Day View - Hours</h3>
          <p className="mb-4 text-sm/6 text-muted">
            Click a cell → drill down to hour view (epochs)
            <br />
            Click an hour label → view all columns for that hour
          </p>
          <DataAvailabilityHeatmap
            filters={defaultFilters}
            rows={dayData}
            granularity="day"
            cellSize="xs"
            onCellClick={(identifier, columnIndex) => {
              const hourMatch = identifier.match(/hour-(\d+)/);
              const hourNum = hourMatch ? hourMatch[1] : 'unknown';
              console.log(
                `Navigate to: /ethereum/data-availability/date/2024-01-15/${hourNum}?column_index=${columnIndex}`
              );
              alert(`Would navigate to hour view (epochs) for hour ${hourNum}, column ${columnIndex}`);
            }}
            onRowClick={identifier => {
              const hourMatch = identifier.match(/hour-(\d+)/);
              const hourNum = hourMatch ? hourMatch[1] : 'unknown';
              console.log(`Navigate to: /ethereum/data-availability/date/2024-01-15/${hourNum}`);
              alert(`Would navigate to hour view (epochs) for hour ${hourNum} (all columns)`);
            }}
          />
        </div>
      </div>
    );
  },
};

/**
 * Interactive demo showing hour-level (epochs) drill-down.
 */
export const InteractiveHourDrillDown: Story = {
  args: {
    rows: [],
    granularity: 'hour',
    filters: defaultFilters,
  },
  render: () => {
    const hourData = generateHourLevelData('2024-01-15-hour-8', '2024-01-15', 8);

    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-sm bg-background p-4">
          <h3 className="mb-2 text-lg/7 font-semibold text-foreground">Level 3: Hour View - Epochs</h3>
          <p className="mb-4 text-sm/6 text-muted">
            Click a cell → drill down to epoch view (slots)
            <br />
            Click an epoch label → view all columns for that epoch
          </p>
          <DataAvailabilityHeatmap
            filters={defaultFilters}
            rows={hourData}
            granularity="hour"
            cellSize="xs"
            onCellClick={(identifier, columnIndex) => {
              const epochMatch = identifier.match(/epoch-(\d+)/);
              const epochNum = epochMatch ? epochMatch[1] : 'unknown';
              console.log(`Navigate to: /ethereum/data-availability/epoch/${epochNum}?column_index=${columnIndex}`);
              alert(`Would navigate to epoch view (slots) for epoch ${epochNum}, column ${columnIndex}`);
            }}
            onRowClick={identifier => {
              const epochMatch = identifier.match(/epoch-(\d+)/);
              const epochNum = epochMatch ? epochMatch[1] : 'unknown';
              console.log(`Navigate to: /ethereum/data-availability/epoch/${epochNum}`);
              alert(`Would navigate to epoch view (slots) for epoch ${epochNum} (all columns)`);
            }}
          />
        </div>
      </div>
    );
  },
};

/**
 * Interactive demo showing epoch-level (slots) drill-down.
 */
export const InteractiveEpochDrillDown: Story = {
  args: {
    rows: [],
    granularity: 'epoch',
    filters: defaultFilters,
  },
  render: () => {
    const epochData = generateEpochLevelData('epoch-100000', 100000);

    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-sm bg-background p-4">
          <h3 className="mb-2 text-lg/7 font-semibold text-foreground">Level 3: Epoch View - Slots</h3>
          <p className="mb-4 text-sm/6 text-muted">
            Click a cell → show slot detail view for that slot
            <br />
            Click a slot label → show all columns for that slot
          </p>
          <DataAvailabilityHeatmap
            filters={defaultFilters}
            rows={epochData}
            granularity="epoch"
            cellSize="xs"
            onCellClick={(identifier, columnIndex) => {
              const slotMatch = identifier.match(/slot-(\d+)/);
              const slotNum = slotMatch ? slotMatch[1] : 'unknown';
              console.log(`Navigate to: /ethereum/data-availability/slot/${slotNum}?column_index=${columnIndex}`);
              alert(`Would show slot detail view for slot ${slotNum}, column ${columnIndex}`);
            }}
            onRowClick={identifier => {
              const slotMatch = identifier.match(/slot-(\d+)/);
              const slotNum = slotMatch ? slotMatch[1] : 'unknown';
              console.log(`Navigate to: /ethereum/data-availability/slot/${slotNum}`);
              alert(`Would show slot detail view for slot ${slotNum} (all columns)`);
            }}
          />
        </div>
      </div>
    );
  },
};
