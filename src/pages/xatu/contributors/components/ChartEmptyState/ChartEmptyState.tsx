import { type JSX } from 'react';

export interface ChartEmptyStateProps {
  /** What is missing, e.g. "block" renders "No block data available for this time range" */
  subject: string;
}

/**
 * Placeholder shown inside a chart card when the selected time range has no data.
 */
export function ChartEmptyState({ subject }: ChartEmptyStateProps): JSX.Element {
  return (
    <div className="flex h-[400px] items-center justify-center text-muted">
      No {subject} data available for this time range
    </div>
  );
}
