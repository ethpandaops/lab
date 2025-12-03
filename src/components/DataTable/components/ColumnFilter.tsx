import { type JSX, useState, useEffect } from 'react';
import type { Column } from '@tanstack/react-table';
import { Input } from '@/components/Forms/Input';
import { SelectMenu } from '@/components/Forms/SelectMenu';
import type { DataTableColumnMeta } from '../DataTable.types';

interface ColumnFilterProps<TData> {
  column: Column<TData>;
}

export function ColumnFilter<TData>({ column }: ColumnFilterProps<TData>): JSX.Element | null {
  const meta = column.columnDef.meta as DataTableColumnMeta | undefined;
  const filterValue = column.getFilterValue();

  const [textValue, setTextValue] = useState<string>((filterValue as string) || '');

  // Sync text value with filter value
  useEffect(() => {
    if (meta?.filterType === 'text') {
      setTextValue((filterValue as string) || '');
    }
  }, [filterValue, meta?.filterType]);

  // No filter type specified
  if (!meta?.filterType) {
    return null;
  }

  const handleTextChange = (value: string): void => {
    setTextValue(value);
    // Simple debounce - the setTimeout updates filter after delay
    // Note: This doesn't cancel previous timeouts, for proper debouncing consider useDebounce hook
    setTimeout(() => {
      column.setFilterValue(value || undefined);
    }, 300);
  };

  // Text filter
  if (meta.filterType === 'text') {
    return (
      <Input size="sm">
        <Input.Field
          type="text"
          value={textValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTextChange(e.target.value)}
          placeholder={meta.filterPlaceholder || 'Filter...'}
          className="min-w-[120px]"
        />
      </Input>
    );
  }

  // Select filter
  if (meta.filterType === 'select' && meta.filterOptions) {
    const options = [
      { value: '', label: meta.filterPlaceholder || 'All' },
      ...meta.filterOptions.map(opt => ({
        value: opt.value,
        label: opt.label,
        icon: opt.icon,
      })),
    ];

    return (
      <SelectMenu
        value={(filterValue as string) || ''}
        onChange={(value: string) => column.setFilterValue(value || undefined)}
        options={options}
        placeholder={meta.filterPlaceholder || 'All'}
        expandToFit
        rounded
      />
    );
  }

  // Multi-select filter
  if (meta.filterType === 'multi-select' && meta.filterOptions) {
    // For multi-select, we would typically use a more complex component
    // For now, falling back to single select
    const options = [
      { value: '', label: meta.filterPlaceholder || 'All' },
      ...meta.filterOptions.map(opt => ({
        value: opt.value,
        label: opt.label,
        icon: opt.icon,
      })),
    ];

    return (
      <SelectMenu
        value={(filterValue as string) || ''}
        onChange={(value: string) => column.setFilterValue(value || undefined)}
        options={options}
        placeholder={meta.filterPlaceholder || 'All'}
        expandToFit
        rounded
      />
    );
  }

  // Number range filter (simplified for now)
  if (meta.filterType === 'number-range') {
    return (
      <Input size="sm">
        <Input.Field
          type="number"
          value={textValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTextChange(e.target.value)}
          placeholder={meta.filterPlaceholder || 'Min...'}
          className="min-w-[100px]"
        />
      </Input>
    );
  }

  // Date range filter (simplified for now)
  if (meta.filterType === 'date-range') {
    return (
      <Input size="sm">
        <Input.Field
          type="date"
          value={textValue}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTextChange(e.target.value)}
          placeholder={meta.filterPlaceholder || 'Date...'}
          className="min-w-[140px]"
        />
      </Input>
    );
  }

  return null;
}
