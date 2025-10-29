import { useState } from 'react';
import { CheckboxGroup } from '@/components/Forms/CheckboxGroup';
import type { DataAvailabilityFilterPanelProps } from './DataAvailabilityFilterPanel.types';

/**
 * Filter panel for data availability heatmap
 * Allows filtering by column subnet groups, availability threshold, and probe count
 */
export const DataAvailabilityFilterPanel = ({
  filters,
  onFiltersChange,
  defaultOpen = false,
}: DataAvailabilityFilterPanelProps): React.JSX.Element => {
  const [minAvailability, setMinAvailability] = useState(filters.minAvailability);
  const [maxAvailability, setMaxAvailability] = useState(filters.maxAvailability);
  const [minProbeCount, setMinProbeCount] = useState(filters.minProbeCount);
  const [filterExpanded, setFilterExpanded] = useState(defaultOpen);

  /**
   * Handle column group checkbox toggle
   */
  const handleColumnGroupToggle = (groupIndex: number): void => {
    const newGroups = new Set(filters.columnGroups);
    if (newGroups.has(groupIndex)) {
      newGroups.delete(groupIndex);
    } else {
      newGroups.add(groupIndex);
    }
    onFiltersChange({ ...filters, columnGroups: newGroups });
  };

  /**
   * Handle availability threshold change
   */
  const handleAvailabilityChange = (min: number, max: number): void => {
    setMinAvailability(min);
    setMaxAvailability(max);
    onFiltersChange({ ...filters, minAvailability: min, maxAvailability: max });
  };

  /**
   * Handle min probe count change
   */
  const handleMinProbeCountChange = (count: number): void => {
    setMinProbeCount(count);
    onFiltersChange({ ...filters, minProbeCount: count });
  };

  /**
   * Column subnet group options
   */
  const columnGroupOptions = [
    {
      id: 'group-0',
      name: 'column-groups',
      label: 'Columns 1-32',
      checked: filters.columnGroups.has(0),
      onChange: () => handleColumnGroupToggle(0),
    },
    {
      id: 'group-1',
      name: 'column-groups',
      label: 'Columns 33-64',
      checked: filters.columnGroups.has(1),
      onChange: () => handleColumnGroupToggle(1),
    },
    {
      id: 'group-2',
      name: 'column-groups',
      label: 'Columns 65-96',
      checked: filters.columnGroups.has(2),
      onChange: () => handleColumnGroupToggle(2),
    },
    {
      id: 'group-3',
      name: 'column-groups',
      label: 'Columns 97-128',
      checked: filters.columnGroups.has(3),
      onChange: () => handleColumnGroupToggle(3),
    },
  ];

  return (
    <div>
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setFilterExpanded(!filterExpanded)}
        className="mb-2 flex w-full items-center justify-between rounded-sm border border-border bg-surface px-3 py-2 text-sm transition-colors hover:bg-muted/20"
      >
        <div className="flex items-center gap-2">
          <span>{filterExpanded ? '▼' : '▶'}</span>
          <span className="font-medium">Filters</span>
        </div>
      </button>

      {/* Collapsible content */}
      {filterExpanded && (
        <div className="rounded-sm border border-border bg-surface p-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Column subnet groups */}
            <div>
              <h4 className="mb-3 text-sm font-medium text-foreground">Column Subnets</h4>
              <CheckboxGroup legend="" srOnlyLegend options={columnGroupOptions} variant="simple" className="text-sm" />
            </div>

            {/* Availability threshold */}
            <div>
              <h4 className="mb-3 text-sm font-medium text-foreground">Availability Range</h4>
              <div className="space-y-3">
                <div>
                  <label htmlFor="min-availability" className="block text-xs text-muted">
                    Min: {minAvailability}%
                  </label>
                  <input
                    type="range"
                    id="min-availability"
                    min="0"
                    max="100"
                    step="5"
                    value={minAvailability}
                    onChange={e => handleAvailabilityChange(Number(e.target.value), maxAvailability)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label htmlFor="max-availability" className="block text-xs text-muted">
                    Max: {maxAvailability}%
                  </label>
                  <input
                    type="range"
                    id="max-availability"
                    min="0"
                    max="100"
                    step="5"
                    value={maxAvailability}
                    onChange={e => handleAvailabilityChange(minAvailability, Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Min probe count */}
            <div>
              <h4 className="mb-3 text-sm font-medium text-foreground">Minimum Probes</h4>
              <div>
                <label htmlFor="min-probe-count" className="block text-xs text-muted">
                  Hide cells with fewer than:
                </label>
                <input
                  type="number"
                  id="min-probe-count"
                  min="0"
                  step="1"
                  value={minProbeCount}
                  onChange={e => handleMinProbeCountChange(Number(e.target.value))}
                  className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
