import { type JSX, useMemo } from 'react';
import { Card } from '@/components/Layout/Card';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { Stats } from '@/components/DataDisplay/Stats';
import { InfoBox } from '@/components/Feedback/InfoBox';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { compareVersions } from '@/utils/version';
import { CLIENT_WINDOW_OPTIONS } from '../../constants';
import { countVersionsByDay, summariseVersions } from '../../utils/client-versions';
import { VersionShareChart } from '../VersionShareChart';
import { VersionTable } from '../VersionTable';
import type { ClientTabProps } from './ClientTabs.types';

/** Formats a share, or a dash when nothing was counted */
function percent(part: number, total: number): string {
  return total > 0 ? `${((part / total) * 100).toFixed(1)}%` : '-';
}

/**
 * Versions in the client's blocks: share over time and per version, linked to version pages.
 */
export function VersionsTab({
  client,
  blocks,
  blocksLoading,
  releases,
  latest,
  window,
  onWindowChange,
  requirement,
}: ClientTabProps): JSX.Element {
  const versions = useMemo(() => summariseVersions(blocks), [blocks]);
  const days = useMemo(() => countVersionsByDay(blocks), [blocks]);
  const resolved = blocks.filter(block => block.version).length;
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
        <SegmentedControl options={CLIENT_WINDOW_OPTIONS} value={window} onChange={onWindowChange} ariaLabel="Window" />
        <InfoBox summary="How versions are read">
          Versions come from the graffiti&apos;s version string or its commit prefix, matched against the client&apos;s
          published releases. Commits that match no release, such as <span className="font-mono">0000</span>, stay
          unresolved and are left out of version shares.
        </InfoBox>
      </div>

      {blocksLoading ? (
        <LoadingContainer className="h-96 rounded-sm" />
      ) : (
        <>
          <Stats
            gridClassName="grid grid-cols-2 gap-4 lg:grid-cols-4"
            stats={[
              { id: 'blocks', name: 'Blocks', value: blocks.length.toLocaleString() },
              { id: 'resolved', name: 'Resolved to a release', value: percent(resolved, blocks.length) },
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
            subtitle="Daily share of blocks with a resolved version"
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
        </>
      )}
    </div>
  );
}
