import type { JSX } from 'react';
import {
  FilterBar,
  type FilterChipItem,
  FilterField,
  FilterRange,
  FilterToggle,
  formatRange,
} from '@/components/Forms/FilterBar';
import { PATH_COLORS, PATH_LABELS } from '../../constants';
import { type BlockFilters, FILTER_PATHS } from '../../IndexPage.types';

export interface BlockFilterPanelProps {
  filters: BlockFilters;
  onChange: (filters: BlockFilters) => void;
}

type RangeKey = 'slot' | 'blobs' | 'last';

/** Min and max filter keys, label and unit of each range */
const RANGES: Record<
  RangeKey,
  { min: 'slotFrom' | 'blobsMin' | 'lastMin'; max: 'slotTo' | 'blobsMax' | 'lastMax'; label: string; unit?: string }
> = {
  slot: { min: 'slotFrom', max: 'slotTo', label: 'Slot' },
  blobs: { min: 'blobsMin', max: 'blobsMax', label: 'Blobs' },
  last: { min: 'lastMin', max: 'lastMax', label: 'Last completion', unit: 's' },
};

/**
 * Filters for the blocks table: slot, blob count and last completion ranges, and the paths that completed columns.
 */
export function BlockFilterPanel({ filters, onChange }: BlockFilterPanelProps): JSX.Element {
  const chips: FilterChipItem[] = (Object.keys(RANGES) as RangeKey[]).flatMap(id => {
    const { min, max, label, unit } = RANGES[id];
    const value = formatRange(filters[min], filters[max], unit);
    if (!value) return [];
    return [{ id, label, value, onRemove: () => onChange({ ...filters, [min]: undefined, [max]: undefined }) }];
  });
  if (filters.via?.length) {
    chips.push({
      id: 'via',
      label: 'Completed via',
      value: filters.via.map(path => PATH_LABELS[path]).join(', '),
      onRemove: () => onChange({ ...filters, via: undefined }),
    });
  }

  return (
    <FilterBar filters={filters} onChange={onChange} chips={chips} title="Filter blocks">
      {(draft, setDraft) => (
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
          {(Object.keys(RANGES) as RangeKey[]).map(id => {
            const { min, max, label, unit } = RANGES[id];
            return (
              <FilterRange
                key={id}
                label={label}
                unit={unit}
                step={unit ? 0.1 : 1}
                min={draft[min]}
                max={draft[max]}
                onChange={(low, high) => setDraft({ ...draft, [min]: low, [max]: high })}
              />
            );
          })}
          <FilterField label="Completed via">
            <div className="flex flex-wrap gap-1.5">
              {FILTER_PATHS.map(path => {
                const selected = !!draft.via?.includes(path);
                const via = selected ? draft.via!.filter(p => p !== path) : [...(draft.via ?? []), path];
                return (
                  <FilterToggle
                    key={path}
                    selected={selected}
                    onClick={() => setDraft({ ...draft, via: via.length > 0 ? via : undefined })}
                  >
                    <span className="size-2 rounded-full" style={{ backgroundColor: PATH_COLORS[path] }} />
                    {PATH_LABELS[path]}
                  </FilterToggle>
                );
              })}
            </div>
          </FilterField>
        </div>
      )}
    </FilterBar>
  );
}
