import { type JSX, useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Table } from '@/components/Lists/Table';
import type { Column } from '@/components/Lists/Table/Table.types';
import { Entity } from '@/components/Ethereum/Entity';
import { compareVersions } from '@/utils/version';
import type { ResolvedBlock } from '../../utils/client-versions';

export interface EntityTableProps {
  client: string;
  blocks: ResolvedBlock[];
  /** Rows to show */
  limit?: number;
}

interface EntityRow {
  entity: string;
  blocks: number;
  share: number;
  /** Version of the entity's latest resolved block */
  version?: string;
  versions: number;
}

/**
 * Entities proposing blocks with the client, largest first, with the version they run now.
 */
export function EntityTable({ client, blocks, limit = 25 }: EntityTableProps): JSX.Element {
  const rows = useMemo(() => {
    const byEntity = new Map<string, { blocks: number; version?: string; time: number; versions: Set<string> }>();
    for (const block of blocks) {
      if (!block.entity) continue;
      const entry = byEntity.get(block.entity) ?? { blocks: 0, time: 0, versions: new Set<string>() };
      entry.blocks++;
      if (block.version) {
        entry.versions.add(block.version);
        if (block.time >= entry.time) {
          entry.time = block.time;
          entry.version = block.version;
        }
      }
      byEntity.set(block.entity, entry);
    }
    const total = blocks.length;
    return [...byEntity.entries()]
      .map(([entity, entry]) => ({
        entity,
        blocks: entry.blocks,
        share: total > 0 ? (entry.blocks / total) * 100 : 0,
        version: entry.version,
        versions: entry.versions.size,
      }))
      .sort((a, b) => b.blocks - a.blocks || compareVersions(b.version ?? '', a.version ?? ''));
  }, [blocks]);

  const columns: Column<EntityRow>[] = [
    { header: 'Entity', accessor: row => <Entity entity={row.entity} className="text-sm/6 font-medium" /> },
    {
      header: 'Blocks',
      accessor: row => row.blocks.toLocaleString(),
      cellClassName: 'text-right tabular-nums text-muted',
      headerClassName: 'text-right',
    },
    {
      header: 'Share of blocks',
      accessor: row => `${row.share.toFixed(1)}%`,
      cellClassName: 'text-right tabular-nums font-medium text-foreground',
      headerClassName: 'text-right',
    },
    {
      header: 'Current version',
      accessor: row =>
        row.version ? (
          <Link
            to="/ethereum/clients/$client/$version"
            params={{ client, version: row.version }}
            className="font-mono text-xs/6 text-primary hover:underline"
          >
            {row.version}
          </Link>
        ) : (
          <span className="text-xs/6 text-muted">Unresolved</span>
        ),
    },
    {
      header: 'Versions',
      accessor: row => row.versions,
      cellClassName: 'text-right tabular-nums text-muted',
      headerClassName: 'text-right',
    },
  ];

  if (rows.length === 0) return <p className="text-sm text-muted">No blocks from a known entity in this window.</p>;
  return <Table variant="nested" data={rows.slice(0, limit)} columns={columns} getRowKey={row => row.entity} />;
}
