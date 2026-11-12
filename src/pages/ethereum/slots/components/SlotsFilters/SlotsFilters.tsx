import { type FormEvent, type JSX, useState } from 'react';
import { Button } from '@/components/Elements/Button';
import { Input } from '@/components/Forms/Input';
import { SelectMenu, type SelectMenuOption } from '@/components/Forms/SelectMenu';
import {
  FilterBar,
  type FilterChipItem,
  FilterField,
  FilterRange,
  FilterToggle,
  formatRange,
} from '@/components/Forms/FilterBar';
import { DateTimeRange } from '@/components/Forms/DateTimeRange';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { EntityFilter } from '@/pages/ethereum/clients/components/EntityFilter';
import { useEntityOptions } from '@/pages/ethereum/clients/hooks/useEntityOptions';
import { entityLabel } from '@/pages/ethereum/clients/utils/client-share';
import { CONSENSUS_CLIENTS, EXECUTION_CLIENTS, truncateAddress } from '@/utils/ethereum';
import { UNKNOWN_CLIENT, formatClientName } from '@/utils/graffiti';
import { KNOWN_RELAYS, type SlotFilters } from '@/pages/ethereum/slots/IndexPage.types';

export interface SlotsFiltersProps {
  filters: SlotFilters;
  /** Replace the filters; keys left out are removed */
  onChange: (filters: SlotFilters) => void;
  onGoToSlot: (slot: number) => void;
}

const STATUS_LABELS = { proposed: 'Proposed', missed: 'Missed', orphaned: 'Orphaned' } as const;
const SOURCE_LABELS = { mev: 'MEV', local: 'Local' } as const;

const STATUS_OPTIONS: SelectMenuOption<string>[] = [
  { value: '', label: 'Any status' },
  ...Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label })),
];
const SOURCE_OPTIONS: SelectMenuOption<string>[] = [
  { value: '', label: 'MEV or local' },
  ...Object.entries(SOURCE_LABELS).map(([value, label]) => ({ value, label })),
];

function clientOptions(clients: readonly string[]): SelectMenuOption<string>[] {
  return [
    { value: '', label: 'Any client' },
    ...[...clients, UNKNOWN_CLIENT].map(client => ({
      value: client,
      label: formatClientName(client),
      icon: <ClientLogo client={client} size={16} noLink decorative />,
    })),
  ];
}
const CL_OPTIONS = clientOptions(CONSENSUS_CLIENTS);
const EL_OPTIONS = clientOptions(EXECUTION_CLIENTS);

function formatTime(seconds: number): string {
  return new Date(seconds * 1000).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function timeRange(from: number | undefined, to: number | undefined): string | undefined {
  if (from !== undefined && to !== undefined) return `${formatTime(from)} – ${formatTime(to)}`;
  if (from !== undefined) return `≥ ${formatTime(from)}`;
  if (to !== undefined) return `≤ ${formatTime(to)}`;
  return undefined;
}

function ClientChip({ client }: { client: string }): JSX.Element {
  return (
    <>
      <ClientLogo client={client} size={12} noLink decorative />
      {formatClientName(client)}
    </>
  );
}

/** Removable chips for the applied filters, one per filter or range */
function toChips(filters: SlotFilters, onChange: (filters: SlotFilters) => void): FilterChipItem[] {
  const chips: FilterChipItem[] = [];
  const add = (
    id: string,
    label: string,
    value: JSX.Element | string | undefined,
    keys: (keyof SlotFilters)[]
  ): void => {
    if (value === undefined) return;
    const onRemove = (): void => onChange({ ...filters, ...Object.fromEntries(keys.map(key => [key, undefined])) });
    chips.push({ id, label, value, onRemove });
  };

  add('slot', 'Slots', formatRange(filters.slotMin, filters.slotMax), ['slotMin', 'slotMax']);
  add('time', 'Time', timeRange(filters.timeStart, filters.timeEnd), ['timeStart', 'timeEnd']);
  add('status', 'Status', filters.status && STATUS_LABELS[filters.status], ['status']);
  add('source', 'Source', filters.source && SOURCE_LABELS[filters.source], ['source']);
  add('relay', 'Relay', filters.relay, ['relay']);
  add('builder', 'Builder', filters.builder && truncateAddress(filters.builder), ['builder']);
  add('entity', 'Entity', filters.entity && entityLabel(filters.entity), ['entity']);
  add('proposer', 'Proposer', filters.proposer === undefined ? undefined : String(filters.proposer), ['proposer']);
  add('blobs', 'Blobs', formatRange(filters.blobsMin, filters.blobsMax), ['blobsMin', 'blobsMax']);
  add('gas', 'Gas used', formatRange(filters.gasMin, filters.gasMax, 'M'), ['gasMin', 'gasMax']);
  add('cl', 'CL', filters.cl && <ClientChip client={filters.cl} />, ['cl']);
  add('el', 'EL', filters.el && <ClientChip client={filters.el} />, ['el']);
  return chips;
}

interface Preset {
  label: string;
  dot: string;
  key: 'status' | 'source';
  value: SlotFilters['status'] | SlotFilters['source'];
}

const PRESETS: Preset[] = [
  { label: 'Missed', dot: 'bg-danger', key: 'status', value: 'missed' },
  { label: 'Orphaned', dot: 'bg-warning', key: 'status', value: 'orphaned' },
  { label: 'MEV', dot: 'bg-primary', key: 'source', value: 'mev' },
  { label: 'Local', dot: 'bg-success', key: 'source', value: 'local' },
];

/**
 * Quick filters, the go-to-slot box, and the filter bar with a chip per applied filter and a dialog for every
 * filter.
 */
export function SlotsFilters({ filters, onChange, onGoToSlot }: SlotsFiltersProps): JSX.Element {
  const [jump, setJump] = useState('');
  const entityOptions = useEntityOptions();

  const submitJump = (event: FormEvent): void => {
    event.preventDefault();
    const slot = Number.parseInt(jump, 10);
    if (Number.isNaN(slot)) return;
    onGoToSlot(slot);
    setJump('');
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESETS.map(preset => {
            const active = filters[preset.key] === preset.value;
            return (
              <FilterToggle
                key={preset.label}
                selected={active}
                onClick={() => onChange({ ...filters, [preset.key]: active ? undefined : preset.value })}
              >
                <span className={`size-2 rounded-full ${preset.dot}`} />
                {preset.label}
              </FilterToggle>
            );
          })}
        </div>

        <form onSubmit={submitJump} className="flex items-center gap-1 sm:ml-auto">
          <Input size="sm" wrapperClassName="w-36">
            <Input.Field
              inputMode="numeric"
              aria-label="Go to slot"
              placeholder="Go to slot"
              value={jump}
              onChange={event => setJump(event.target.value.replace(/[^\d]/g, ''))}
            />
          </Input>
          <Button type="submit" variant="secondary" size="sm" disabled={jump === ''}>
            Go
          </Button>
        </form>
      </div>

      <FilterBar filters={filters} onChange={onChange} chips={toChips(filters, onChange)} title="Filter slots">
        {(draft, setDraft) => {
          const update = (patch: Partial<SlotFilters>): void => setDraft({ ...draft, ...patch });
          const relays = [...new Set([...KNOWN_RELAYS, ...(draft.relay ? [draft.relay] : [])])];
          return (
            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
              <FilterField label="Status">
                <SelectMenu
                  value={draft.status ?? ''}
                  onChange={value => update({ status: (value || undefined) as SlotFilters['status'] })}
                  options={STATUS_OPTIONS}
                />
              </FilterField>
              <FilterField label="Source">
                <SelectMenu
                  value={draft.source ?? ''}
                  onChange={value => update({ source: (value || undefined) as SlotFilters['source'] })}
                  options={SOURCE_OPTIONS}
                />
              </FilterField>
              <FilterField label="Entity">
                <EntityFilter
                  value={draft.entity}
                  onChange={entity => update({ entity })}
                  options={entityOptions.options}
                  className="w-full"
                />
              </FilterField>
              <FilterField label="Relay">
                <SelectMenu
                  value={draft.relay ?? ''}
                  onChange={value => update({ relay: value || undefined })}
                  options={[
                    { value: '', label: 'Any relay' },
                    ...relays.map(relay => ({ value: relay, label: relay })),
                  ]}
                />
              </FilterField>
              <FilterField label="Consensus client">
                <SelectMenu
                  value={draft.cl ?? ''}
                  onChange={value => update({ cl: value || undefined })}
                  options={CL_OPTIONS}
                />
              </FilterField>
              <FilterField label="Execution client">
                <SelectMenu
                  value={draft.el ?? ''}
                  onChange={value => update({ el: value || undefined })}
                  options={EL_OPTIONS}
                />
              </FilterField>
              <FilterField label="Proposer index">
                <Input size="sm">
                  <Input.Field
                    inputMode="numeric"
                    aria-label="Proposer index"
                    value={draft.proposer ?? ''}
                    onChange={event => {
                      const digits = event.target.value.replace(/[^\d]/g, '');
                      update({ proposer: digits === '' ? undefined : Number(digits) });
                    }}
                  />
                </Input>
              </FilterField>
              <FilterRange
                label="Slot"
                step={1}
                min={draft.slotMin}
                max={draft.slotMax}
                onChange={(slotMin, slotMax) => update({ slotMin, slotMax })}
              />
              <FilterRange
                label="Blobs"
                step={1}
                min={draft.blobsMin}
                max={draft.blobsMax}
                onChange={(blobsMin, blobsMax) => update({ blobsMin, blobsMax })}
              />
              <FilterRange
                label="Gas used"
                unit="M"
                step={0.1}
                min={draft.gasMin}
                max={draft.gasMax}
                onChange={(gasMin, gasMax) => update({ gasMin, gasMax })}
              />
              <div className="sm:col-span-2">
                <FilterField label="Builder pubkey">
                  <Input size="sm">
                    <Input.Field
                      aria-label="Builder pubkey"
                      placeholder="0x…"
                      value={draft.builder ?? ''}
                      onChange={event => update({ builder: event.target.value.trim() || undefined })}
                    />
                  </Input>
                </FilterField>
              </div>
              <div className="sm:col-span-2">
                <DateTimeRange
                  label="Time"
                  from={draft.timeStart}
                  to={draft.timeEnd}
                  onChange={(timeStart, timeEnd) => update({ timeStart, timeEnd })}
                />
              </div>
            </div>
          );
        }}
      </FilterBar>
    </div>
  );
}
