import type { JSX, ReactNode } from 'react';
import { ChevronRightIcon } from '@heroicons/react/20/solid';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { getCountryFlag } from '@/utils';
import type { NodeRow } from '../../hooks/useNodeRows';

export interface LocationsBreakdownProps {
  /** Rows that carry a location */
  rows: NodeRow[];
  rangeLabel: string;
}

const CONTINENTS: Record<string, string> = {
  AF: 'Africa',
  AN: 'Antarctica',
  AS: 'Asia',
  EU: 'Europe',
  NA: 'North America',
  OC: 'Oceania',
  SA: 'South America',
};

interface Group {
  key: string;
  label: ReactNode;
  count: number;
  children: Group[];
}

/** Groups rows by each key in turn, largest group first */
function groupBy(rows: NodeRow[], levels: Array<(row: NodeRow) => { key: string; label: ReactNode }>): Group[] {
  if (levels.length === 0) return [];
  const [level, ...rest] = levels;
  const groups = new Map<string, { label: ReactNode; rows: NodeRow[] }>();
  rows.forEach(row => {
    const { key, label } = level(row);
    if (!groups.has(key)) groups.set(key, { label, rows: [] });
    groups.get(key)!.rows.push(row);
  });
  return [...groups.entries()]
    .map(([key, group]) => ({
      key,
      label: group.label,
      count: group.rows.length,
      children: groupBy(group.rows, rest),
    }))
    .sort((a, b) => b.count - a.count);
}

const LEVELS: Array<(row: NodeRow) => { key: string; label: ReactNode }> = [
  ({ node }) => {
    const code = node.meta_client_geo_continent_code?.toUpperCase() ?? '';
    return { key: code || 'unknown', label: CONTINENTS[code] ?? 'Unknown' };
  },
  ({ node }) => ({
    key: node.meta_client_geo_country_code || 'unknown',
    label: (
      <span className="flex items-center gap-1.5">
        <span>{getCountryFlag(node.meta_client_geo_country_code, '')}</span>
        <span className="truncate">{node.meta_client_geo_country || 'Unknown'}</span>
      </span>
    ),
  }),
  ({ node }) => ({ key: node.meta_client_geo_city || 'unknown', label: node.meta_client_geo_city || 'Unknown' }),
];

function GroupRow({ group, total }: { group: Group; total: number }): JSX.Element {
  return (
    <div>
      <div className="flex items-center gap-3">
        <span className="min-w-0 flex-1 truncate text-sm/6 text-foreground">{group.label}</span>
        <span className="w-10 shrink-0 text-right text-sm/6 font-medium text-foreground tabular-nums">
          {group.count}
        </span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-border">
        <div className="h-full rounded-full bg-muted" style={{ width: `${(group.count / total) * 100}%` }} />
      </div>
    </div>
  );
}

function GroupList({ groups, total }: { groups: Group[]; total: number }): JSX.Element {
  return (
    <ul className="flex flex-col gap-2.5">
      {groups.map(group => (
        <li key={group.key}>
          {group.children.length > 0 ? (
            <details className="group/location">
              <summary className="flex cursor-pointer list-none items-start gap-1 [&::-webkit-details-marker]:hidden">
                <ChevronRightIcon className="mt-0.5 size-5 shrink-0 text-muted transition-transform group-open/location:rotate-90" />
                <div className="min-w-0 flex-1">
                  <GroupRow group={group} total={total} />
                </div>
              </summary>
              <div className="mt-2.5 ml-6">
                <GroupList groups={group.children} total={total} />
              </div>
            </details>
          ) : (
            <div className="ml-6">
              <GroupRow group={group} total={total} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Node IDs by continent, then country, then city; each level opens the next.
 */
export function LocationsBreakdown({ rows, rangeLabel }: LocationsBreakdownProps): JSX.Element {
  const continents = groupBy(rows, LEVELS);

  return (
    <PopoutCard title="Locations" subtitle={rangeLabel} anchorId="locations" enableDownload={false}>
      <div className="mb-2 flex gap-3 text-xs/5 font-medium text-muted">
        <span className="flex-1" />
        <span className="text-right">Node IDs</span>
      </div>
      <GroupList groups={continents} total={rows.length} />
    </PopoutCard>
  );
}
