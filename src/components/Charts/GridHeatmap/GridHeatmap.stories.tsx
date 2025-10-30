import type { Meta, StoryObj } from '@storybook/react-vite';
import { GridHeatmap } from './GridHeatmap';
import type { GridRow } from './GridHeatmap.types';
import { useState } from 'react';

/**
 * Simple metric data structure for demos
 */
interface MetricData {
  value: number;
  label: string;
}

/**
 * Sample cell component that shows a color based on value
 */
function SampleCell({
  data,
  isSelected,
  isHighlighted,
  isDimmed,
  size,
  onClick,
}: {
  data: MetricData;
  isSelected: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
  size: string;
  onClick?: () => void;
}): React.JSX.Element {
  const getColor = (value: number): string => {
    if (value >= 90) return 'bg-success';
    if (value >= 70) return 'bg-warning';
    if (value >= 50) return 'bg-danger/70';
    return 'bg-muted';
  };

  const sizeClass = {
    xs: 'size-3',
    sm: 'size-4',
    md: 'size-6',
    lg: 'size-8',
    xl: 'size-10',
  }[size];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${sizeClass} ${getColor(data.value)} transition-all ${isSelected ? 'ring-2 ring-accent' : ''} ${isHighlighted ? 'ring-1 ring-accent/50' : ''} ${isDimmed ? 'opacity-20' : ''} ${onClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
      title={`${data.label}: ${data.value}`}
    />
  );
}

/**
 * Generate sample grid data
 */
function generateSampleData(rows: number, columns: number): GridRow<MetricData>[] {
  return Array.from({ length: rows }, (_, rowIndex) => ({
    identifier: `row-${rowIndex}`,
    label: `Row ${rowIndex + 1}`,
    cells: Array.from({ length: columns }, (_, colIndex) => ({
      columnIndex: colIndex,
      data: {
        value: Math.floor(Math.random() * 100),
        label: `R${rowIndex + 1}C${colIndex + 1}`,
      },
    })),
  }));
}

const meta: Meta<typeof GridHeatmap> = {
  title: 'Components/Charts/GridHeatmap',
  component: GridHeatmap,
  decorators: [
    Story => (
      <div className="min-w-[600px] rounded-sm bg-surface p-6">
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof GridHeatmap>;

export const Default: Story = {
  args: {
    rows: generateSampleData(10, 20),
    renderCell: (data, props) => <SampleCell data={data as MetricData} {...props} />,
  },
};

export const WithHeader: Story = {
  args: {
    rows: generateSampleData(8, 15),
    renderCell: (data, props) => <SampleCell data={data as MetricData} {...props} />,
    renderHeader: () => (
      <div className="rounded-sm border border-border bg-surface p-4">
        <h3 className="mb-2 text-sm font-medium">Grid Legend</h3>
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-sm bg-success" />
            <span>90-100</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-sm bg-warning" />
            <span>70-89</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-sm bg-danger/70" />
            <span>50-69</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-3 rounded-sm bg-muted" />
            <span>0-49</span>
          </div>
        </div>
      </div>
    ),
  },
};

export const Interactive: Story = {
  render: () => {
    const [selectedColumn, setSelectedColumn] = useState<number | undefined>(undefined);
    const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
    const rows = generateSampleData(12, 25);

    return (
      <div className="space-y-4">
        {selectedRowId && (
          <div className="rounded-sm bg-accent/10 p-3 text-sm">
            <strong>Selected row:</strong> {selectedRowId}
          </div>
        )}
        <GridHeatmap
          rows={rows}
          selectedColumn={selectedColumn}
          renderCell={(data, props) => <SampleCell data={data as MetricData} {...props} />}
          onCellClick={(rowId, colIndex, cellData) => {
            setSelectedColumn(colIndex);
            setSelectedRowId(rowId);
            console.log('Cell clicked:', { rowId, colIndex, cellData });
          }}
          onRowClick={rowId => {
            setSelectedRowId(rowId);
            console.log('Row clicked:', rowId);
          }}
          onClearColumnSelection={() => setSelectedColumn(undefined)}
        />
      </div>
    );
  },
};

export const WithBackButton: Story = {
  args: {
    rows: generateSampleData(6, 12),
    renderCell: (data, props) => <SampleCell data={data as MetricData} {...props} />,
    onBack: () => alert('Back button clicked!'),
  },
};

export const LargeCells: Story = {
  args: {
    rows: generateSampleData(5, 10),
    cellSize: 'lg',
    renderCell: (data, props) => <SampleCell data={data as MetricData} {...props} />,
  },
};

export const SmallDenseGrid: Story = {
  args: {
    rows: generateSampleData(20, 40),
    cellSize: 'xs',
    renderCell: (data, props) => <SampleCell data={data as MetricData} {...props} />,
  },
};

export const NoColumnHeader: Story = {
  args: {
    rows: generateSampleData(8, 15),
    showColumnHeader: false,
    renderCell: (data, props) => <SampleCell data={data as MetricData} {...props} />,
  },
};

/**
 * Availability data structure (similar to Data Availability heatmap)
 */
interface AvailabilityData {
  availability: number; // 0-1
  successCount: number;
  totalCount: number;
  hasData: boolean;
}

/**
 * Availability cell component matching DA heatmap aesthetic
 */
function AvailabilityCell({
  data,
  isSelected,
  isHighlighted,
  isDimmed,
  size,
  onClick,
}: {
  data: AvailabilityData;
  isSelected: boolean;
  isHighlighted: boolean;
  isDimmed: boolean;
  size: string;
  onClick?: () => void;
}): React.JSX.Element {
  const [showTooltip, setShowTooltip] = useState(false);

  // Color scheme matching DataAvailabilityCell
  const getColor = (availability: number, hasData: boolean): string => {
    if (!hasData)
      return 'bg-background shadow-[inset_0_0_0_1px_rgba(128,128,128,0.2)] hover:shadow-[inset_0_0_0_1px_rgba(128,128,128,0.3)]';

    if (availability >= 0.95) return 'bg-success/90 hover:bg-success';
    if (availability >= 0.8) return 'bg-success/70 hover:bg-success/80';
    if (availability >= 0.6) return 'bg-warning/70 hover:bg-warning/80';
    if (availability >= 0.4) return 'bg-warning/50 hover:bg-warning/60';
    if (availability >= 0.2) return 'bg-danger/50 hover:bg-danger/60';
    return 'bg-danger/70 hover:bg-danger/80';
  };

  const sizeClass = {
    xs: 'size-3',
    sm: 'size-4',
    md: 'size-6',
    lg: 'size-8',
    xl: 'size-10',
  }[size];

  const availabilityPercent = (data.availability * 100).toFixed(1);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`${sizeClass} ${getColor(data.availability, data.hasData)} transition-all duration-150 ${isSelected ? 'ring-3 ring-accent ring-offset-2 ring-offset-background' : ''} ${isHighlighted && !isSelected ? 'ring-2 ring-accent/80' : ''} ${isDimmed ? 'opacity-10' : ''} ${onClick ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
      />
      {showTooltip && (
        <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 rounded-sm bg-surface px-3 py-2 text-sm/6 whitespace-nowrap text-foreground shadow-sm">
          {data.hasData ? (
            <>
              <div className="font-medium">{availabilityPercent}% available</div>
              <div className="text-xs text-muted">
                {data.successCount}/{data.totalCount} observations
              </div>
            </>
          ) : (
            <div className="text-xs text-muted">No data</div>
          )}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-surface" />
        </div>
      )}
    </div>
  );
}

/**
 * Generate availability data (similar to DA heatmap)
 */
function generateAvailabilityData(rows: number, columns: number): GridRow<AvailabilityData>[] {
  return Array.from({ length: rows }, (_, rowIndex) => ({
    identifier: `row-${rowIndex}`,
    label: `Row ${rowIndex + 1}`,
    cells: Array.from({ length: columns }, (_, colIndex) => {
      // Randomly have some cells with no data
      const hasData = Math.random() > 0.15;
      const totalCount = hasData ? Math.floor(Math.random() * 100) + 20 : 0;
      const successCount = hasData ? Math.floor(totalCount * Math.random()) : 0;
      const availability = hasData ? successCount / totalCount : 0;

      return {
        columnIndex: colIndex,
        data: {
          availability,
          successCount,
          totalCount,
          hasData,
        },
      };
    }),
  }));
}

/**
 * Data Availability style heatmap with full color scheme and tooltips
 */
export const DataAvailabilityStyle: Story = {
  args: {
    rows: generateAvailabilityData(19, 128),
    cellSize: 'xs',
    renderCell: (data, props) => <AvailabilityCell data={data as AvailabilityData} {...props} />,
    renderHeader: () => (
      <div className="rounded-sm border border-border bg-surface p-4">
        <h3 className="mb-2 text-sm font-medium">Availability Legend</h3>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="size-3 bg-success/90" />
            <span>95-100%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-3 bg-success/70" />
            <span>80-94%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-3 bg-warning/70" />
            <span>60-79%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-3 bg-warning/50" />
            <span>40-59%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-3 bg-danger/50" />
            <span>20-39%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-3 bg-danger/70" />
            <span>0-19%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="size-3 bg-background shadow-[inset_0_0_0_1px_rgba(128,128,128,0.2)]" />
            <span>No data</span>
          </div>
        </div>
      </div>
    ),
  },
};
