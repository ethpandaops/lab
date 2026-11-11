import { type JSX } from 'react';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';

/**
 * Total number of columns in PeerDAS
 */
const TOTAL_COLUMNS = 128;

/**
 * PeerDAS column indices, which identify the heatmap's columns as they do in GridHeatmap
 */
const COLUMNS = Array.from({ length: TOTAL_COLUMNS }, (_, column) => column);

/**
 * CSS grid style matching the actual heatmap (128 columns, min 4px each)
 */
const GRID_STYLE = {
  gridTemplateColumns: `repeat(${TOTAL_COLUMNS}, minmax(4px, 1fr))`,
};

/**
 * One heatmap row: its label and a cell per column
 */
function HeatmapRowSkeleton(): JSX.Element {
  return (
    <div className="flex items-center">
      {/* Row label skeleton - matches w-36 from GridHeatmap 3xs size */}
      <div className="w-36 shrink-0 pr-2">
        <div className="flex items-center justify-end gap-1.5">
          {/* Icon placeholder */}
          <LoadingContainer className="size-3.5 rounded-xs" />
          {/* Label text placeholder */}
          <LoadingContainer className="h-3 w-16 rounded-xs" />
          {/* Chevron placeholder */}
          <LoadingContainer className="size-3 rounded-xs" />
        </div>
      </div>

      {/* Cells - CSS grid with 128 columns */}
      <div className="grid flex-1 gap-px" style={GRID_STYLE}>
        {COLUMNS.map(column => (
          <LoadingContainer key={column} className="aspect-square rounded-xs" />
        ))}
      </div>
    </div>
  );
}

/**
 * Loading skeleton for Custody heatmap
 * Matches the GridHeatmap structure with 128 columns and row labels, over a representative sample of 12 rows
 */
export function DataAvailabilitySkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      {/* Grid with scrollable container */}
      <div className="flex overflow-x-auto">
        {/* Main grid area */}
        <div className="min-w-fit flex-1">
          {/* Rows */}
          <div className="flex flex-col gap-0.5">
            <HeatmapRowSkeleton />
            <HeatmapRowSkeleton />
            <HeatmapRowSkeleton />
            <HeatmapRowSkeleton />
            <HeatmapRowSkeleton />
            <HeatmapRowSkeleton />
            <HeatmapRowSkeleton />
            <HeatmapRowSkeleton />
            <HeatmapRowSkeleton />
            <HeatmapRowSkeleton />
            <HeatmapRowSkeleton />
            <HeatmapRowSkeleton />
          </div>

          {/* Column header at bottom */}
          <div className="mt-1 flex items-center">
            {/* Spacer for row labels */}
            <div className="w-36 shrink-0" />

            {/* Column indices - sparse labels like actual heatmap (0, 16, 32, etc.) */}
            <div className="grid flex-1 gap-px" style={GRID_STYLE}>
              {COLUMNS.map(column => {
                // Show skeleton for persistent labels: 0, 16, 32, 48, 64, 80, 96, 112, 127
                const isPersistent = column === 0 || column === 127 || column % 16 === 0;
                return (
                  <div key={column} className="relative h-3">
                    {isPersistent && (
                      <LoadingContainer className="absolute top-0 left-1/2 h-3 w-4 -translate-x-1/2 rounded-xs" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* X-axis title */}
          <div className="mt-2 flex items-center">
            {/* Spacer for row labels */}
            <div className="w-36 shrink-0" />
            {/* Title centered over columns */}
            <div className="flex flex-1 justify-center">
              <LoadingContainer className="h-3 w-20 rounded-xs" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
