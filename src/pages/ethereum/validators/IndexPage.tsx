import { type JSX, useMemo, useState } from 'react';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Card } from '@/components/Layout/Card';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { Stats } from '@/components/DataDisplay/Stats';
import { StackedBar } from '@/components/Charts/StackedBar';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import type { MarkLineConfig, SeriesData } from '@/components/Charts/MultiLine';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { Toggle } from '@/components/Forms/Toggle';
import { DataTable } from '@/components/DataTable';
import type { DataTableColumn } from '@/components/DataTable';
import { Entity } from '@/components/Ethereum/Entity';
import { useForks } from '@/hooks/useForks';
import { useNetwork } from '@/hooks/useNetwork';
import { useThemeColors } from '@/hooks/useThemeColors';
import { epochToTimestamp, getDataVizColors } from '@/utils';
import {
  fctAttestationParticipationRateDailyServiceListOptions,
  fctHeadVoteCorrectnessRateDailyServiceListOptions,
  fctMissedSlotRateDailyServiceListOptions,
} from '@/api/@tanstack/react-query.gen';
import { MockBadge, TableCard, TableSearch } from './components';
import { buildOverviewDays, CREDENTIAL_TYPES, fixture, formatDayLabel } from './mocks/overview';
import type { CredentialType, OverviewDay, OverviewFixture } from './mocks/overview';
import {
  bucketDays,
  formatCompact,
  lowestSince,
  OVERVIEW_WINDOW_OPTIONS,
  sliceWindow,
  sum,
  type OverviewWindow,
} from './utils/overview';

const CREDENTIAL_LABELS: Record<CredentialType, string> = {
  '0x00': '0x00 BLS',
  '0x01': '0x01 Execution',
  '0x02': '0x02 Compounding',
};

/** ETH that can enter or leave the active set per day (256 ETH per epoch) */
const CHURN_ETH_PER_DAY = 256 * 225;

const EB_BUCKETS: { label: string; min: number; max: number }[] = [
  { label: '<32', min: 0, max: 31 },
  { label: '32', min: 32, max: 32 },
  { label: '33–63', min: 33, max: 63 },
  { label: '64–127', min: 64, max: 127 },
  { label: '128–255', min: 128, max: 255 },
  { label: '256–511', min: 256, max: 511 },
  { label: '512–1023', min: 512, max: 1023 },
  { label: '1024–2047', min: 1024, max: 2047 },
  { label: '2048', min: 2048, max: 2048 },
];

const area = (stack: string): Partial<SeriesData> => ({
  stack,
  showArea: true,
  areaOpacity: 0.85,
  lineWidth: 0,
  showSymbol: false,
});

const bar = (stack: string): Partial<SeriesData> => ({ stack, seriesType: 'bar' });

const formatEth = (v: number): string => `${formatCompact(v)} ETH`;

/**
 * Network-wide validator overview: validator set size, stake by withdrawal credential type, queues,
 * operations, rewards and duty performance.
 */
export function IndexPage(): JSX.Element {
  const navigate = useNavigate();
  const search = useSearch({ from: '/ethereum/validators/' });
  const window: OverviewWindow = search.t ?? 'all';
  const [showForks, setShowForks] = useState(true);
  const [ebMode, setEbMode] = useState<'stake' | 'validators'>('stake');
  const [mixMode, setMixMode] = useState<'stake' | 'validators'>('stake');
  const [entitySearch, setEntitySearch] = useState('');

  const themeColors = useThemeColors();
  const { CHART_CATEGORICAL_COLORS: palette } = getDataVizColors();
  const credentialColors: Record<CredentialType, string> = {
    '0x00': themeColors.muted,
    '0x01': palette[0],
    '0x02': palette[1],
  };

  const allDays = useMemo(() => buildOverviewDays(), []);
  const days = sliceWindow(allDays, window);
  const weekly = days.length > 400;
  const buckets = bucketDays(days, weekly);
  const labels = days.map(d => formatDayLabel(d.day));
  const bucketLabels = buckets.map(b => b.label);

  // --- Fork marks: nearest label on or after each fork ---
  const { allForks } = useForks();
  const { currentNetwork } = useNetwork();
  const forkMarks = (dayList: string[], labelList: string[]): MarkLineConfig[] => {
    if (!showForks || !currentNetwork) return [];
    return allForks
      .filter(f => f.name !== 'phase0')
      .flatMap(f => {
        const day = new Date(epochToTimestamp(f.epoch, currentNetwork.genesis_time) * 1000).toISOString().slice(0, 10);
        const idx = dayList.findIndex(d => d >= day);
        if (idx <= 0) return [];
        return [
          {
            xValue: labelList[idx],
            label: f.displayName,
            labelPosition: 'end' as const,
            color: '#8b5cf6',
            lineStyle: 'dashed' as const,
            lineWidth: 1,
          },
        ];
      });
  };
  const dailyForkMarks = forkMarks(
    days.map(d => d.day),
    labels
  );
  const bucketForkMarks = forkMarks(
    buckets.map(b => b.days[0].day),
    bucketLabels
  );

  // --- Snapshot (real, from a beacon state) ---
  const { snapshot } = fixture;
  const active = snapshot.byCredentialStatus.filter(r => r.status.startsWith('active_'));
  const activeByType = Object.fromEntries(
    CREDENTIAL_TYPES.map(ct => {
      const rows = active.filter(r => r.credentialType === ct);
      return [
        ct,
        {
          count: rows.reduce((a, r) => a + r.count, 0),
          stake: rows.reduce((a, r) => a + r.effectiveBalanceEth, 0),
        },
      ];
    })
  ) as Record<CredentialType, { count: number; stake: number }>;
  const activeCount = CREDENTIAL_TYPES.reduce((a, ct) => a + activeByType[ct].count, 0);
  const activeStake = CREDENTIAL_TYPES.reduce((a, ct) => a + activeByType[ct].stake, 0);
  const lowDay = lowestSince(allDays, d => d.status.active + d.status.exiting);
  const { queues } = snapshot;
  const entryEth = queues.activationQueue.effectiveBalanceEth + (queues.pendingDeposits?.amountEth ?? 0);
  const exitWaitDays = Math.max(0, ((queues.exitQueue.maxExitEpoch - snapshot.epoch) * 384) / 86_400);

  // --- Real duty performance from existing daily tables ---
  const dailyQuery = { day_start_date_like: '20%', order_by: 'day_start_date desc', page_size: 10_000 };
  const participation = useQuery(fctAttestationParticipationRateDailyServiceListOptions({ query: dailyQuery }));
  const headVote = useQuery(fctHeadVoteCorrectnessRateDailyServiceListOptions({ query: dailyQuery }));
  const missed = useQuery(fctMissedSlotRateDailyServiceListOptions({ query: dailyQuery }));
  const dutyDays = days.map(d => d.day);
  const byDay = <T extends { day_start_date?: string }>(
    rows: T[] | undefined,
    pick: (r: T) => number | undefined
  ): (number | null)[] => {
    const m = new Map(rows?.map(r => [r.day_start_date ?? '', pick(r)]));
    return dutyDays.map(d => m.get(d) ?? null);
  };
  const participationSeries = byDay(
    participation.data?.fct_attestation_participation_rate_daily,
    r => r.avg_participation_rate
  );
  const headVoteSeries = byDay(headVote.data?.fct_head_vote_correctness_rate_daily, r => r.avg_head_vote_rate);
  const missedSeries = byDay(missed.data?.fct_missed_slot_rate_daily, r => r.missed_rate);

  // Memoised: DataTable returns to page 1 whenever its data array changes
  const entities = useMemo(
    () => snapshot.topEntities.filter(e => e.entity.toLowerCase().includes(entitySearch.trim().toLowerCase())),
    [snapshot.topEntities, entitySearch]
  );

  const entityColumns: DataTableColumn<OverviewFixture['snapshot']['topEntities'][number]>[] = [
    {
      id: 'entity',
      header: 'Entity',
      accessorKey: 'entity',
      cell: ({ row }) => <Entity entity={row.original.entity} />,
      meta: { cellClassName: 'text-foreground' },
    },
    {
      id: 'validators',
      header: 'Validators',
      accessorKey: 'count',
      cell: ({ row }) => row.original.count.toLocaleString(),
      meta: { cellClassName: 'text-foreground tabular-nums' },
    },
    {
      id: 'stake',
      header: 'Stake',
      accessorKey: 'effectiveBalanceEth',
      cell: ({ row }) => formatEth(row.original.effectiveBalanceEth),
      meta: { cellClassName: 'text-foreground tabular-nums' },
    },
    {
      id: 'share',
      header: 'Share',
      accessorFn: e => e.effectiveBalanceEth / activeStake,
      cell: ({ getValue }) => `${((getValue() as number) * 100).toFixed(2)}%`,
      meta: { cellClassName: 'tabular-nums' },
    },
    {
      id: 'avg',
      header: 'Avg balance',
      accessorFn: e => e.effectiveBalanceEth / e.count,
      cell: ({ getValue }) => `${(getValue() as number).toFixed(1)} ETH`,
      meta: { cellClassName: 'tabular-nums' },
    },
    {
      id: 'mix',
      header: 'Credential mix (stake)',
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex h-2 w-48 overflow-hidden rounded-full bg-border">
          {CREDENTIAL_TYPES.map(ct => (
            <div
              key={ct}
              title={`${CREDENTIAL_LABELS[ct]}: ${formatEth(row.original.byCredential[ct].effectiveBalanceEth)}`}
              style={{
                width: `${(row.original.byCredential[ct].effectiveBalanceEth / row.original.effectiveBalanceEth) * 100}%`,
                backgroundColor: credentialColors[ct],
              }}
            />
          ))}
        </div>
      ),
    },
  ];

  return (
    <Container>
      <Header title="Validators" description="Validator set, stake, queues and rewards across the network" />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <SegmentedControl
          options={OVERVIEW_WINDOW_OPTIONS}
          value={window}
          onChange={value => navigate({ to: '/ethereum/validators', search: { t: value }, replace: true })}
          ariaLabel="Time window"
        />
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">Forks</span>
            <Toggle checked={showForks} onChange={setShowForks} size="small" />
          </div>
          <Link
            to="/ethereum/validators/inspect"
            className="rounded-xs border border-primary bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/20"
          >
            Inspect validators
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Stats
          gridClassName="grid grid-cols-2 gap-px md:grid-cols-3 xl:grid-cols-6"
          stats={[
            {
              id: 'active',
              name: 'Active validators',
              value: activeCount.toLocaleString(),
              subtitle: lowDay
                ? `Lowest since ${new Date(`${lowDay}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })}`
                : undefined,
            },
            {
              id: 'stake',
              name: 'Staked',
              value: formatEth(activeStake),
              subtitle: 'Effective balance',
            },
            {
              id: 'compounding',
              name: 'Compounding (0x02)',
              value: activeByType['0x02'].count.toLocaleString(),
              subtitle: `${((activeByType['0x02'].stake / activeStake) * 100).toFixed(1)}% of stake`,
            },
            {
              id: 'avg-eb',
              name: 'Avg effective balance',
              value: `${(activeStake / activeCount).toFixed(1)} ETH`,
            },
            {
              id: 'entry',
              name: 'Entry queue',
              value: formatEth(entryEth),
              subtitle: `~${Math.ceil(entryEth / CHURN_ETH_PER_DAY)} days`,
            },
            {
              id: 'exit',
              name: 'Exit queue',
              value: formatEth(queues.exitQueue.effectiveBalanceEth),
              subtitle:
                exitWaitDays < 1 ? `~${Math.ceil(exitWaitDays * 24)} hours` : `~${Math.ceil(exitWaitDays)} days`,
            },
          ]}
        />

        <Card
          title="Credential mix"
          actions={
            <SegmentedControl
              options={[
                { value: 'stake', label: 'Stake' },
                { value: 'validators', label: 'Validators' },
              ]}
              value={mixMode}
              onChange={setMixMode}
              ariaLabel="Credential mix measure"
            />
          }
        >
          <StackedBar
            segments={CREDENTIAL_TYPES.map(ct => ({
              name: CREDENTIAL_LABELS[ct],
              value: mixMode === 'stake' ? activeByType[ct].stake : activeByType[ct].count,
              color: credentialColors[ct],
            }))}
            showPercentages
            showLegend
            valueFormatter={v => (mixMode === 'stake' ? formatEth(v) : formatCompact(v))}
          />
        </Card>

        <PopoutCard
          title="Stake by credential type"
          anchorId="stake-by-credential"
          modalSize="full"
          headerActions={fixture.weeklyCredential.some(w => w.modelled) ? <MockBadge /> : undefined}
        >
          {({ inModal }) => (
            <MultiLineChart
              series={[
                ...CREDENTIAL_TYPES.map(ct => ({
                  name: CREDENTIAL_LABELS[ct],
                  data: days.map(d => Math.round(d.credential[ct].effectiveBalanceEth)),
                  color: credentialColors[ct],
                  ...area('stake'),
                })),
                {
                  name: 'Active validators',
                  data: days.map(d => Math.round(d.status.active + d.status.exiting)),
                  color: themeColors.foreground,
                  yAxisIndex: 1,
                  showSymbol: false,
                },
              ]}
              xAxis={{ type: 'category', labels }}
              yAxis={{ name: 'Staked ETH', min: 0 }}
              secondaryYAxis={{ name: 'Active validators', min: 0 }}
              height={inModal ? 600 : 380}
              showLegend
              legendPosition="top"
              enableDataZoom
              markLines={dailyForkMarks}
              syncGroup={inModal ? undefined : 'validators-overview'}
            />
          )}
        </PopoutCard>

        <div className="grid gap-4 xl:grid-cols-2 [&>*]:min-w-0">
          <PopoutCard title="Validators by status" anchorId="validators-by-status" modalSize="full">
            {({ inModal }) => (
              <MultiLineChart
                series={[
                  {
                    name: 'Active',
                    data: days.map(d => Math.round(d.status.active)),
                    color: themeColors.success,
                    ...area('status'),
                  },
                  {
                    name: 'Exiting',
                    data: days.map(d => Math.round(d.status.exiting)),
                    color: themeColors.warning,
                    ...area('status'),
                  },
                  {
                    name: 'Pending',
                    data: days.map(d => Math.round(d.status.pending)),
                    color: palette[0],
                    ...area('status'),
                  },
                  {
                    name: 'Exited',
                    initiallyVisible: false,
                    data: days.map(d => Math.round(d.status.exited + d.status.withdrawn)),
                    color: themeColors.muted,
                    showSymbol: false,
                    lineStyle: 'dashed',
                  },
                ]}
                xAxis={{ type: 'category', labels }}
                yAxis={{ name: 'Validators', min: 0 }}
                height={inModal ? 600 : 300}
                showLegend
                legendPosition="top"
                enableDataZoom
                markLines={dailyForkMarks}
                syncGroup={inModal ? undefined : 'validators-overview'}
              />
            )}
          </PopoutCard>

          <PopoutCard
            title="Effective balance distribution"
            anchorId="effective-balance-distribution"
            modalSize="full"
            headerActions={
              <SegmentedControl
                options={[
                  { value: 'stake', label: 'Stake' },
                  { value: 'validators', label: 'Validators' },
                ]}
                value={ebMode}
                onChange={setEbMode}
                ariaLabel="Distribution measure"
              />
            }
          >
            {({ inModal }) => (
              <MultiLineChart
                series={CREDENTIAL_TYPES.map(ct => ({
                  name: CREDENTIAL_LABELS[ct],
                  data: EB_BUCKETS.map(b =>
                    snapshot.effectiveBalanceHistogram
                      .filter(
                        h => h.credentialType === ct && h.effectiveBalanceEth >= b.min && h.effectiveBalanceEth <= b.max
                      )
                      .reduce((a, h) => a + (ebMode === 'stake' ? h.count * h.effectiveBalanceEth : h.count), 0)
                  ),
                  color: credentialColors[ct],
                  ...bar('eb'),
                }))}
                xAxis={{ type: 'category', labels: EB_BUCKETS.map(b => b.label), name: 'Effective balance (ETH)' }}
                yAxis={{ name: ebMode === 'stake' ? 'ETH' : 'Validators', min: 0 }}
                height={inModal ? 600 : 300}
                showLegend
                legendPosition="top"
              />
            )}
          </PopoutCard>
        </div>

        <div className="grid gap-4 xl:grid-cols-2 [&>*]:min-w-0">
          <PopoutCard title="Entry and exit queues" anchorId="queues" modalSize="full" headerActions={<MockBadge />}>
            {({ inModal }) => (
              <MultiLineChart
                series={[
                  {
                    name: 'Entry',
                    data: days.map(d => Math.round(d.activationQueueEth)),
                    color: themeColors.success,
                    showArea: true,
                    areaOpacity: 0.3,
                    showSymbol: false,
                  },
                  {
                    name: 'Exit',
                    data: days.map(d => -Math.round(d.exitQueueEth)),
                    color: themeColors.danger,
                    showArea: true,
                    areaOpacity: 0.3,
                    showSymbol: false,
                  },
                ]}
                xAxis={{ type: 'category', labels }}
                yAxis={{ name: 'Queued ETH', formatter: v => formatCompact(Math.abs(v)) }}
                height={inModal ? 600 : 300}
                showLegend
                legendPosition="top"
                enableDataZoom
                markLines={dailyForkMarks}
                syncGroup={inModal ? undefined : 'validators-overview'}
              />
            )}
          </PopoutCard>

          <PopoutCard
            title={weekly ? 'Validator operations per week' : 'Validator operations per day'}
            anchorId="operations"
            modalSize="full"
            headerActions={<MockBadge />}
          >
            {({ inModal }) => (
              <MultiLineChart
                series={(
                  [
                    ['New deposits', d => d.ops.deposits, palette[0]],
                    ['Top-ups', d => d.ops.topUps, palette[4]],
                    ['Consolidations', d => d.ops.consolidations, palette[1]],
                    ['Switch to 0x02', d => d.ops.switchToCompounding, palette[10]],
                    ['Partial withdrawal requests', d => d.ops.partialWithdrawalRequests, palette[2]],
                    ['Exit requests (EL)', d => d.ops.fullExitRequests, palette[6]],
                    ['Voluntary exits', d => d.ops.voluntaryExits, palette[3]],
                  ] as [string, (d: OverviewDay) => number, string][]
                ).map(([name, pick, color]) => ({
                  name,
                  data: buckets.map(b => sum(b.days, pick)),
                  color,
                  ...bar('ops'),
                }))}
                xAxis={{ type: 'category', labels: bucketLabels }}
                yAxis={{ name: 'Operations', min: 0 }}
                height={inModal ? 600 : 300}
                showLegend
                legendPosition="top"
                enableDataZoom
                markLines={bucketForkMarks}
              />
            )}
          </PopoutCard>
        </div>

        <div className="grid gap-4 xl:grid-cols-2 [&>*]:min-w-0">
          <PopoutCard
            title={weekly ? 'ETH in and out per week' : 'ETH in and out per day'}
            anchorId="flows"
            modalSize="full"
            headerActions={<MockBadge />}
          >
            {({ inModal }) => (
              <MultiLineChart
                series={[
                  {
                    name: 'Deposited',
                    data: buckets.map(b => Math.round(sum(b.days, d => d.flows.depositedEth))),
                    color: themeColors.success,
                    ...bar('flows'),
                  },
                  {
                    name: 'Reward skims',
                    data: buckets.map(b => -Math.round(sum(b.days, d => d.flows.skimmedEth))),
                    color: palette[2],
                    ...bar('flows'),
                  },
                  {
                    name: 'Full withdrawals',
                    data: buckets.map(b => -Math.round(sum(b.days, d => d.flows.fullWithdrawnEth))),
                    color: themeColors.danger,
                    ...bar('flows'),
                  },
                  {
                    name: 'Net',
                    data: buckets.map(b =>
                      Math.round(sum(b.days, d => d.flows.depositedEth - d.flows.skimmedEth - d.flows.fullWithdrawnEth))
                    ),
                    color: themeColors.foreground,
                    showSymbol: false,
                  },
                ]}
                xAxis={{ type: 'category', labels: bucketLabels }}
                yAxis={{ name: 'ETH' }}
                height={inModal ? 600 : 300}
                showLegend
                legendPosition="top"
                enableDataZoom
                markLines={bucketForkMarks}
              />
            )}
          </PopoutCard>

          <PopoutCard
            title={weekly ? 'Consensus rewards per week' : 'Consensus rewards per day'}
            anchorId="rewards"
            modalSize="full"
            headerActions={<MockBadge />}
          >
            {({ inModal }) => (
              <MultiLineChart
                series={[
                  {
                    name: 'Attestations',
                    data: buckets.map(b => Math.round(sum(b.days, d => d.rewards.attestationEth))),
                    color: palette[0],
                    ...bar('rewards'),
                  },
                  {
                    name: 'Proposals',
                    data: buckets.map(b => Math.round(sum(b.days, d => d.rewards.proposerEth))),
                    color: palette[7],
                    ...bar('rewards'),
                  },
                  {
                    name: 'Sync committee',
                    data: buckets.map(b => Math.round(sum(b.days, d => d.rewards.syncEth))),
                    color: palette[4],
                    ...bar('rewards'),
                  },
                  {
                    name: 'Penalties',
                    data: buckets.map(b => -Math.round(sum(b.days, d => d.rewards.penaltiesEth))),
                    color: themeColors.danger,
                    ...bar('rewards'),
                  },
                  {
                    name: 'APR',
                    data: buckets.map(b => {
                      const stake = CREDENTIAL_TYPES.reduce(
                        (a, ct) => a + b.last.credential[ct].effectiveBalanceEth,
                        0
                      );
                      const r = sum(
                        b.days,
                        d =>
                          d.rewards.attestationEth + d.rewards.proposerEth + d.rewards.syncEth - d.rewards.penaltiesEth
                      );
                      return Number(((((r / b.days.length) * 365) / stake) * 100).toFixed(2));
                    }),
                    color: themeColors.foreground,
                    yAxisIndex: 1,
                    showSymbol: false,
                  },
                ]}
                xAxis={{ type: 'category', labels: bucketLabels }}
                yAxis={{ name: 'ETH' }}
                secondaryYAxis={{ name: 'APR', formatter: v => `${v}%` }}
                height={inModal ? 600 : 300}
                showLegend
                legendPosition="top"
                enableDataZoom
                markLines={bucketForkMarks}
              />
            )}
          </PopoutCard>
        </div>

        <PopoutCard title="Duty performance" anchorId="duty-performance" modalSize="full">
          {({ inModal }) => (
            <MultiLineChart
              series={[
                {
                  name: 'Attestation participation',
                  data: participationSeries,
                  color: palette[0],
                  showSymbol: false,
                },
                { name: 'Head vote correct', data: headVoteSeries, color: palette[1], showSymbol: false },
                {
                  name: 'Missed slots',
                  data: missedSeries,
                  color: themeColors.danger,
                  showSymbol: false,
                  yAxisIndex: 1,
                },
              ]}
              xAxis={{ type: 'category', labels }}
              yAxis={{ name: 'Rate (%)', min: 'dataMin', max: 100 }}
              secondaryYAxis={{ name: 'Missed (%)', min: 0 }}
              height={inModal ? 600 : 280}
              showLegend
              legendPosition="top"
              enableDataZoom
              connectNulls
              markLines={dailyForkMarks}
              syncGroup={inModal ? undefined : 'validators-overview'}
            />
          )}
        </PopoutCard>

        <TableCard
          title="Entities by stake"
          filters={<TableSearch value={entitySearch} onChange={setEntitySearch} placeholder="Search entities" />}
        >
          <DataTable
            data={entities}
            columns={entityColumns}
            pageSize={10}
            hideGlobalFilter
            hideColumnVisibility
            getRowId={e => e.entity}
            emptyMessage="No entities match this search"
          />
        </TableCard>
      </div>
    </Container>
  );
}
