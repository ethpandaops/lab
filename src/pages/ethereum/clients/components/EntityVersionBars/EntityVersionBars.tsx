import { type JSX, useMemo, useState } from 'react';
import { Link } from '@tanstack/react-router';
import clsx from 'clsx';
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid';
import { Card } from '@/components/Layout/Card';
import { Input } from '@/components/Forms/Input';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { getDataVizColors } from '@/utils/dataVizColors';
import { compareVersions } from '@/utils/version';
import { OTHER_VERSION_COLOR, summariseVersions, versionColors, type VersionCount } from '../../utils/client-versions';

export interface EntityVersionBarsProps {
  client: string;
  /** The client's blocks over the page's window */
  blocks: VersionCount[];
  /** Newest release, for the "behind" sort and column */
  latestVersion?: string;
  /** Version the page is about: it is drawn first in every bar and sorts entities by default */
  focusVersion?: string;
  title: string;
  subtitle?: string;
  /** Window control rendered in the card's toolbar */
  windowControl?: JSX.Element;
}

type Scale = 'blocks' | 'mix';
type Sort = 'blocks' | 'focus' | 'behind';
type Limit = '10' | '20' | '50';

const UNRESOLVED = 'Unresolved';
const UNRESOLVED_COLOR = 'var(--color-border)';

interface EntityRow {
  entity: string;
  blocks: number;
  /** Blocks per version, unresolved under UNRESOLVED */
  counts: Map<string, number>;
  resolved: number;
  /** Resolved blocks on the latest release or newer */
  onLatest: number;
  /** Blocks on the focus version */
  onFocus: number;
}

/** Formats a share, or a dash when nothing was counted */
function percent(part: number, total: number): string {
  return total > 0 ? `${((part / total) * 100).toFixed(0)}%` : '-';
}

/**
 * Top entities proposing with the client, each as a bar split by the versions its blocks ran, with search, sort,
 * scale and size controls. Click a version in the legend to highlight it.
 */
export function EntityVersionBars({
  client,
  blocks,
  latestVersion,
  focusVersion,
  title,
  subtitle,
  windowControl,
}: EntityVersionBarsProps): JSX.Element {
  const [scale, setScale] = useState<Scale>(focusVersion ? 'mix' : 'blocks');
  const [sort, setSort] = useState<Sort>(focusVersion ? 'focus' : 'blocks');
  const [limit, setLimit] = useState<Limit>('20');
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState<string | undefined>(focusVersion);

  const versions = useMemo(() => summariseVersions(blocks), [blocks]);
  const colors = useMemo(() => {
    const map = versionColors(versions, getDataVizColors().CHART_CATEGORICAL_COLORS);
    if (focusVersion && !map.has(focusVersion)) map.set(focusVersion, getDataVizColors().CHART_CATEGORICAL_COLORS[0]);
    return map;
  }, [versions, focusVersion]);
  const colorOf = (version: string): string =>
    version === UNRESOLVED ? UNRESOLVED_COLOR : (colors.get(version) ?? OTHER_VERSION_COLOR);

  const rows = useMemo(() => {
    const byEntity = new Map<string, EntityRow>();
    for (const block of blocks) {
      if (!block.entity) continue;
      const row = byEntity.get(block.entity) ?? {
        entity: block.entity,
        blocks: 0,
        counts: new Map<string, number>(),
        resolved: 0,
        onLatest: 0,
        onFocus: 0,
      };
      row.blocks += block.count;
      const version = block.version ?? UNRESOLVED;
      row.counts.set(version, (row.counts.get(version) ?? 0) + block.count);
      if (block.version) {
        row.resolved += block.count;
        if (latestVersion && compareVersions(block.version, latestVersion) >= 0) row.onLatest += block.count;
        if (block.version === focusVersion) row.onFocus += block.count;
      }
      byEntity.set(block.entity, row);
    }
    return [...byEntity.values()];
  }, [blocks, latestVersion, focusVersion]);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = rows.filter(row => (!needle || row.entity.toLowerCase().includes(needle)) && row.blocks > 0);
    const sorted = [...filtered].sort((a, b) => {
      if (sort === 'focus') return b.onFocus - a.onFocus || b.blocks - a.blocks;
      if (sort === 'behind') return b.resolved - b.onLatest - (a.resolved - a.onLatest) || b.blocks - a.blocks;
      return b.blocks - a.blocks;
    });
    return sorted.slice(0, Number(limit));
  }, [rows, query, sort, limit]);

  const maxBlocks = Math.max(1, ...shown.map(row => row.blocks));
  /** Versions in bar order: focus first, then newest to oldest, unresolved last */
  const orderOf = (row: EntityRow): string[] =>
    [...row.counts.keys()].sort((a, b) => {
      if (a === UNRESOLVED) return 1;
      if (b === UNRESOLVED) return -1;
      if (a === focusVersion) return -1;
      if (b === focusVersion) return 1;
      return compareVersions(b, a);
    });

  const legend = [...colors.keys()];
  const sortOptions: Array<{ value: Sort; label: string }> = [
    { value: 'blocks', label: 'Most blocks' },
    ...(focusVersion ? [{ value: 'focus' as const, label: `Most on ${focusVersion}` }] : []),
    ...(latestVersion ? [{ value: 'behind' as const, label: 'Most behind latest' }] : []),
  ];

  return (
    <Card rounded title={title} subtitle={subtitle} actions={windowControl}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <SegmentedControl options={sortOptions} value={sort} onChange={setSort} ariaLabel="Sort entities" />
          <SegmentedControl
            options={[
              { value: 'blocks', label: 'Blocks' },
              { value: 'mix', label: 'Version mix' },
            ]}
            value={scale}
            onChange={setScale}
            ariaLabel="Bar scale"
          />
          <SegmentedControl
            options={[
              { value: '10', label: 'Top 10' },
              { value: '20', label: 'Top 20' },
              { value: '50', label: 'Top 50' },
            ]}
            value={limit}
            onChange={setLimit}
            ariaLabel="Entities shown"
          />
          <div className="w-full sm:ml-auto sm:w-56">
            <Input size="sm">
              <Input.Leading>
                <MagnifyingGlassIcon />
              </Input.Leading>
              <Input.Field
                value={query}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setQuery(event.target.value)}
                placeholder="Search entities"
                aria-label="Search entities"
              />
            </Input>
          </div>
        </div>

        <ul className="flex flex-wrap gap-x-3 gap-y-1" aria-label="Versions">
          {[...legend, ...(versions.length > legend.length ? ['Other'] : []), UNRESOLVED].map(version => {
            const isRelease = version !== 'Other' && version !== UNRESOLVED;
            const active = !highlight || highlight === version;
            return (
              <li key={version}>
                <button
                  type="button"
                  onClick={() => isRelease && setHighlight(highlight === version ? undefined : version)}
                  disabled={!isRelease}
                  aria-pressed={highlight === version}
                  className={clsx(
                    'inline-flex items-center gap-1.5 rounded-xs px-1.5 py-0.5 text-xs/5 transition-opacity',
                    isRelease ? 'cursor-pointer hover:bg-muted/20' : 'cursor-default',
                    active ? 'opacity-100' : 'opacity-40',
                    highlight === version && 'ring-1 ring-border'
                  )}
                >
                  <span
                    className="size-2.5 rounded-xs"
                    style={{
                      backgroundColor: version === 'Other' ? OTHER_VERSION_COLOR : colorOf(version),
                    }}
                  />
                  <span className={clsx(isRelease ? 'font-mono text-foreground' : 'text-muted')}>{version}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {shown.length === 0 ? (
          <p className="text-sm text-muted">No entity matches.</p>
        ) : (
          <div className="flex flex-col gap-1">
            <div className="grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)_3.5rem_4rem] items-center gap-3 text-xs/5 text-muted sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_4rem_4.5rem]">
              <span>Entity</span>
              <span className="truncate">
                {scale === 'mix' ? 'Share of its blocks by version' : 'Blocks by version'}
              </span>
              <span className="text-right">Blocks</span>
              <span className="text-right">
                {focusVersion && sort === 'focus' ? `On ${focusVersion}` : 'On latest'}
              </span>
            </div>
            {shown.map(row => {
              const width = scale === 'mix' ? 100 : (row.blocks / maxBlocks) * 100;
              return (
                <div
                  key={row.entity}
                  className="grid grid-cols-[minmax(0,6.5rem)_minmax(0,1fr)_3.5rem_4rem] items-center gap-3 rounded-xs py-0.5 hover:bg-muted/10 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)_4rem_4.5rem]"
                >
                  <Link
                    to="/ethereum/entities/$entity"
                    params={{ entity: row.entity }}
                    search={{ tab: 'clients' }}
                    className="truncate text-sm/6 text-foreground hover:underline"
                    title={row.entity}
                  >
                    {row.entity}
                  </Link>
                  <div className="h-4">
                    <div className="flex h-full overflow-hidden rounded-xs" style={{ width: `${width}%` }}>
                      {orderOf(row).map(version => {
                        const count = row.counts.get(version) ?? 0;
                        const dimmed = !!highlight && version !== highlight;
                        return (
                          <span
                            key={version}
                            className="h-full border-r border-surface last:border-r-0"
                            style={{
                              width: `${(count / row.blocks) * 100}%`,
                              backgroundColor: colorOf(version),
                              opacity: dimmed ? 0.25 : 1,
                            }}
                            title={`${version}: ${count.toLocaleString()} blocks, ${percent(count, row.blocks)} of ${row.entity}'s`}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <span className="text-right text-sm/6 text-muted tabular-nums">{row.blocks.toLocaleString()}</span>
                  <span className="text-right text-sm/6 font-medium text-foreground tabular-nums">
                    {focusVersion && sort === 'focus'
                      ? percent(row.onFocus, row.resolved)
                      : percent(row.onLatest, row.resolved)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-xs/5 text-muted">
          {latestVersion && (
            <>
              Latest is{' '}
              <Link
                to="/ethereum/clients/$client/$version"
                params={{ client, version: latestVersion }}
                className="font-mono text-primary hover:underline"
              >
                {latestVersion}
              </Link>
              . Shares count blocks with a resolved version.
            </>
          )}
        </p>
      </div>
    </Card>
  );
}
