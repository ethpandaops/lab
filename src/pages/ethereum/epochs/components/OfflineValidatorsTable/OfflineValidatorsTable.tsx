import { type JSX, useMemo, useState } from 'react';
import { Card } from '@/components/Layout/Card';
import { Table } from '@/components/Lists/Table';
import type { Column } from '@/components/Lists/Table/Table.types';
import type { MissedAttestationByEntity } from '../../hooks/useEpochsData.types';

/** Rows shown before "Show all" */
const COLLAPSED_ROWS = 15;

export interface OfflineValidatorsTableProps {
  /** Missed attestations per entity per epoch, for the epochs on the page */
  data: MissedAttestationByEntity[];
  /** Epochs on the page, newest first; one column each */
  epochs: number[];
}

interface Row {
  entity: string;
  total: number;
  byEpoch: Map<number, number>;
}

/**
 * Every entity with offline validators in the page's epochs: total plus a count per epoch,
 * worst first, filterable by name. Cells are shaded relative to the worst cell on the page.
 */
export function OfflineValidatorsTable({ data, epochs }: OfflineValidatorsTableProps): JSX.Element {
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);

  const { rows, maxCell, grandTotal } = useMemo(() => {
    const byEntity = new Map<string, Row>();
    let maxCell = 0;
    let grandTotal = 0;
    for (const { entity, epoch, count } of data) {
      const row = byEntity.get(entity) ?? { entity, total: 0, byEpoch: new Map<number, number>() };
      const cell = (row.byEpoch.get(epoch) ?? 0) + count;
      row.byEpoch.set(epoch, cell);
      row.total += count;
      grandTotal += count;
      maxCell = Math.max(maxCell, cell);
      byEntity.set(entity, row);
    }
    const rows = [...byEntity.values()].sort((a, b) => b.total - a.total || a.entity.localeCompare(b.entity));
    return { rows, maxCell, grandTotal };
  }, [data]);

  const needle = query.trim().toLowerCase();
  const filtered = needle ? rows.filter(row => row.entity.toLowerCase().includes(needle)) : rows;
  const visible = expanded || needle ? filtered : filtered.slice(0, COLLAPSED_ROWS);

  const columns: Column<Row>[] = [
    { header: 'Entity', accessor: row => row.entity, cellClassName: 'text-foreground font-medium' },
    {
      header: 'Total',
      accessor: row => row.total.toLocaleString(),
      headerClassName: 'text-right',
      cellClassName: 'text-right text-foreground font-medium',
    },
    ...epochs.map(
      (epoch): Column<Row> => ({
        header: String(epoch),
        headerClassName: 'text-right',
        cellClassName: 'p-0!',
        accessor: row => {
          const value = row.byEpoch.get(epoch) ?? 0;
          return (
            <div
              className="px-3 py-2.5 text-right"
              style={
                value > 0 && maxCell > 0
                  ? {
                      backgroundColor: `color-mix(in srgb, var(--color-danger) ${Math.round(6 + (value / maxCell) * 34)}%, transparent)`,
                    }
                  : undefined
              }
            >
              <span className={value > 0 ? 'text-foreground' : 'text-muted/50'}>
                {value > 0 ? value.toLocaleString() : '0'}
              </span>
            </div>
          );
        },
      })
    ),
  ];

  return (
    <Card
      title="Offline validators by entity"
      subtitle={`${grandTotal.toLocaleString()} missed attestations across ${rows.length} entities`}
      actions={
        <input
          type="text"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder="Filter entities"
          aria-label="Filter entities"
          className="h-8 w-48 rounded-sm border border-border bg-surface px-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:ring-0 focus:outline-hidden"
        />
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-muted">No offline validators in these epochs.</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted">No entity matches &ldquo;{query.trim()}&rdquo;.</p>
      ) : (
        <>
          <Table variant="nested" data={visible} columns={columns} getRowKey={row => row.entity} />
          {!needle && filtered.length > COLLAPSED_ROWS && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="mt-3 text-sm text-muted transition-colors hover:text-foreground"
            >
              {expanded ? 'Show fewer' : `Show all ${filtered.length}`}
            </button>
          )}
        </>
      )}
    </Card>
  );
}
