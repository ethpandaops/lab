import type { ChangeEvent, JSX, ReactNode } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { Card } from '@/components/Layout/Card';
import { Input } from '@/components/Forms/Input';
import { SelectMenu } from '@/components/Forms/SelectMenu';

interface TableCardProps {
  /** Omit when a heading or control outside the card already names it */
  title?: ReactNode;
  actions?: ReactNode;
  /** Search and filter controls shown above the table */
  filters?: ReactNode;
  /** A DataTable; inside a card it runs edge to edge on its own */
  children: ReactNode;
}

/**
 * Card holding a filter row and an edge-to-edge DataTable.
 */
export function TableCard({ title, actions, filters, children }: TableCardProps): JSX.Element {
  return (
    <Card title={title} actions={actions} allowContentOverflow>
      {filters && <div className="mb-4 flex flex-wrap items-center gap-2">{filters}</div>}
      {children}
    </Card>
  );
}

/** Narrows a TableCard to one validator; renders nothing for a single validator */
export function ValidatorFilter({
  indices,
  value,
  onChange,
}: {
  indices: number[];
  value: number | null;
  onChange: (value: number | null) => void;
}): JSX.Element | null {
  if (indices.length < 2) return null;
  return (
    <SelectMenu
      value={value === null ? 'all' : String(value)}
      onChange={v => onChange(v === 'all' ? null : Number(v))}
      options={[
        { value: 'all', label: 'All validators' },
        ...[...indices].sort((a, b) => a - b).map(i => ({ value: String(i), label: `Validator ${i}` })),
      ]}
      expandToFit
    />
  );
}

interface TableSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

/**
 * Compact search field for a TableCard filter row.
 */
export function TableSearch({ value, onChange, placeholder }: TableSearchProps): JSX.Element {
  return (
    <Input size="sm" wrapperClassName="w-full sm:w-60">
      <Input.Leading>
        <MagnifyingGlassIcon />
      </Input.Leading>
      <Input.Field
        type="search"
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </Input>
  );
}
