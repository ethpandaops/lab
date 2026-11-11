import { type JSX, type ReactNode, useState } from 'react';
import { AdjustmentsHorizontalIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Badge } from '@/components/Elements/Badge';
import { Button } from '@/components/Elements/Button';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { Input } from '@/components/Forms/Input';
import { SelectMenu, type SelectMenuOption } from '@/components/Forms/SelectMenu';
import { TagInput } from '@/components/Forms/TagInput';
import { Dialog } from '@/components/Overlays/Dialog';
import { useTimezone } from '@/hooks/useTimezone';
import { CONSENSUS_CLIENTS, EXECUTION_CLIENTS } from '@/utils/ethereum';
import { GRAFFITI_FORMAT_LABELS, UNKNOWN_CLIENT, formatClientName } from '@/utils/graffiti';
import { useEntityOptions } from '../../hooks/useEntityOptions';
import { entityLabel } from '../../utils/client-share';
import {
  BLOCK_FILTER_KEYS,
  clearFilters,
  fromDateTimeInput,
  parseProposers,
  toDateTimeInput,
  type BlockFilterKey,
  type BlockFilters,
  type BlockSearch,
} from '../../utils/block-filters';
import { EntityFilter } from '../EntityFilter';

export interface BlockFilterPanelProps {
  filters: BlockFilters;
  /** Filters the panel offers; the rest are fixed by the page */
  fields: readonly BlockFilterKey[];
  onChange: (update: Partial<BlockSearch>) => void;
}

const CHIP_LABELS: Record<BlockFilterKey, string> = {
  since: 'From',
  until: 'To',
  slotMin: 'From slot',
  slotMax: 'To slot',
  entity: 'Entity',
  proposer: 'Proposer',
  cl: 'Consensus',
  clVersion: 'Consensus version',
  clCommit: 'Consensus commit',
  el: 'Execution',
  elCommit: 'Execution commit',
  format: 'Format',
  graffiti: 'Graffiti',
};

/** Ranges the time section fills in, newest first */
const TIME_PRESETS = [
  { label: 'Last hour', seconds: 3600 },
  { label: 'Last day', seconds: 86_400 },
  { label: 'Last week', seconds: 7 * 86_400 },
  { label: 'Last 30 days', seconds: 30 * 86_400 },
];

const FORMAT_OPTIONS: SelectMenuOption<string>[] = [
  { value: '', label: 'Any format' },
  ...Object.entries(GRAFFITI_FORMAT_LABELS).map(([value, label]) => ({ value, label })),
];

function clientOptions(clients: readonly string[], allLabel: string): SelectMenuOption<string>[] {
  return [
    { value: '', label: allLabel },
    ...[...clients, UNKNOWN_CLIENT].map(client => ({
      value: client,
      label: formatClientName(client),
      icon: <ClientLogo client={client} size={20} noLink />,
    })),
  ];
}

const CONSENSUS_OPTIONS = clientOptions(CONSENSUS_CLIENTS, 'Any consensus client');
const EXECUTION_OPTIONS = clientOptions(EXECUTION_CLIENTS, 'Any execution client');

function formatTime(timestamp: number, utc: boolean): string {
  return new Date(timestamp * 1000).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
    ...(utc && { timeZone: 'UTC' }),
  });
}

function ClientChipValue({ client }: { client: string }): JSX.Element {
  return (
    <span className="inline-flex items-center gap-1">
      <ClientLogo client={client} size={14} noLink decorative />
      {formatClientName(client)}
    </span>
  );
}

function FilterChip({
  label,
  value,
  onRemove,
}: {
  label: string;
  value: ReactNode;
  onRemove: () => void;
}): JSX.Element {
  return (
    <span className="inline-flex items-center gap-1 rounded-xs border border-primary-30 bg-primary-10 px-2 py-0.5 text-xs text-primary">
      <span className="font-medium">{label}:</span>
      <span className="max-w-48 truncate">{value}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="ml-0.5 rounded-xs p-0.5 transition-colors hover:bg-primary-20"
      >
        <XMarkIcon className="size-3" />
      </button>
    </span>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }): JSX.Element {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-2xs font-medium text-muted">{label}</span>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }): JSX.Element {
  return (
    <div className="flex flex-col gap-3 rounded-sm border border-border bg-background p-3">
      <h4 className="text-xs font-semibold text-foreground">{title}</h4>
      {children}
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string | number | undefined;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'datetime-local';
  placeholder?: string;
}): JSX.Element {
  return (
    <Field label={label}>
      <Input size="sm">
        <Input.Field
          type={type}
          value={value ?? ''}
          min={type === 'number' ? 0 : undefined}
          onChange={event => onChange(event.target.value)}
          placeholder={placeholder}
          aria-label={label}
        />
      </Input>
    </Field>
  );
}

/** Searchable entity picker; loads the entity list only once the dialog is open */
function EntityField({ value, onChange }: { value?: string; onChange: (entity?: string) => void }): JSX.Element {
  const { options } = useEntityOptions();
  return (
    <Field label="Entity">
      <EntityFilter value={value} onChange={onChange} options={options} className="w-full" />
    </Field>
  );
}

/**
 * Filters button with a chip per active filter, and the dialog that edits them. Applies on submit so each change
 * is one navigation and one query.
 */
export function BlockFilterPanel({ filters, fields, onChange }: BlockFilterPanelProps): JSX.Element {
  const { timezone } = useTimezone();
  const utc = timezone === 'UTC';
  const [isOpen, setIsOpen] = useState(false);
  const [draft, setDraft] = useState<BlockFilters>(filters);
  const offers = (key: BlockFilterKey): boolean => fields.includes(key);

  const chips: Array<{ id: string; label: string; value: ReactNode; remove: Partial<BlockSearch> }> = [];
  for (const key of BLOCK_FILTER_KEYS) {
    const value = filters[key];
    if (!offers(key) || value === undefined) continue;
    const label = CHIP_LABELS[key];
    if (key === 'proposer') {
      const indices = parseProposers(filters.proposer);
      for (const index of indices) {
        const rest = indices.filter(other => other !== index);
        chips.push({
          id: `proposer-${index}`,
          label,
          value: index,
          remove: { proposer: rest.length > 0 ? rest.join(',') : undefined, page: undefined },
        });
      }
      continue;
    }
    let display: ReactNode = value;
    if (key === 'since' || key === 'until') display = formatTime(value as number, utc);
    if (key === 'cl' || key === 'el') display = <ClientChipValue client={value as string} />;
    if (key === 'entity') display = entityLabel(value as string);
    if (key === 'format') display = GRAFFITI_FORMAT_LABELS[value as string] ?? value;
    chips.push({ id: key, label, value: display, remove: { [key]: undefined, page: undefined } });
  }

  const update = <K extends BlockFilterKey>(key: K, value: BlockFilters[K] | ''): void =>
    setDraft(prev => ({ ...prev, [key]: value === '' ? undefined : value }));
  const updateNumber = (key: 'slotMin' | 'slotMax', value: string): void =>
    update(key, value === '' ? undefined : Math.max(0, Math.floor(Number(value))));

  const open = (): void => {
    setDraft(filters);
    setIsOpen(true);
  };
  const apply = (): void => {
    const next: Partial<BlockSearch> = { page: undefined };
    for (const key of fields) next[key] = draft[key] as never;
    onChange(next);
    setIsOpen(false);
  };

  const hasClientFields = ['cl', 'clVersion', 'clCommit', 'el', 'elCommit'].some(key => offers(key as BlockFilterKey));
  const hasGraffitiFields = offers('format') || offers('graffiti');

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="soft" size="sm" onClick={open} className="gap-1.5">
          <FunnelIcon className="size-4" />
          Filters
          {chips.length > 0 && (
            <Badge variant="flat" size="small">
              {chips.length}
            </Badge>
          )}
        </Button>
        {chips.length > 0 && (
          <>
            <div className="h-4 w-px bg-border" />
            <div className="flex flex-wrap items-center gap-1.5">
              {chips.map(chip => (
                <FilterChip
                  key={chip.id}
                  label={chip.label}
                  value={chip.value}
                  onRemove={() => onChange(chip.remove)}
                />
              ))}
              <button
                type="button"
                onClick={() => onChange(clearFilters(fields))}
                className="text-xs text-muted transition-colors hover:text-foreground"
              >
                Clear all
              </button>
            </div>
          </>
        )}
      </div>

      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={
          <div className="flex items-center gap-2">
            <AdjustmentsHorizontalIcon className="size-5 text-primary" />
            <span>Filter blocks</span>
          </div>
        }
        size="xl"
        allowContentOverflow
      >
        <form
          className="flex flex-col gap-4"
          onSubmit={event => {
            event.preventDefault();
            apply();
          }}
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Section title="Time">
              <div className="flex flex-wrap gap-1.5">
                {TIME_PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() =>
                      setDraft(prev => ({
                        ...prev,
                        since: Math.floor(Date.now() / 1000) - preset.seconds,
                        until: undefined,
                      }))
                    }
                    className="rounded-sm border border-border bg-surface px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary-40"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <TextField
                  label={`From (${utc ? 'UTC' : 'local'})`}
                  type="datetime-local"
                  value={toDateTimeInput(draft.since, utc)}
                  onChange={value => update('since', fromDateTimeInput(value, utc))}
                />
                <TextField
                  label={`To (${utc ? 'UTC' : 'local'})`}
                  type="datetime-local"
                  value={toDateTimeInput(draft.until, utc)}
                  onChange={value => update('until', fromDateTimeInput(value, utc))}
                />
                <TextField
                  label="From slot"
                  type="number"
                  value={draft.slotMin}
                  onChange={value => updateNumber('slotMin', value)}
                />
                <TextField
                  label="To slot"
                  type="number"
                  value={draft.slotMax}
                  onChange={value => updateNumber('slotMax', value)}
                />
              </div>
            </Section>

            {(offers('entity') || offers('proposer')) && (
              <Section title="Proposer">
                {offers('entity') && <EntityField value={draft.entity} onChange={value => update('entity', value)} />}
                {offers('proposer') && (
                  <Field label="Validator indices">
                    <TagInput
                      tags={parseProposers(draft.proposer).map(String)}
                      onTagsChange={tags => update('proposer', parseProposers(tags.join(',')).join(','))}
                      validate={value => ({ valid: /^\d+$/.test(value) })}
                      placeholder="e.g. 12345"
                    />
                  </Field>
                )}
              </Section>
            )}

            {hasClientFields && (
              <Section title="Clients">
                {(offers('cl') || offers('clVersion') || offers('clCommit')) && (
                  <div className="grid grid-cols-2 gap-2">
                    {offers('cl') && (
                      <div className="col-span-2">
                        <Field label="Consensus client">
                          <SelectMenu
                            value={draft.cl ?? ''}
                            onChange={value => update('cl', value)}
                            options={CONSENSUS_OPTIONS}
                          />
                        </Field>
                      </div>
                    )}
                    {offers('clVersion') && (
                      <TextField
                        label="Consensus version"
                        value={draft.clVersion}
                        onChange={value => update('clVersion', value.trim())}
                        placeholder="e.g. v8.0.0"
                      />
                    )}
                    {offers('clCommit') && (
                      <TextField
                        label="Consensus commit"
                        value={draft.clCommit}
                        onChange={value => update('clCommit', value.trim())}
                        placeholder="e.g. e423"
                      />
                    )}
                  </div>
                )}
                {(offers('el') || offers('elCommit')) && (
                  <div className="grid grid-cols-2 gap-2">
                    {offers('el') && (
                      <div className="col-span-2">
                        <Field label="Execution client">
                          <SelectMenu
                            value={draft.el ?? ''}
                            onChange={value => update('el', value)}
                            options={EXECUTION_OPTIONS}
                          />
                        </Field>
                      </div>
                    )}
                    {offers('elCommit') && (
                      <TextField
                        label="Execution commit"
                        value={draft.elCommit}
                        onChange={value => update('elCommit', value.trim())}
                        placeholder="e.g. 9dff"
                      />
                    )}
                  </div>
                )}
              </Section>
            )}

            {hasGraffitiFields && (
              <Section title="Graffiti">
                {offers('format') && (
                  <Field label="Format">
                    <SelectMenu
                      value={draft.format ?? ''}
                      onChange={value => update('format', value)}
                      options={FORMAT_OPTIONS}
                    />
                  </Field>
                )}
                {offers('graffiti') && (
                  <TextField
                    label="Contains"
                    value={draft.graffiti}
                    onChange={value => update('graffiti', value)}
                    placeholder="Case-sensitive"
                  />
                )}
              </Section>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <Button variant="blank" size="sm" type="button" onClick={() => setDraft({})}>
              Clear all
            </Button>
            <div className="flex gap-2">
              <Button variant="soft" size="sm" type="button" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" type="submit">
                Apply
              </Button>
            </div>
          </div>
        </form>
      </Dialog>
    </>
  );
}
