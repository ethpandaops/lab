import type { JSX } from 'react';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { FilterBar, type FilterChipItem, FilterField, FilterRange, formatRange } from '@/components/Forms/FilterBar';
import { Input } from '@/components/Forms/Input';
import { SelectMenu, type SelectMenuOption } from '@/components/Forms/SelectMenu';
import { formatClientName } from '@/utils/graffiti';
import type { BlockFilters } from '@/pages/ethereum/execution/locally-built-blocks/IndexPage.types';
import type { NodeRoster } from '@/pages/ethereum/execution/locally-built-blocks/hooks';

export interface BlocksFilterPanelProps {
  filters: BlockFilters;
  onChange: (filters: BlockFilters) => void;
  roster: NodeRoster;
}

type RangeKey = 'slot' | 'gas' | 'txs' | 'size';
type RangeBound = Exclude<keyof BlockFilters, 'node' | 'cl' | 'clVersion' | 'el'>;

/** Min and max filter keys, label, unit and input step of each range */
const RANGES: Record<RangeKey, { min: RangeBound; max: RangeBound; label: string; unit?: string; step: number }> = {
  slot: { min: 'slotFrom', max: 'slotTo', label: 'Slot', step: 1 },
  gas: { min: 'gasMin', max: 'gasMax', label: 'Gas used', unit: 'M', step: 0.1 },
  txs: { min: 'txsMin', max: 'txsMax', label: 'Transactions', step: 1 },
  size: { min: 'sizeMin', max: 'sizeMax', label: 'Size', unit: 'KB', step: 1 },
};

/** Select options for clients, with their logos, and any value the roster lacks */
function clientOptions(clients: string[], value: string | undefined): SelectMenuOption<string>[] {
  const all = value && !clients.includes(value) ? [...clients, value] : clients;
  return [
    { value: '', label: 'Any' },
    ...all.map(client => ({
      value: client,
      label: formatClientName(client),
      icon: <ClientLogo client={client} size={16} noLink />,
    })),
  ];
}

/** Client name with its logo, for a chip */
function ClientChipValue({ client }: { client: string }): JSX.Element {
  return (
    <>
      <ClientLogo client={client} size={12} noLink decorative />
      {formatClientName(client)}
    </>
  );
}

/**
 * Filters for locally built blocks: slot, gas, transaction and size ranges, the building node and its clients.
 */
export function BlocksFilterPanel({ filters, onChange, roster }: BlocksFilterPanelProps): JSX.Element {
  const remove =
    (...keys: Array<keyof BlockFilters>) =>
    (): void =>
      onChange({ ...filters, ...Object.fromEntries(keys.map(key => [key, undefined])) });

  const chips: FilterChipItem[] = [];
  if (filters.node) chips.push({ id: 'node', label: 'Xatu node', value: filters.node, onRemove: remove('node') });
  if (filters.cl)
    chips.push({ id: 'cl', label: 'CL', value: <ClientChipValue client={filters.cl} />, onRemove: remove('cl') });
  if (filters.clVersion)
    chips.push({ id: 'clVersion', label: 'CL version', value: filters.clVersion, onRemove: remove('clVersion') });
  if (filters.el)
    chips.push({ id: 'el', label: 'EL', value: <ClientChipValue client={filters.el} />, onRemove: remove('el') });
  for (const id of Object.keys(RANGES) as RangeKey[]) {
    const { min, max, label, unit } = RANGES[id];
    const value = formatRange(filters[min], filters[max], unit ? ` ${unit}` : '');
    if (value) chips.push({ id, label, value, onRemove: remove(min, max) });
  }

  const nodeOptions: SelectMenuOption<string>[] = [
    { value: '', label: 'Any' },
    ...(filters.node && !roster.nodes.includes(filters.node) ? [...roster.nodes, filters.node] : roster.nodes).map(
      node => ({ value: node, label: node })
    ),
  ];

  return (
    <FilterBar filters={filters} onChange={onChange} chips={chips} title="Filter blocks">
      {(draft, setDraft) => (
        <div className="flex flex-col gap-5">
          <FilterField label="Xatu node">
            <SelectMenu
              value={draft.node ?? ''}
              onChange={node => setDraft({ ...draft, node: node || undefined })}
              options={nodeOptions}
            />
          </FilterField>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-3">
            <FilterField label="CL client">
              <SelectMenu
                value={draft.cl ?? ''}
                onChange={cl => setDraft({ ...draft, cl: cl || undefined })}
                options={clientOptions(roster.consensusClients, draft.cl)}
              />
            </FilterField>
            <FilterField label="CL version">
              <Input size="sm">
                <Input.Field
                  aria-label="CL version"
                  placeholder="v8.3"
                  value={draft.clVersion ?? ''}
                  onChange={event => setDraft({ ...draft, clVersion: event.target.value || undefined })}
                />
              </Input>
            </FilterField>
            <FilterField label="EL client">
              <SelectMenu
                value={draft.el ?? ''}
                onChange={el => setDraft({ ...draft, el: el || undefined })}
                options={clientOptions(roster.executionClients, draft.el)}
              />
            </FilterField>
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
            {(Object.keys(RANGES) as RangeKey[]).map(id => {
              const { min, max, label, unit, step } = RANGES[id];
              return (
                <FilterRange
                  key={id}
                  label={label}
                  unit={unit}
                  step={step}
                  min={draft[min]}
                  max={draft[max]}
                  onChange={(low, high) => setDraft({ ...draft, [min]: low, [max]: high })}
                />
              );
            })}
          </div>
        </div>
      )}
    </FilterBar>
  );
}
