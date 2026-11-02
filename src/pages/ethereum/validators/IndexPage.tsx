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
import { Alert } from '@/components/Feedback/Alert';
import { TableCard, TableSearch, ValidatorsSkeleton } from './components';
import { useOverviewData } from './hooks/useOverviewData';
import type { OverviewPeriod } from './hooks/useOverviewData';
import {
  CREDENTIAL_TYPES,
  formatCompact,
  formatDayLabel,
  lowestSince,
  OVERVIEW_WINDOW_OPTIONS,
  type CredentialType,
  type OverviewWindow,
} from './utils/overview';

const CREDENTIAL_LABELS: Record<CredentialType, string> = {
  '0x00': '0x00 BLS',
  '0x01': '0x01 Execution',
  '0x02': '0x02 Compounding',
};

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

interface EntityRow {
  entity: string;
  count: number;
  effectiveBalanceEth: number;
  byCredential: Record<CredentialType, { effectiveBalanceEth: number }>;
}

/** True when the operations table covers the period */
const hasOps = (d: OverviewPeriod): boolean => Object.keys(d.ops).length > 0;

/** An operation's count for the period; null when the operations table doesn't cover it */
const opCount = (d: OverviewPeriod, name: string): number | null => (hasOps(d) ? (d.ops[name]?.count ?? 0) : null);

/** ETH in minus ETH out for the period, rounded; null when the operations table doesn't cover it */
const flow = (d: OverviewPeriod, ins: string[], outs: string[]): number | null => {
  if (!hasOps(d)) return null;
  const total = (names: string[]): number => names.reduce((a, n) => a + (d.ops[n]?.amountEth ?? 0), 0);
  return Math.round(total(ins) - total(outs));
};

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
  const { CHART_CATEGORICAL_COLORS: palette, DATA_COLORS } = getDataVizColors();
  const credentialColors: Record<CredentialType, string> = {
    '0x00': themeColors.muted,
    '0x01': palette[0],
    '0x02': palette[1],
  };

  const { period, periods: days, snapshot, isLoading, error } = useOverviewData(window);
  const weekly = period === 'week';
  const labels = days.map(d => formatDayLabel(d.day));
  const perPeriod = weekly ? 'per week' : 'per day';
  // Some tables start inside long windows; say where, rather than leave the early periods blank
  const dataStart = (has: (d: OverviewPeriod) => boolean): string | undefined => {
    const first = days.find(has)?.day;
    if (!first || first === days[0].day) return undefined;
    const date = new Date(`${first}T00:00:00Z`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    });
    return `Data starts ${date}`;
  };
  const opsStart = dataStart(hasOps);

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
            color: DATA_COLORS.violet,
            lineStyle: 'dashed' as const,
            lineWidth: 1,
          },
        ];
      });
  };
  const periodForkMarks = forkMarks(
    days.map(d => d.day),
    labels
  );

  // --- Latest snapshot ---
  const activeByType =
    snapshot?.byType ??
    (Object.fromEntries(CREDENTIAL_TYPES.map(ct => [ct, { count: 0, stake: 0 }])) as Record<
      CredentialType,
      { count: number; stake: number }
    >);
  const activeCount = CREDENTIAL_TYPES.reduce((a, ct) => a + activeByType[ct].count, 0);
  const activeStake = CREDENTIAL_TYPES.reduce((a, ct) => a + activeByType[ct].stake, 0);
  const lowDay = lowestSince(days, d => d.status.active + d.status.exiting);
  const queue = snapshot?.queue;
  const entryEth = queue
    ? ((queue.activation_queue_effective_balance ?? 0) + (queue.pending_deposit_amount ?? 0)) / 1e9
    : null;
  const exitEth = queue ? (queue.exit_queue_effective_balance ?? 0) / 1e9 : null;

  // --- Real duty performance from existing daily tables ---
  const dailyQuery = { day_start_date_like: '20%', order_by: 'day_start_date desc', page_size: 10_000 };
  const participation = useQuery(fctAttestationParticipationRateDailyServiceListOptions({ query: dailyQuery }));
  const headVote = useQuery(fctHeadVoteCorrectnessRateDailyServiceListOptions({ query: dailyQuery }));
  const missed = useQuery(fctMissedSlotRateDailyServiceListOptions({ query: dailyQuery }));
  // Network-level daily rates: one row per day, plotted on their own daily axis
  const firstDay = days[0]?.day ?? '';
  const dutyDays = [
    ...new Set(
      (participation.data?.fct_attestation_participation_rate_daily ?? [])
        .map(r => r.day_start_date ?? '')
        .filter(d => d >= firstDay)
    ),
  ].sort();
  const dutyLabels = dutyDays.map(formatDayLabel);
  const dutyForkMarks = forkMarks(dutyDays, dutyLabels);
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
  const entities = useMemo(() => {
    const byEntity = new Map<string, EntityRow>();
    for (const r of snapshot?.entities ?? []) {
      const name = r.entity ?? 'unknown';
      const row =
        byEntity.get(name) ??
        ({
          entity: name,
          count: 0,
          effectiveBalanceEth: 0,
          byCredential: Object.fromEntries(CREDENTIAL_TYPES.map(ct => [ct, { effectiveBalanceEth: 0 }])),
        } as EntityRow);
      const stake = (r.active_effective_balance ?? 0) / 1e9;
      row.count += r.active_validator_count ?? 0;
      row.effectiveBalanceEth += stake;
      const ct = r.credential_type as CredentialType;
      if (row.byCredential[ct]) row.byCredential[ct].effectiveBalanceEth += stake;
      byEntity.set(name, row);
    }
    const query = entitySearch.trim().toLowerCase();
    return [...byEntity.values()]
      .filter(e => e.entity.toLowerCase().includes(query))
      .sort((a, b) => b.effectiveBalanceEth - a.effectiveBalanceEth);
  }, [snapshot?.entities, entitySearch]);

  const entityColumns: DataTableColumn<EntityRow>[] = [
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

      {error && <Alert variant="error" title="Could not load validator data" description={error.message} />}
      {!error && (isLoading || !snapshot) && <ValidatorsSkeleton />}

      {!error && !isLoading && snapshot && (
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
                value: entryEth === null ? '—' : formatEth(entryEth),
              },
              {
                id: 'exit',
                name: 'Exit queue',
                value: exitEth === null ? '—' : formatEth(exitEth),
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

          <PopoutCard title="Stake by credential type" anchorId="stake-by-credential" modalSize="full">
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
                markLines={periodForkMarks}
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
                      data: days.map(d => Math.round(d.status.exited)),
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
                  markLines={periodForkMarks}
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
                      (snapshot?.histogram ?? [])
                        .filter(
                          h =>
                            h.credential_type === ct &&
                            (h.effective_balance_eth ?? 0) >= b.min &&
                            (h.effective_balance_eth ?? 0) <= b.max
                        )
                        .reduce(
                          (a, h) =>
                            a +
                            (ebMode === 'stake'
                              ? (h.validator_count ?? 0) * (h.effective_balance_eth ?? 0)
                              : (h.validator_count ?? 0)),
                          0
                        )
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
            <PopoutCard title="Entry and exit queues" anchorId="queues" modalSize="full">
              {({ inModal }) => (
                <MultiLineChart
                  series={[
                    {
                      name: 'Entry',
                      data: days.map(d => (d.activationQueueEth === null ? null : Math.round(d.activationQueueEth))),
                      color: themeColors.success,
                      showArea: true,
                      areaOpacity: 0.3,
                      showSymbol: false,
                    },
                    {
                      name: 'Exit',
                      data: days.map(d => (d.exitQueueEth === null ? null : -Math.round(d.exitQueueEth))),
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
                  markLines={periodForkMarks}
                  syncGroup={inModal ? undefined : 'validators-overview'}
                />
              )}
            </PopoutCard>

            <PopoutCard
              title={`Validator operations ${perPeriod}`}
              subtitle={opsStart}
              anchorId="operations"
              modalSize="full"
            >
              {({ inModal }) => (
                <MultiLineChart
                  series={(
                    [
                      ['New deposits', d => opCount(d, 'deposit'), palette[0]],
                      ['Top-ups', d => opCount(d, 'top_up'), palette[4]],
                      ['Consolidations', d => opCount(d, 'consolidation'), palette[1]],
                      ['Switch to 0x02', d => opCount(d, 'switch_to_compounding'), palette[10]],
                      ['Partial withdrawal requests', d => opCount(d, 'withdrawal_request'), palette[2]],
                      ['Exit requests (EL)', d => opCount(d, 'exit_request'), palette[6]],
                      ['Voluntary exits', d => opCount(d, 'voluntary_exit'), palette[3]],
                    ] as [string, (d: OverviewPeriod) => number | null, string][]
                  ).map(([name, pick, color]) => ({
                    name,
                    data: days.map(pick),
                    color,
                    ...bar('ops'),
                  }))}
                  xAxis={{ type: 'category', labels }}
                  yAxis={{ name: 'Operations', min: 0 }}
                  height={inModal ? 600 : 300}
                  showLegend
                  legendPosition="top"
                  enableDataZoom
                  markLines={periodForkMarks}
                />
              )}
            </PopoutCard>
          </div>

          <div className="grid gap-4 xl:grid-cols-2 [&>*]:min-w-0">
            <PopoutCard title={`ETH in and out ${perPeriod}`} subtitle={opsStart} anchorId="flows" modalSize="full">
              {({ inModal }) => (
                <MultiLineChart
                  series={[
                    {
                      name: 'Deposited',
                      data: days.map(d => flow(d, ['deposit', 'top_up'], [])),
                      color: themeColors.success,
                      ...bar('flows'),
                    },
                    {
                      name: 'Reward skims',
                      data: days.map(d => flow(d, [], ['withdrawal_partial'])),
                      color: palette[2],
                      ...bar('flows'),
                    },
                    {
                      name: 'Full withdrawals',
                      data: days.map(d => flow(d, [], ['withdrawal_full'])),
                      color: themeColors.danger,
                      ...bar('flows'),
                    },
                    {
                      name: 'Net',
                      data: days.map(d => flow(d, ['deposit', 'top_up'], ['withdrawal_partial', 'withdrawal_full'])),
                      color: themeColors.foreground,
                      showSymbol: false,
                    },
                  ]}
                  xAxis={{ type: 'category', labels }}
                  yAxis={{ name: 'ETH' }}
                  height={inModal ? 600 : 300}
                  showLegend
                  legendPosition="top"
                  enableDataZoom
                  markLines={periodForkMarks}
                />
              )}
            </PopoutCard>

            <PopoutCard
              title={`Consensus rewards ${perPeriod}`}
              subtitle={dataStart(d => d.rewards !== null)}
              anchorId="rewards"
              modalSize="full"
            >
              {({ inModal }) => (
                <MultiLineChart
                  series={[
                    {
                      name: 'Attestations',
                      data: days.map(d => (d.rewards ? Math.round(d.rewards.attestationEth) : null)),
                      color: palette[0],
                      ...bar('rewards'),
                    },
                    {
                      name: 'Proposals',
                      data: days.map(d => (d.rewards ? Math.round(d.rewards.proposerEth) : null)),
                      color: palette[7],
                      ...bar('rewards'),
                    },
                    {
                      name: 'Sync committee',
                      data: days.map(d => (d.rewards ? Math.round(d.rewards.syncEth) : null)),
                      color: palette[4],
                      ...bar('rewards'),
                    },
                    {
                      name: 'Penalties',
                      data: days.map(d => (d.rewards ? -Math.round(d.rewards.penaltiesEth) : null)),
                      color: themeColors.danger,
                      ...bar('rewards'),
                    },
                    {
                      name: 'APR',
                      data: days.map(d => {
                        const stake = CREDENTIAL_TYPES.reduce((a, ct) => a + d.credential[ct].effectiveBalanceEth, 0);
                        if (!d.rewards || !stake) return null;
                        const r =
                          d.rewards.attestationEth + d.rewards.proposerEth + d.rewards.syncEth - d.rewards.penaltiesEth;
                        return Number(((((r / d.dayCount) * 365) / stake) * 100).toFixed(2));
                      }),
                      color: themeColors.foreground,
                      yAxisIndex: 1,
                      showSymbol: false,
                    },
                  ]}
                  xAxis={{ type: 'category', labels }}
                  yAxis={{ name: 'ETH' }}
                  secondaryYAxis={{ name: 'APR', formatter: v => `${v}%` }}
                  height={inModal ? 600 : 300}
                  showLegend
                  legendPosition="top"
                  enableDataZoom
                  markLines={periodForkMarks}
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
                xAxis={{ type: 'category', labels: dutyLabels }}
                yAxis={{ name: 'Rate (%)', min: 'dataMin', max: 100 }}
                secondaryYAxis={{ name: 'Missed (%)', min: 0 }}
                height={inModal ? 600 : 280}
                showLegend
                legendPosition="top"
                enableDataZoom
                connectNulls
                markLines={dutyForkMarks}
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
      )}
    </Container>
  );
}
