import { type JSX, useMemo } from 'react';
import { Card } from '@/components/Layout/Card';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { Stats } from '@/components/DataDisplay/Stats';
import { InfoBox } from '@/components/Feedback/InfoBox';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { compareVersions } from '@/utils/version';
import { SHARE_WINDOW_DAYS, SHARE_WINDOW_OPTIONS, SHARE_WINDOW_TEXT } from '../../constants';
import { useVersionCounts } from '../../hooks';
import {
  UNRESOLVED_LABELS,
  countVersionsByDay,
  summariseUnresolved,
  sinceSuffix,
  summariseVersions,
  windowStart,
} from '../../utils/client-versions';
import { Table } from '@/components/Lists/Table';
import { Entity } from '@/components/Ethereum/Entity';
import { VersionShareChart } from '../VersionShareChart';
import { VersionTable } from '../VersionTable';
import type { ClientTabProps } from './ClientTabs.types';

/** Days of unresolved blocks listed with their entities */
const UNRESOLVED_DAYS = 30;

/** Formats a share, or a dash when nothing was counted */
function percent(part: number, total: number): string {
  return total > 0 ? `${((part / total) * 100).toFixed(1)}%` : '-';
}

/**
 * Versions in the client's blocks: share over time and per version, linked to version pages.
 */
export function VersionsTab({
  client,
  layer,
  releases,
  latest,
  shareWindow,
  onShareWindowChange,
  requirement,
}: ClientTabProps): JSX.Element {
  const windowDays = SHARE_WINDOW_DAYS[shareWindow];
  const history = useVersionCounts({
    grain: 'daily',
    client,
    layer,
    from: windowDays === null ? undefined : windowStart(windowDays),
  });
  const unresolvedRecent = useVersionCounts({
    grain: 'entity-daily',
    client,
    layer,
    unresolvedOnly: true,
    from: windowStart(UNRESOLVED_DAYS),
  });
  const blocks = history.rows;
  const total = useMemo(() => blocks.reduce((sum, row) => sum + row.count, 0), [blocks]);
  const versions = useMemo(() => summariseVersions(blocks), [blocks]);
  const days = useMemo(() => countVersionsByDay(blocks), [blocks]);
  const unresolved = useMemo(() => summariseUnresolved(unresolvedRecent.rows), [unresolvedRecent.rows]);
  const resolved = useMemo(
    () => blocks.filter(block => block.version).reduce((sum, row) => sum + row.count, 0),
    [blocks]
  );
  const blocksLoading = history.isLoading;
  const unresolvedTotal = useMemo(
    () => history.rows.filter(row => row.time >= windowStart(UNRESOLVED_DAYS)).reduce((sum, row) => sum + row.count, 0),
    [history.rows]
  );
  const lastDay = days[days.length - 1];
  const onLatest =
    lastDay && latest?.version
      ? [...lastDay.counts.entries()]
          .filter(([version]) => compareVersions(version, latest.version!) >= 0)
          .reduce((sum, [, count]) => sum + count, 0)
      : 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-4">
        <SegmentedControl
          options={SHARE_WINDOW_OPTIONS}
          value={shareWindow}
          onChange={onShareWindowChange}
          ariaLabel="Window"
        />
        <InfoBox summary="How versions are read">
          Versions come from the graffiti&apos;s version string or its commit prefix, matched against the client&apos;s
          releases. A commit from a branch rather than a release tag counts under the release it builds on, as a build
          after it. Blocks whose graffiti names no release are left out of version shares and listed under Unresolved
          blocks.
        </InfoBox>
      </div>

      {blocksLoading ? (
        <LoadingContainer className="h-96 rounded-sm" />
      ) : (
        <>
          <Stats
            gridClassName="grid grid-cols-2 gap-4 lg:grid-cols-4"
            stats={[
              { id: 'blocks', name: `Blocks, ${SHARE_WINDOW_TEXT[shareWindow]}`, value: total.toLocaleString() },
              { id: 'resolved', name: 'Resolved to a release', value: percent(resolved, total) },
              { id: 'versions', name: 'Versions seen', value: versions.length.toLocaleString() },
              {
                id: 'latest',
                name: `On ${latest?.version ?? 'latest'} or newer, today`,
                value: percent(onLatest, lastDay?.resolved ?? 0),
              },
            ]}
          />
          <PopoutCard
            title="Version share"
            subtitle={`Daily share of blocks with a resolved version${sinceSuffix(history.dataStart, windowDays === null ? undefined : windowStart(windowDays))}`}
            anchorId="version-share"
            modalSize="full"
          >
            {({ inModal }) => <VersionShareChart days={days} versions={versions} height={inModal ? 600 : 320} />}
          </PopoutCard>
          <Card rounded title="Versions">
            {versions.length === 0 ? (
              <p className="text-sm text-muted">No block in this window resolved to a release.</p>
            ) : (
              <VersionTable
                client={client}
                versions={versions}
                releases={releases}
                latest={latest}
                minVersion={requirement?.minVersion}
              />
            )}
          </Card>
          {unresolved.length > 0 && (
            <Card
              rounded
              title="Unresolved blocks"
              subtitle={`Blocks whose graffiti names no release, last ${UNRESOLVED_DAYS} days`}
            >
              <Table
                variant="nested"
                data={unresolved.slice(0, 15)}
                getRowKey={row => `${row.reason}-${row.commit ?? ''}`}
                columns={[
                  { header: 'Reason', accessor: row => UNRESOLVED_LABELS[row.reason] ?? row.reason },
                  {
                    header: 'Commit',
                    accessor: row => <span className="font-mono text-xs/6">{row.commit ?? '-'}</span>,
                  },
                  {
                    header: 'Blocks',
                    accessor: row => row.blocks.toLocaleString(),
                    cellClassName: 'text-right tabular-nums text-foreground',
                    headerClassName: 'text-right',
                  },
                  {
                    header: 'Share of all blocks',
                    accessor: row => percent(row.blocks, unresolvedTotal),
                    cellClassName: 'text-right tabular-nums text-muted',
                    headerClassName: 'text-right',
                  },
                  {
                    header: 'Top entities',
                    accessor: row =>
                      row.entities.length === 0 ? (
                        '-'
                      ) : (
                        <span className="flex flex-wrap gap-x-2">
                          {row.entities.slice(0, 3).map(entity => (
                            <Entity key={entity} entity={entity} className="text-sm/6" />
                          ))}
                        </span>
                      ),
                  },
                ]}
              />
            </Card>
          )}
        </>
      )}
    </div>
  );
}
