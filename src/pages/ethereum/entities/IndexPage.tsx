import { useMemo, useState, type JSX } from 'react';
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

import { EntitiesSkeleton } from './components/EntitiesSkeleton';
import { EntitiesTable } from './components/EntitiesTable';
import { NetworkGap } from './components/NetworkGap';
import { PerformanceStats } from './components/PerformanceStats';
import { StakeMovers } from './components/StakeMovers';
import { AGGREGATE_ENTITIES, ENTITIES_WINDOW_OPTIONS, type EntitiesWindow } from './constants';
import { useEntityPerformance, useEntityStake, useStakeShareHistory } from './hooks';
import { dayOf, entitiesToReach } from './utils/overview';
import { entityLabel, groupCounts, groupMembers, groupName, groupStakes } from './utils/groups';
import { formatPeriod } from './utils/performance';

/** Entities drawn as their own band in the stake share chart */
const SHARE_CHART_ENTITIES = 10;

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
 * Entities overview over one time range: concentration now and where it started, stake share over time, movers and
 * proposer clients; then how the network performed and how the largest entities compare with it; then every entity
 * by stake, attestations or proposals.
 */
export function IndexPage(): JSX.Element {
  const navigate = useNavigate();
  const search = useSearch({ from: '/ethereum/entities/' });
  const window: EntitiesWindow = search.t ?? 'all';
  const [shareMode, setShareMode] = useState<'share' | 'stake'>('share');

  const { CHART_CATEGORICAL_COLORS: palette, DATA_COLORS } = getDataVizColors();
  const { currentNetwork } = useNetwork();
  const { allForks } = useForks();

  const stake = useEntityStake(window);
  const { totalStakeEth, firstDay, latestDay, startDay } = stake;
  const performance = useEntityPerformance(window);
  // Lido's operators count as one entity everywhere below; its row in the table expands to them
  const entities = useMemo(() => groupStakes(stake.entities), [stake.entities]);
  const counts = useMemo(() => groupCounts(performance.entities), [performance.entities]);
  const members = useMemo(() => groupMembers(stake.entities), [stake.entities]);

  // Named operators only: the aggregate buckets hold unrelated validators
  const named = entities.filter(e => e.validators > 0 && !AGGREGATE_ENTITIES.has(e.entity));
  const chartEntities = named.slice(0, SHARE_CHART_ENTITIES).map(e => e.entity);
  const history = useStakeShareHistory(chartEntities, firstDay, latestDay);
  const labels = history.days.map(formatDayLabel);

  // --- Concentration at the window's end and start, against all stake ---
  const largest = named[0];
  const now = concentration(
    named.map(e => e.stakeEth),
    totalStakeEth
  );
  const startTotalEth = entities.reduce((sum, e) => sum + e.startEth, 0);
  // Every named entity with stake on the start day, including those with none today
  const start = concentration(
    entities.filter(e => !AGGREGATE_ENTITIES.has(e.entity)).map(e => e.startEth),
    startTotalEth
  );
  // The same figures with Lido's operators counted separately, for the note under the stats
  const ungrouped = concentration(
    stake.entities.filter(e => e.validators > 0 && !AGGREGATE_ENTITIES.has(e.entity)).map(e => e.stakeEth),
    totalStakeEth
  );
  const from = (value: string | undefined): string | undefined =>
    startDay && startDay !== latestDay && value !== undefined ? `From ${value}` : undefined;

  const stakeWindow = startDay && latestDay ? `${formatDayLabel(startDay)} to ${formatDayLabel(latestDay)}` : '';
  const performanceWindow =
    performance.start !== undefined && performance.end !== undefined
      ? formatPeriod(performance.start, performance.end)
      : '';

  // --- Fork marks on the nearest plotted day on or after each fork ---
  const forkMarks: MarkLineConfig[] = currentNetwork
    ? allForks
        .filter(f => f.name !== 'phase0')
        .flatMap(f => {
          const idx = history.days.findIndex(d => d >= dayOf(epochToTimestamp(f.epoch, currentNetwork.genesis_time)));
          const dayLabel = labels[idx];
          if (idx <= 0 || dayLabel === undefined) return [];
          return [
            {
              xValue: dayLabel,
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
    name: entityLabel(entity),
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
      <Header title="Entities" description="Who runs Ethereum's validators, and how well they perform" />

      <SegmentedControl
        options={ENTITIES_WINDOW_OPTIONS}
        value={window}
        onChange={value =>
          navigate({ to: '/ethereum/entities', search: { ...search, t: value }, replace: true, resetScroll: false })
        }
        ariaLabel="Time range"
        className="mb-6"
      />

      {stake.error && <Alert variant="error" title="Could not load entities" description={stake.error.message} />}
      {!stake.error && stake.isLoading && <EntitiesSkeleton />}
      {!stake.error && !stake.isLoading && named.length === 0 && (
        <Alert variant="info" title="No entity data for this network" />
      )}

      {!stake.error && !stake.isLoading && largest && (
        <div className="flex flex-col gap-10">
          <InspectSection title="Stake" meta={stakeWindow || undefined}>
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
                  value: groupName(largest.entity) ?? largest.entity,
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
            <p className="-mt-2 text-xs/5 text-muted">
              Lido&apos;s operators count as one entity. Counted separately: {ungrouped.entities.toLocaleString()}{' '}
              entities, {ungrouped.halt?.count.toLocaleString() ?? '-'} to halt finality,{' '}
              {ungrouped.majority?.count.toLocaleString() ?? '-'} to finalize.
            </p>

            <PopoutCard
              title="Stake by entity"
              subtitle={`Active effective balance of the ${SHARE_CHART_ENTITIES} largest entities, daily snapshots`}
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
                  <LoadingContainer className="h-100 w-full rounded-sm" shimmer={false} />
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

            <StakeMovers entities={entities} window={stakeWindow} />
          </InspectSection>

          <InspectSection
            title="Performance"
            meta={performanceWindow ? `Whole network, ${performanceWindow}` : undefined}
          >
            {performance.error ? (
              <Alert variant="error" title="Could not load performance" description={performance.error.message} />
            ) : performance.isLoading ? (
              <LoadingContainer className="h-96 w-full rounded-sm" shimmer={false} />
            ) : (
              <>
                <PerformanceStats network={performance.network} />
                <NetworkGap
                  entities={named.map(e => e.entity)}
                  counts={counts}
                  network={performance.network}
                  window={performanceWindow}
                />
              </>
            )}
          </InspectSection>

          <EntitiesTable
            entities={entities}
            totalStakeEth={totalStakeEth}
            performance={counts}
            network={performance.network}
            stakeWindow={stakeWindow}
            performanceWindow={performanceWindow}
            members={members}
            memberPerformance={performance.entities}
          />
        </div>
      )}
    </Container>
  );
}
