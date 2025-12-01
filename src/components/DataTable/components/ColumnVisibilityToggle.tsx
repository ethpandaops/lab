import { type JSX } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { ChevronDownIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/20/solid';
import clsx from 'clsx';
import type { Table } from '@tanstack/react-table';
import { Checkbox } from '@/components/Forms/Checkbox';
import { Button } from '@/components/Elements/Button';

interface ColumnVisibilityToggleProps<TData> {
  table: Table<TData>;
}

export function ColumnVisibilityToggle<TData>({ table }: ColumnVisibilityToggleProps<TData>): JSX.Element {
  const allColumns = table.getAllColumns();
  const hideableColumns = allColumns.filter(column => column.getCanHide());

  if (hideableColumns.length === 0) {
    return <></>;
  }

  const visibleCount = hideableColumns.filter(column => column.getIsVisible()).length;
  const totalCount = hideableColumns.length;

  return (
    <Menu as="div" className="relative inline-block text-left">
      <MenuButton as={Button} variant="outline" size="sm" rounded="md" trailingIcon={<ChevronDownIcon />}>
        Columns ({visibleCount}/{totalCount})
      </MenuButton>

      <MenuItems
        transition
        className={clsx(
          'absolute right-0 z-10 mt-2 w-56 origin-top-right border border-border bg-surface shadow-lg backdrop-blur-xl transition',
          'data-closed:scale-95 data-closed:opacity-0 data-enter:duration-100 data-enter:ease-out',
          'data-leave:duration-75 data-leave:ease-in',
          'focus:outline-hidden'
        )}
      >
        <div className="py-1">
          {/* Show All / Hide All */}
          <div className="border-b border-border px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  table.toggleAllColumnsVisible(true);
                }}
                className="flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-foreground"
              >
                <EyeIcon className="size-3.5" />
                Show all
              </button>
              <button
                onClick={() => {
                  table.toggleAllColumnsVisible(false);
                }}
                className="flex items-center gap-1.5 text-xs text-muted transition-colors hover:text-foreground"
              >
                <EyeSlashIcon className="size-3.5" />
                Hide all
              </button>
            </div>
          </div>

          {/* Column toggles */}
          <div className="max-h-[300px] overflow-y-auto">
            {hideableColumns.map(column => (
              <MenuItem key={column.id} as="div">
                <label
                  className={clsx(
                    'flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors',
                    'hover:bg-primary/10 hover:text-primary'
                  )}
                >
                  <Checkbox checked={column.getIsVisible()} onChange={column.getToggleVisibilityHandler()} rounded />
                  <span className="truncate select-none">
                    {typeof column.columnDef.header === 'string'
                      ? column.columnDef.header
                      : column.id.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </label>
              </MenuItem>
            ))}
          </div>
        </div>
      </MenuItems>
    </Menu>
  );
}
