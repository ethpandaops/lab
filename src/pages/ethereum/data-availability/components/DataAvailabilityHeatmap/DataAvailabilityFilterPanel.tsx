import { useState } from 'react';
import { CheckboxGroup } from '@/components/Forms/CheckboxGroup';
import { Input } from '@/components/Forms/Input';
import { RangeInput } from '@/components/Forms/RangeInput';
import { Disclosure } from '@/components/Layout/Disclosure';
import type { DataAvailabilityFilterPanelProps } from './DataAvailabilityFilterPanel.types';

/**
 * Filter panel for data availability heatmap
 * Allows filtering by column subnet groups, availability threshold, and observation count
 * Shows different controls based on view mode (percentage vs threshold)
 */
export const DataAvailabilityFilterPanel = ({
  filters,
  onFiltersChange,
  defaultOpen = false,
  viewMode = 'percentage',
  threshold,
  onThresholdChange,
}: DataAvailabilityFilterPanelProps): React.JSX.Element => {
  const [minAvailability, setMinAvailability] = useState(filters.minAvailability);
  const [maxAvailability, setMaxAvailability] = useState(filters.maxAvailability);
  const [minObservationCount, setMinObservationCount] = useState(filters.minObservationCount);
  const [localThreshold, setLocalThreshold] = useState(threshold ?? 30);

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
   * Handle min observation count change
   */
  const handleMinObservationCountChange = (count: number): void => {
    setMinObservationCount(count);
    onFiltersChange({ ...filters, minObservationCount: count });
  };

  /**
   * Handle threshold change for threshold mode
   */
  const handleThresholdChange = (value: number): void => {
    setLocalThreshold(value);
    onThresholdChange?.(value);
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

  // Determine grid columns based on view mode
  const gridCols = viewMode === 'threshold' ? 'md:grid-cols-3' : 'md:grid-cols-3';

  return (
    <Disclosure title="Filters" defaultOpen={defaultOpen}>
      <div className={`grid grid-cols-1 gap-6 ${gridCols}`}>
        {/* Column subnet groups */}
        <div>
          <h4 className="mb-3 text-sm/6 font-medium text-foreground">Column Groups</h4>
          <CheckboxGroup legend="" srOnlyLegend options={columnGroupOptions} variant="simple" className="text-sm/6" />
        </div>

        {/* Threshold slider - only shown in threshold mode */}
        {viewMode === 'threshold' && (
          <div>
            <h4 className="mb-3 text-sm/6 font-medium text-foreground">Observation Threshold</h4>
            <div className="space-y-3">
              <RangeInput
                id="threshold"
                label="Min observations"
                value={localThreshold}
                min={1}
                max={200}
                step={5}
                onChange={handleThresholdChange}
              />
              <p className="text-xs/4 text-muted">
                Columns with {'>='} {localThreshold} successful observations are considered available
              </p>
            </div>
          </div>
        )}

        {/* Availability range - only shown in percentage mode */}
        {viewMode === 'percentage' && (
          <div>
            <h4 className="mb-3 text-sm/6 font-medium text-foreground">Availability Range</h4>
            <div className="space-y-3">
              <RangeInput
                id="min-availability"
                label="Min"
                value={minAvailability}
                min={0}
                max={100}
                step={5}
                suffix="%"
                onChange={value => handleAvailabilityChange(value, maxAvailability)}
              />
              <RangeInput
                id="max-availability"
                label="Max"
                value={maxAvailability}
                min={0}
                max={100}
                step={5}
                suffix="%"
                onChange={value => handleAvailabilityChange(minAvailability, value)}
              />
            </div>
          </div>
        )}

        {/* Min observation count */}
        <div>
          <h4 className="mb-3 text-sm/6 font-medium text-foreground">Minimum Observations</h4>
          <Input size="sm" label="Hide cells with fewer than:" labelClassName="text-xs/4 text-muted font-normal">
            <Input.Field
              type="number"
              id="min-observation-count"
              min="0"
              step="1"
              value={minObservationCount}
              onChange={e => handleMinObservationCountChange(Number(e.target.value))}
            />
          </Input>
        </div>
      </div>
    </Disclosure>
  );
};
