import { useState, type JSX } from 'react';
import { useNavigate, useSearch } from '@tanstack/react-router';

import { MultiLineChart, type MarkLineConfig } from '@/components/Charts/MultiLine';
import { Stats } from '@/components/DataDisplay/Stats';
import { Alert } from '@/components/Feedback/Alert';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { useForks } from '@/hooks/useForks';
import { useNetwork } from '@/hooks/useNetwork';
import { formatCompact, formatDayLabel } from '@/pages/ethereum/validators/utils/overview';
import { epochToTimestamp, getDataVizColors } from '@/utils';

import { InspectSection } from '@/pages/ethereum/validators/components';

import { ClientMix } from './components/ClientMix';
import { EntitiesSkeleton } from './components/EntitiesSkeleton';
import { EntitiesTable } from './components/EntitiesTable';
import { MissedAttestationsTable } from './components/MissedAttestationsTable';
import { StakeMovers } from './components/StakeMovers';
import { AGGREGATE_ENTITIES, ENTITIES_WINDOW_OPTIONS, ENTITIES_WINDOW_DAYS, type EntitiesWindow } from './constants';
import { useEntityBlocks, useEntityLiveness, useEntityStake, useStakeShareHistory } from './hooks';
import { dayOf, entitiesToReach } from './utils/overview';

/** Entities drawn as their own band in the stake share chart */
const SHARE_CHART_ENTITIES = 10;
/** Entities drawn as their own line in the offline validators chart */
const OFFLINE_CHART_ENTITIES = 8;

const percent = (fraction: number, digits = 1): string => `${(fraction * 100).toFixed(digits)}%`;

/** Concentration of the given stakes against all stake */
function concentration(
  stakes: number[],
  total: number
): {
  entities: number;
  top10Share: number;
  halt: ReturnType<typeof entitiesToReach>;
  majority: ReturnType<typeof entitiesToReach>;
} {
  const held = stakes.filter(s => s > 0).sort((a, b) => b - a);
  return {
    entities: held.length,
    top10Share: total ? held.slice(0, SHARE_CHART_ENTITIES).reduce((sum, s) => sum + s, 0) / total : 0,
    halt: entitiesToReach(held, total, 1 / 3),
    majority: entitiesToReach(held, total, 2 / 3),
  };
}

/**
 * Entities overview over one time range: concentration now and where it started, stake share over time, movers,
 * proposer clients, and how each entity attested.
 */
export function IndexPage(): JSX.Element {
  const navigate = useNavigate();
  const search = useSearch({ from: '/ethereum/entities/' });
  const window: EntitiesWindow = search.t ?? '1y';
  // Hour aligned and fixed at mount, so the liveness epochs don't move between renders
  const [nowHour] = useState(() => Math.floor(Date.now() / 3_600_000) * 3600);
  const windowDays = ENTITIES_WINDOW_DAYS[window];
  const [shareMode, setShareMode] = useState<'share' | 'stake'>('share');

  const { CHART_CATEGORICAL_COLORS: palette, DATA_COLORS } = getDataVizColors();
  const { currentNetwork } = useNetwork();
  const { allForks } = useForks();

  const stake = useEntityStake(window);
  const { entities, totalStakeEth, firstDay, latestDay, startDay } = stake;
  const liveness = useEntityLiveness(windowDays === null ? null : nowHour - windowDays * 86_400);

  // Named operators only: the aggregate buckets hold unrelated validators
  const named = entities.filter(e => e.validators > 0 && !AGGREGATE_ENTITIES.has(e.entity));
  const chartEntities = named.slice(0, SHARE_CHART_ENTITIES).map(e => e.entity);
  const history = useStakeShareHistory(chartEntities, firstDay, latestDay);
  const labels = history.days.map(formatDayLabel);
  const blocks = useEntityBlocks(chartEntities, firstDay, latestDay);

  // --- Concentration at the window's end and start, against all stake ---
  const largest = named[0];
  const now = concentration(
    named.map(e => e.stakeEth),
    totalStakeEth
  );
  const startTotalEth = entities.reduce((sum, e) => sum + e.startEth, 0);
  const start = concentration(
    named.map(e => e.startEth),
    startTotalEth
  );
  const from = (value: string | undefined): string | undefined =>
    startDay && startDay !== latestDay && value !== undefined ? `From ${value}` : undefined;

  // --- Liveness across the range ---
  const totalMissed = [...liveness.missedByEntity.values()].reduce((sum, n) => sum + n, 0);
  const onlineRate = liveness.totalDue ? Math.max(0, 1 - totalMissed / liveness.totalDue) : null;
  const sampled = liveness.epochs.length > 1 && liveness.epochs[1] - liveness.epochs[0] > 1;
  // A rate, not a count of entities seen missing, so sampling epochs doesn't undercount it
  const entitiesBelow = [...liveness.missedByEntity.entries()].filter(([entity, missed]) => {
    const due = liveness.dueByEntity.get(entity) ?? 0;
    return entity !== 'unknown' && due > 0 && missed / due > 0.05;
  }).length;
  const offlineEntities = [...liveness.missedByEntity.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, OFFLINE_CHART_ENTITIES)
    .map(([entity]) => entity);
  const epochTimes = liveness.epochs.map(e => (currentNetwork ? epochToTimestamp(e, currentNetwork.genesis_time) : 0));
  const formatEpochTime = (ts: number): string => {
    const d = new Date(ts * 1000);
    if (windowDays !== null && windowDays <= 1) return d.toISOString().slice(11, 16);
    const month = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
    return windowDays !== null && windowDays <= 90
      ? `${month} ${d.getUTCDate()}`
      : `${month} '${String(d.getUTCFullYear()).slice(-2)}`;
  };
  const livenessMeta = [
    liveness.dataStartEpoch !== null && currentNetwork
      ? `Since ${formatDayLabel(dayOf(epochToTimestamp(liveness.dataStartEpoch, currentNetwork.genesis_time)))}`
      : null,
    sampled ? `${liveness.epochs.length} epochs spread across the range` : null,
  ].filter(Boolean);

  // --- Fork marks on the nearest plotted day on or after each fork ---
  const forkMarks: MarkLineConfig[] = currentNetwork
    ? allForks
        .filter(f => f.name !== 'phase0')
        .flatMap(f => {
          const idx = history.days.findIndex(d => d >= dayOf(epochToTimestamp(f.epoch, currentNetwork.genesis_time)));
          if (idx <= 0) return [];
          return [
            {
              xValue: labels[idx],
              label: f.displayName,
              labelPosition: 'end' as const,
              color: DATA_COLORS.violet,
              lineStyle: 'dashed' as const,
              lineWidth: 1,
            },
          ];
        })
    : [];

  const toValue = (eth: number | null, i: number): number | null => {
    const total = history.totals[i];
    if (eth === null || !total) return null;
    return shareMode === 'share' ? Number(((eth / total) * 100).toFixed(2)) : Math.round(eth);
  };
  const shareSeries = chartEntities.map((entity, i) => ({
    name: entity,
    data: (history.byEntity.get(entity) ?? []).map(toValue),
    color: palette[i % palette.length],
    stack: 'stake',
    showArea: true,
    areaOpacity: 0.85,
    lineWidth: 0,
    showSymbol: false,
  }));

  return (
    <Container>
      <Header title="Entities" description="Who runs Ethereum's validators: stake, concentration and liveness" />

      <SegmentedControl
        options={ENTITIES_WINDOW_OPTIONS}
        value={window}
        onChange={value => navigate({ to: '/ethereum/entities', search: { ...search, t: value }, replace: true })}
        ariaLabel="Time range"
        className="mb-6"
      />

      {stake.error && <Alert variant="error" title="Could not load entities" description={stake.error.message} />}
      {!stake.error && stake.isLoading && <EntitiesSkeleton />}
      {!stake.error && !stake.isLoading && named.length === 0 && (
        <Alert variant="info" title="No entity data for this network" />
      )}

      {!stake.error && !stake.isLoading && named.length > 0 && (
        <div className="flex flex-col gap-10">
          <InspectSection
            title="Stake"
            meta={startDay && latestDay ? `${formatDayLabel(startDay)} to ${formatDayLabel(latestDay)}` : undefined}
          >
            <Stats
              gridClassName="grid grid-cols-2 gap-px md:grid-cols-3 xl:grid-cols-6"
              stats={[
                {
                  id: 'entities',
                  name: 'Entities',
                  value: now.entities.toLocaleString(),
                  subtitle: from(start.entities.toLocaleString()),
                },
                {
                  id: 'staked',
                  name: 'Staked',
                  value: `${formatCompact(totalStakeEth)} ETH`,
                  subtitle: from(`${formatCompact(startTotalEth)} ETH`),
                },
                {
                  id: 'largest',
                  name: 'Largest entity',
                  value: largest.entity,
                  valueClassName: 'truncate',
                  subtitle: `${percent(largest.stakeEth / totalStakeEth)} of stake`,
                },
                {
                  id: 'top10',
                  name: 'Top 10 share',
                  value: percent(now.top10Share),
                  subtitle: from(startTotalEth ? percent(start.top10Share) : undefined),
                },
                {
                  id: 'halt',
                  name: 'Entities to halt finality',
                  value: now.halt ? now.halt.count.toLocaleString() : '-',
                  subtitle: from(start.halt?.count.toLocaleString()),
                },
                {
                  id: 'majority',
                  name: 'Entities to finalize',
                  value: now.majority ? now.majority.count.toLocaleString() : '-',
                  subtitle: from(start.majority?.count.toLocaleString()),
                },
              ]}
            />

            <PopoutCard
              title="Stake by entity"
              anchorId="stake-by-entity"
              modalSize="full"
              headerActions={
                <SegmentedControl
                  options={[
                    { value: 'share', label: 'Share' },
                    { value: 'stake', label: 'ETH' },
                  ]}
                  value={shareMode}
                  onChange={setShareMode}
                  ariaLabel="Stake measure"
                />
              }
            >
              {({ inModal }) =>
                history.isLoading ? (
                  <LoadingContainer className="h-[400px] w-full rounded-sm" shimmer={false} />
                ) : history.error ? (
                  <Alert variant="error" title="Could not load stake history" description={history.error.message} />
                ) : (
                  <MultiLineChart
                    series={shareSeries}
                    xAxis={{ type: 'category', labels }}
                    yAxis={
                      shareMode === 'share'
                        ? { name: 'Share of stake', min: 0, formatter: v => `${v}%` }
                        : { name: 'Staked ETH', min: 0 }
                    }
                    height={inModal ? 600 : 400}
                    showLegend
                    legendPosition="top"
                    enableDataZoom
                    markLines={forkMarks}
                  />
                )
              }
            </PopoutCard>

            <div className="grid gap-4 xl:grid-cols-2 [&>*]:min-w-0">
              <StakeMovers entities={entities} />
              {blocks.error ? (
                <Alert variant="error" title="Could not load blocks" description={blocks.error.message} />
              ) : blocks.isLoading ? (
                <LoadingContainer className="h-full min-h-96 w-full rounded-sm" shimmer={false} />
              ) : (
                <ClientMix entities={blocks.entities} />
              )}
            </div>

            <EntitiesTable entities={entities} totalStakeEth={totalStakeEth} />
          </InspectSection>

          <InspectSection title="Liveness" meta={livenessMeta.length ? livenessMeta.join(', ') : undefined}>
            {liveness.error ? (
              <Alert variant="error" title="Could not load attestations" description={liveness.error.message} />
            ) : liveness.isLoading ? (
              <LoadingContainer className="h-96 w-full rounded-sm" shimmer={false} />
            ) : (
              <>
                <Stats
                  gridClassName="grid grid-cols-1 gap-px sm:grid-cols-3"
                  stats={[
                    {
                      id: 'online',
                      name: 'Attestations made',
                      value: onlineRate === null ? '-' : percent(onlineRate, 2),
                    },
                    {
                      id: 'offline',
                      name: 'Offline validators per epoch',
                      value: Math.round(totalMissed / liveness.epochs.length).toLocaleString(),
                    },
                    {
                      id: 'entities-below',
                      name: 'Entities below 95% online',
                      value: entitiesBelow.toLocaleString(),
                    },
                  ]}
                />
                <div className="grid gap-4 xl:grid-cols-2 [&>*]:min-w-0">
                  <PopoutCard title="Offline validators" anchorId="offline-validators" modalSize="full">
                    {({ inModal }) => (
                      <MultiLineChart
                        series={offlineEntities.map((entity, i) => ({
                          name: entity,
                          data: liveness.epochs.map(
                            (e, j) =>
                              [epochTimes[j], liveness.missedByEpoch.get(e)?.get(entity) ?? 0] as [number, number]
                          ),
                          color: palette[i % palette.length],
                          showSymbol: false,
                        }))}
                        xAxis={{ type: 'time', timestamps: epochTimes, formatter: v => formatEpochTime(Number(v)) }}
                        yAxis={{ name: 'Missed per epoch', min: 0 }}
                        height={inModal ? 600 : 340}
                        showLegend
                        legendPosition="top"
                      />
                    )}
                  </PopoutCard>
                  <MissedAttestationsTable
                    missedByEntity={liveness.missedByEntity}
                    dueByEntity={liveness.dueByEntity}
                  />
                </div>
              </>
            )}
          </InspectSection>
        </div>
      )}
    </Container>
  );
}
