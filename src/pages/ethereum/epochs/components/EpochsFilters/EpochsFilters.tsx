import { type FormEvent, type JSX, useState } from 'react';
import { Button } from '@/components/Elements/Button';
import { Input } from '@/components/Forms/Input';
import { FilterBar, type FilterChipItem, FilterRange, FilterToggle, formatRange } from '@/components/Forms/FilterBar';
import { DateTimeRange } from '@/components/Forms/DateTimeRange';
import type { EpochFilters } from '../../IndexPage.types';

export interface EpochsFiltersProps {
  filters: EpochFilters;
  /** Replace the filters; keys left out are removed */
  onChange: (filters: EpochFilters) => void;
  onGoToEpoch: (epoch: number) => void;
}

function formatTime(seconds: number): string {
  return new Date(seconds * 1000).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function timeRange(from: number | undefined, to: number | undefined): string | undefined {
  if (from !== undefined && to !== undefined) return `${formatTime(from)} – ${formatTime(to)}`;
  if (from !== undefined) return `≥ ${formatTime(from)}`;
  if (to !== undefined) return `≤ ${formatTime(to)}`;
  return undefined;
}

function toChips(filters: EpochFilters, onChange: (filters: EpochFilters) => void): FilterChipItem[] {
  const ranges: Array<[string, string, string | undefined, keyof EpochFilters, keyof EpochFilters]> = [
    ['epoch', 'Epochs', formatRange(filters.epochMin, filters.epochMax), 'epochMin', 'epochMax'],
    ['time', 'Time', timeRange(filters.timeStart, filters.timeEnd), 'timeStart', 'timeEnd'],
    [
      'participation',
      'Participation',
      formatRange(filters.participationMin, filters.participationMax, '%'),
      'participationMin',
      'participationMax',
    ],
    ['missed', 'Missed slots', formatRange(filters.missedMin, filters.missedMax), 'missedMin', 'missedMax'],
  ];
  return ranges.flatMap(([id, label, value, min, max]) =>
    value === undefined
      ? []
      : [{ id, label, value, onRemove: () => onChange({ ...filters, [min]: undefined, [max]: undefined }) }]
  );
}

interface Preset {
  label: string;
  dot: string;
  patch: Partial<EpochFilters>;
}

const PRESETS: Preset[] = [{ label: 'Missed slots', dot: 'bg-danger', patch: { missedMin: 1 } }];

function isActive(preset: Preset, filters: EpochFilters): boolean {
  return Object.entries(preset.patch).every(([key, value]) => filters[key as keyof EpochFilters] === value);
}

/**
 * Quick filters, the go-to-epoch box, and the filter bar with a chip per applied filter and a dialog for every
 * filter.
 */
export function EpochsFilters({ filters, onChange, onGoToEpoch }: EpochsFiltersProps): JSX.Element {
  const [jump, setJump] = useState('');

  const submitJump = (event: FormEvent): void => {
    event.preventDefault();
    const epoch = Number.parseInt(jump, 10);
    if (Number.isNaN(epoch)) return;
    onGoToEpoch(epoch);
    setJump('');
  };
  const togglePreset = (preset: Preset): void => {
    const active = isActive(preset, filters);
    const keys = Object.keys(preset.patch) as Array<keyof EpochFilters>;
    onChange({ ...filters, ...Object.fromEntries(keys.map(key => [key, active ? undefined : preset.patch[key]])) });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map(preset => (
            <FilterToggle key={preset.label} selected={isActive(preset, filters)} onClick={() => togglePreset(preset)}>
              <span className={`size-2 rounded-full ${preset.dot}`} />
              {preset.label}
            </FilterToggle>
          ))}
        </div>

        <form onSubmit={submitJump} className="flex items-center gap-1 sm:ml-auto">
          <Input size="sm" wrapperClassName="w-36">
            <Input.Field
              inputMode="numeric"
              aria-label="Go to epoch"
              placeholder="Go to epoch"
              value={jump}
              onChange={event => setJump(event.target.value.replace(/[^\d]/g, ''))}
            />
          </Input>
          <Button type="submit" variant="secondary" size="sm" disabled={jump === ''}>
            Go
          </Button>
        </form>
      </div>

      <FilterBar filters={filters} onChange={onChange} chips={toChips(filters, onChange)} title="Filter epochs">
        {(draft, setDraft) => (
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            <FilterRange
              label="Epoch"
              step={1}
              min={draft.epochMin}
              max={draft.epochMax}
              onChange={(epochMin, epochMax) => setDraft({ ...draft, epochMin, epochMax })}
            />
            <FilterRange
              label="Participation"
              unit="%"
              step={0.1}
              min={draft.participationMin}
              max={draft.participationMax}
              onChange={(participationMin, participationMax) =>
                setDraft({ ...draft, participationMin, participationMax })
              }
            />
            <FilterRange
              label="Missed slots"
              step={1}
              min={draft.missedMin}
              max={draft.missedMax}
              onChange={(missedMin, missedMax) => setDraft({ ...draft, missedMin, missedMax })}
            />
            <div className="sm:col-span-2">
              <DateTimeRange
                label="Time"
                from={draft.timeStart}
                to={draft.timeEnd}
                onChange={(timeStart, timeEnd) => setDraft({ ...draft, timeStart, timeEnd })}
              />
            </div>
          </div>
        )}
      </FilterBar>
    </div>
  );
}
