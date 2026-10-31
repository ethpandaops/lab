import { type JSX, Fragment, useMemo, useState } from 'react';
import clsx from 'clsx';
import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Checkbox } from '@/components/Forms/Checkbox';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { Stats } from '@/components/DataDisplay/Stats';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import { ScatterAndLineChart } from '@/components/Charts/ScatterAndLine';
import { BoxPlot } from '@/components/Charts/BoxPlot';
import { Sparkline } from '@/components/Charts/Sparkline';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { getExecutionClientColor } from '@/utils';
import { ReferenceNodesInfoDialog } from '@/pages/ethereum/execution/timings/components/ReferenceNodesInfoDialog';
import { usePerformanceData } from './hooks/usePerformanceData';
import { useOpcodeCostData } from './hooks/useOpcodeCostData';
import { DEFAULT_TIME_RANGE, PER_SLOT_CHART_RANGES, TIME_RANGE_CONFIG, type TimeRange } from './IndexPage.types';
import {
  GAS_BUCKET_MGAS,
  RESOURCES,
  buildClientPerformance,
  bucketedThroughputSeries,
  chainDemand,
  gasCeiling,
  hourlyThroughputSeries,
  versionRows,
  type ClientPerformance,
  type SlowBlock,
  type VersionRow,
} from './utils/performance';
import { OpcodePricingCard, OpcodeVersionsCard } from './components/OpcodeCosts';
import { MethodologyButton, MethodologyDialog, type MethodologySection } from './components/MethodologyDialog';

const PERCENTILE_OPTIONS = [
  { value: 'avg', label: 'Avg' },
  { value: 'p95', label: 'P95' },
] as const;

const BUDGET_OPTIONS = [
  { value: '500', label: '500 ms' },
  { value: '1000', label: '1 s' },
  { value: '2000', label: '2 s' },
  { value: '3000', label: '3 s' },
] as const;

/** Format Mgas/s with no decimals above 100 */
function fmtMgas(value: number): string {
  return value >= 100 ? Math.round(value).toLocaleString() : value.toFixed(1);
}

/** Format a gas amount given in Mgas as "60M" / "1.2B" */
function fmtGasM(mgas: number): string {
  if (mgas === 0) return '0';
  if (mgas >= 1000) return `${(mgas / 1000).toFixed(mgas >= 10000 ? 0 : 1)}B`;
  return `${Math.round(mgas)}M`;
}

function fmtPct(value: number): string {
  const rounded = Math.round(value) || 0;
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

function timeFormatter(timeRange: TimeRange): (value: number | string) => string {
  return value => {
    const date = new Date(Number(value));
    if (timeRange === '7days' || timeRange === '31days') {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
}

/** Diverging cell background: blue for faster, red for slower, scaled to ±limit */
function divergingStyle(value: number | undefined, limit: number): React.CSSProperties {
  if (value === undefined) return {};
  const strength = Math.min(1, Math.abs(value) / limit);
  const color = value >= 0 ? 'var(--color-chart-0)' : 'var(--color-chart-3)';
  return { backgroundColor: `color-mix(in oklab, ${color} ${Math.round(strength * 70)}%, transparent)` };
}

/**
 * Execution performance page: the time range, reference node filter and page header around
 * the performance sections.
 */
export function IndexPage(): JSX.Element {
  const navigate = useNavigate({ from: '/ethereum/execution/performance' });
  const { range, refNodes } = useSearch({ from: '/ethereum/execution/performance' });
  const timeRange: TimeRange = range ?? DEFAULT_TIME_RANGE;
  const referenceNodesOnly = refNodes ?? true;
  const [showRefNodeInfo, setShowRefNodeInfo] = useState(false);

  return (
    <Container>
      <Header title="Execution Performance" description="Execution throughput, cost and opcode pricing per client" />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          options={(Object.keys(TIME_RANGE_CONFIG) as TimeRange[]).map(r => ({
            value: r,
            label: TIME_RANGE_CONFIG[r].label,
          }))}
          value={timeRange}
          onChange={r => navigate({ search: prev => ({ ...prev, range: r }), replace: true })}
          ariaLabel="Time window"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              navigate({ search: prev => ({ ...prev, refNodes: !referenceNodesOnly || undefined }), replace: true })
            }
            className="flex cursor-pointer items-center gap-2"
          >
            <Checkbox checked={referenceNodesOnly} onChange={() => undefined} />
            <span className="text-sm text-foreground">Reference nodes only</span>
          </button>
          <button
            onClick={() => setShowRefNodeInfo(true)}
            className="rounded-xs p-0.5 text-muted transition-colors hover:text-foreground"
            aria-label="Learn more about reference nodes"
          >
            <InformationCircleIcon className="size-4" />
          </button>
        </div>
      </div>

      <ReferenceNodesInfoDialog open={showRefNodeInfo} onClose={() => setShowRefNodeInfo(false)} />

      <PerformanceSections timeRange={timeRange} referenceNodesOnly={referenceNodesOnly} />
    </Container>
  );
}

/**
 * Turns engine_newPayload timings plus block gas into execution throughput (Mgas/s), per-client
 * cost models, gas limit headroom, workload sensitivity and opcode pricing.
 */
function PerformanceSections({
  timeRange,
  referenceNodesOnly,
}: {
  timeRange: TimeRange;
  referenceNodesOnly: boolean;
}): JSX.Element {
  const [percentile, setPercentile] = useState<'avg' | 'p95'>('avg');
  const [budget, setBudget] = useState<(typeof BUDGET_OPTIONS)[number]['value']>('1000');
  const [ceilingBasis, setCeilingBasis] = useState<'p50' | 'p95'>('p95');
  const [methodology, setMethodology] = useState<MethodologySection | null>(null);
  const [lastMethodology, setLastMethodology] = useState<MethodologySection>('throughput');
  const openMethodology = (section: MethodologySection): void => {
    setLastMethodology(section);
    setMethodology(section);
  };
  const opcodeCosts = useOpcodeCostData(timeRange);

  const { data: perf } = usePerformanceData({ timeRange, referenceNodesOnly, enabled: true });
  const usePerSlotTrend = PER_SLOT_CHART_RANGES.includes(timeRange);

  const model = useMemo(
    () => (perf ? buildClientPerformance(perf.perClientBlocks, perf.blocks, perf.resourceGas) : null),
    [perf]
  );

  const demand = perf ? chainDemand(perf.gasUsedHourly) : 0;
  const gasLimitM = perf?.blocks.length
    ? perf.blocks.reduce((s, b) => s + (b.gas_limit ?? 0), 0) / perf.blocks.length / 1e6
    : 60;

  const trend = useMemo(() => {
    if (usePerSlotTrend) {
      return perf ? bucketedThroughputSeries(perf.perClientBlocks, timeRange === '1hour' ? 60 : 300, percentile) : [];
    }
    return perf ? hourlyThroughputSeries(perf.perClientHourly, percentile) : [];
  }, [usePerSlotTrend, perf, timeRange, percentile]);

  const versions = useMemo(() => (perf ? versionRows(perf.perClientHourly) : []), [perf]);

  if (!perf || !model) {
    return (
      <div className="flex flex-col gap-6">
        <div className="h-24 animate-pulse rounded-sm bg-surface outline -outline-offset-1 outline-border" />
        <div className="h-96 animate-pulse rounded-sm bg-surface outline -outline-offset-1 outline-border" />
      </div>
    );
  }

  const { clients, slowBlocks } = model;
  const fastest = clients[0];
  const slowest = clients[clients.length - 1];
  const budgetMs = Number(budget);
  const ceilings = clients
    .map(c => ({ client: c, mgas: gasCeiling(ceilingBasis === 'p50' ? c.fitP50 : c.fitP95, budgetMs) }))
    .sort((a, b) => b.mgas - a.mgas);
  const networkCeiling = ceilings[ceilings.length - 1];
  const blockWindowLabel = `${Math.round(perf.blockWindowSeconds / 3600)}h`;

  return (
    <div className="flex flex-col gap-6">
      <MethodologyDialog
        open={methodology !== null}
        section={methodology ?? lastMethodology}
        onClose={() => setMethodology(null)}
      />

      <Stats
        gridClassName="grid grid-cols-1 sm:grid-cols-2 sm:*:last:col-span-2 lg:grid-cols-3 xl:grid-cols-5 xl:*:last:col-span-1"
        stats={[
          {
            id: 'fastest',
            name: 'Fastest client',
            value: `${fmtMgas(fastest.throughput)} Mgas/s`,
            subtitle: <ClientInline client={fastest.client} />,
          },
          {
            id: 'slowest',
            name: 'Slowest client',
            value: `${fmtMgas(slowest.throughput)} Mgas/s`,
            subtitle: <ClientInline client={slowest.client} />,
          },
          {
            id: 'demand',
            name: 'Chain demand',
            value: demand > 0 ? `${demand.toFixed(2)} Mgas/s` : '–',
            subtitle: `${fmtGasM(gasLimitM)} gas limit every ${12}s`,
          },
          {
            id: 'headroom',
            name: 'Headroom',
            value: demand > 0 ? `${Math.round(slowest.throughput / demand)}×` : '–',
            subtitle: 'Slowest client vs chain demand',
          },
          {
            id: 'ceiling',
            name: `Gas limit ceiling · ${BUDGET_OPTIONS.find(b => b.value === budget)?.label}`,
            value: fmtGasM(networkCeiling.mgas),
            subtitle: `${(networkCeiling.mgas / gasLimitM).toFixed(1)}× today, set by ${networkCeiling.client.client}`,
          },
        ]}
      />

      {/* Throughput over time */}
      <PopoutCard
        title="Execution Throughput"
        subtitle={`Gas executed per second of engine_newPayload, ${usePerSlotTrend ? (timeRange === '1hour' ? 'per minute' : 'per 5 minutes') : 'hourly'}`}
        anchorId="throughput"
        modalSize="full"
        headerActions={
          <div className="flex flex-wrap items-center gap-2">
            <MethodologyButton onClick={() => openMethodology('throughput')} />
            <SegmentedControl
              ariaLabel="Percentile"
              options={PERCENTILE_OPTIONS}
              value={percentile}
              onChange={setPercentile}
            />
          </div>
        }
      >
        {({ inModal }) => (
          <MultiLineChart
            series={trend.map((s, i) => ({
              name: s.client,
              data: s.points,
              color: getExecutionClientColor(s.client, i),
            }))}
            xAxis={{
              type: 'value',
              name: 'Time',
              min: 'dataMin',
              max: 'dataMax',
              formatter: timeFormatter(timeRange),
            }}
            yAxis={{ name: percentile === 'avg' ? 'Mgas/s' : 'P95 Mgas/s', min: 0 }}
            height={inModal ? 600 : 340}
            showLegend
            enableDataZoom
            tooltipFormatter={params => throughputTooltip(params)}
          />
        )}
      </PopoutCard>

      {/* Gas limit ceiling */}
      <PopoutCard
        title="Gas Limit Ceiling"
        subtitle={`Largest block each client executes inside the budget, extrapolated from its cost model (last ${blockWindowLabel})`}
        anchorId="gas-ceiling"
        modalSize="full"
        headerActions={
          <div className="flex flex-wrap items-center gap-2">
            <MethodologyButton onClick={() => openMethodology('cost-model')} />
            <SegmentedControl
              ariaLabel="Execution budget"
              options={BUDGET_OPTIONS}
              value={budget}
              onChange={setBudget}
            />
            <SegmentedControl
              ariaLabel="Node percentile"
              options={[
                { value: 'p50', label: 'Typical node' },
                { value: 'p95', label: 'Slow node' },
              ]}
              value={ceilingBasis}
              onChange={setCeilingBasis}
            />
          </div>
        }
      >
        <GasCeiling ceilings={ceilings} gasLimitM={gasLimitM} basis={ceilingBasis} />
      </PopoutCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Cost model */}
        <PopoutCard
          title="Cost Model"
          subtitle="Fixed overhead plus marginal cost per Mgas, fitted to every block"
          headerActions={<MethodologyButton onClick={() => openMethodology('cost-model')} />}
          anchorId="cost-model"
          modalSize="full"
        >
          {({ inModal }) => <CostModel clients={clients} inModal={inModal} />}
        </PopoutCard>

        {/* Scaling curve */}
        <PopoutCard
          title="Throughput by Block Size"
          subtitle="Median Mgas/s per block, grouped by gas used"
          headerActions={<MethodologyButton onClick={() => openMethodology('workload')} />}
          anchorId="scaling-curve"
          modalSize="full"
        >
          {({ inModal }) => <ScalingCurve clients={clients} inModal={inModal} gasLimitM={gasLimitM} />}
        </PopoutCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* Distribution */}
        <PopoutCard
          title="Throughput Distribution"
          subtitle="Per-block Mgas/s, P5–P95, blocks above 5M gas"
          headerActions={<MethodologyButton onClick={() => openMethodology('workload')} />}
          anchorId="throughput-distribution"
          modalSize="full"
        >
          {({ inModal }) => (
            <BoxPlot
              series={[
                {
                  name: 'Mgas/s',
                  data: clients.map(c => ({
                    value: c.distribution,
                    itemStyle: { color: `${c.color}33`, borderColor: c.color, borderWidth: 1.5 },
                  })),
                },
              ]}
              categories={clients.map(c => c.client)}
              categoryLabelInterval={0}
              yAxisTitle="Mgas/s"
              height={inModal ? 600 : 340}
            />
          )}
        </PopoutCard>

        {/* Workload sensitivity */}
        <PopoutCard
          title="Workload Sensitivity"
          subtitle="Throughput on blocks heaviest in each gas resource vs blocks lightest in it"
          headerActions={<MethodologyButton onClick={() => openMethodology('workload')} />}
          anchorId="workload-sensitivity"
          modalSize="full"
        >
          <WorkloadSensitivity clients={clients} avgShares={model.avgShares} />
        </PopoutCard>
      </div>

      {opcodeCosts.model ? (
        <>
          <OpcodePricingCard model={opcodeCosts.model} onMethodology={() => openMethodology('opcodes')} />
          <OpcodeVersionsCard model={opcodeCosts.model} onMethodology={() => openMethodology('opcodes')} />
        </>
      ) : opcodeCosts.isLoading ? (
        <div className="h-96 animate-pulse rounded-sm bg-surface outline -outline-offset-1 outline-border" />
      ) : null}

      {/* Slowest blocks */}
      <PopoutCard
        title="Slowest Blocks"
        subtitle={`Blocks that took the slowest client longest to execute, last ${blockWindowLabel}`}
        anchorId="slowest-blocks"
        modalSize="full"
        noPadding
      >
        <SlowBlocks blocks={slowBlocks} />
      </PopoutCard>

      {/* Versions */}
      <PopoutCard
        title="Version Tracker"
        subtitle="Throughput per release, compared with the release it replaced"
        anchorId="versions"
        modalSize="full"
        noPadding
      >
        <VersionTracker rows={versions} />
      </PopoutCard>
    </div>
  );
}

/** Client logo and name, inline */
function ClientInline({ client }: { client: string }): JSX.Element {
  return (
    <span className="flex items-center gap-1.5">
      <ClientLogo client={client} size={14} />
      <span>{client}</span>
    </span>
  );
}

function throughputTooltip(params: unknown): string {
  const points = (Array.isArray(params) ? params : [params]) as {
    seriesName?: string;
    value?: [number, number];
    color?: string;
  }[];
  if (!points.length) return '';
  const time = new Date(points[0].value?.[0] ?? 0).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const rows = [...points]
    .filter(p => p.value?.[1] != null)
    .sort((a, b) => (b.value?.[1] ?? 0) - (a.value?.[1] ?? 0))
    .map(
      p =>
        `<div style="display:flex;gap:8px;align-items:center;margin:3px 0"><span style="width:8px;height:8px;border-radius:50%;background:${p.color}"></span><span>${p.seriesName}</span><span style="margin-left:auto;font-weight:600">${fmtMgas(p.value![1])} Mgas/s</span></div>`
    )
    .join('');
  return `<div style="font-weight:600;margin-bottom:6px">${time}</div>${rows}`;
}

/** Horizontal bars of each client's gas ceiling with today's limit marked */
function GasCeiling({
  ceilings,
  gasLimitM,
  basis,
}: {
  ceilings: { client: ClientPerformance; mgas: number }[];
  gasLimitM: number;
  basis: 'p50' | 'p95';
}): JSX.Element {
  const max = Math.max(...ceilings.map(c => c.mgas), gasLimitM);
  const step = max > 4000 ? 1000 : max > 2000 ? 500 : max > 800 ? 200 : 100;
  const axisMax = Math.ceil(max / step) * step;
  const ticks = Array.from({ length: axisMax / step + 1 }, (_, i) => i * step);
  // Phones label at most four ticks so the labels don't run together
  const phoneTickEvery = Math.ceil((ticks.length - 1) / 3);
  const network = ceilings[ceilings.length - 1];

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex shrink-0 flex-col justify-center gap-1 lg:w-64 lg:border-r lg:border-border lg:pr-6">
        <div className="text-xs font-medium text-muted">Network ceiling</div>
        <div className="text-5xl/none font-semibold tracking-tight text-foreground tabular-nums">
          {fmtGasM(network.mgas)}
        </div>
        <div className="mt-1 text-sm text-muted">
          <span className="font-medium text-foreground">{(network.mgas / gasLimitM).toFixed(1)}×</span> today&apos;s{' '}
          {fmtGasM(gasLimitM)} limit
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted">
          Set by <ClientInline client={network.client.client} />
        </div>
      </div>

      {/* Bars, today's marker and ticks share the middle column; the bar track keeps room on its
          right for the value label after the longest bar */}
      <div className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 pt-5 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
        {ceilings.map(({ client, mgas }, i) => {
          const fit = basis === 'p50' ? client.fitP50 : client.fitP95;
          return (
            <Fragment key={client.client}>
              <div
                className="col-start-1 flex items-center gap-2 text-sm font-medium text-foreground"
                style={{ gridRow: i + 1 }}
              >
                <ClientLogo client={client.client} size={18} />
                {client.client}
              </div>
              <div className="relative col-start-2 mr-12 h-7" style={{ gridRow: i + 1 }}>
                <div
                  className="absolute inset-y-0 left-0 rounded-xs transition-[width] duration-500"
                  style={{ width: `${(mgas / axisMax) * 100}%`, backgroundColor: client.color }}
                />
                <span
                  className="absolute top-1/2 -translate-y-1/2 pl-2 text-xs font-semibold whitespace-nowrap text-foreground tabular-nums"
                  style={{ left: `${(mgas / axisMax) * 100}%` }}
                >
                  {fmtGasM(mgas)}
                </span>
              </div>
              <div
                className="col-start-3 hidden text-right font-mono text-xs whitespace-nowrap text-muted sm:block"
                style={{ gridRow: i + 1 }}
              >
                {Math.max(0, fit.intercept).toFixed(0)}ms + {fit.slope.toFixed(2)}ms/Mgas
              </div>
            </Fragment>
          );
        })}
        {/* Today's gas limit marker */}
        <div
          className="pointer-events-none relative col-start-2 mr-12 self-stretch"
          style={{ gridRow: `1 / span ${ceilings.length}` }}
        >
          <div
            className="absolute inset-y-0 border-l-2 border-dashed border-foreground/60"
            style={{ left: `${(gasLimitM / axisMax) * 100}%` }}
          >
            <span className="absolute -top-5 -translate-x-1/2 text-xs font-semibold whitespace-nowrap text-foreground">
              today {fmtGasM(gasLimitM)}
            </span>
          </div>
        </div>
        <div
          className="relative col-start-2 mr-12 h-4 text-xs text-muted tabular-nums"
          style={{ gridRow: ceilings.length + 1 }}
        >
          {ticks.map((t, i) => (
            <span
              key={t}
              className={clsx(
                'absolute -translate-x-1/2 whitespace-nowrap',
                i % phoneTickEvery !== 0 && 'hidden sm:inline'
              )}
              style={{ left: `${(t / axisMax) * 100}%` }}
            >
              {fmtGasM(t)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Scatter of gas vs duration with each client's fitted line and a summary table */
function CostModel({ clients, inModal }: { clients: ClientPerformance[]; inModal: boolean }): JSX.Element {
  const maxGas = Math.max(...clients.flatMap(c => c.points.map(p => p[0])), 1);
  const xMax = Math.ceil(maxGas / 10) * 10;
  // Thin the scatter so the fitted lines stay readable
  const scatter = clients.map(c => ({
    name: c.client,
    data: c.points.filter((_, i) => i % 3 === 0),
    color: `${c.color}55`,
    symbolSize: 3,
  }));
  const lines = clients.map(c => ({
    name: `${c.client} fit`,
    data: [
      [0, Math.max(0, c.fitP50.intercept)],
      [xMax, Math.max(0, c.fitP50.intercept) + c.fitP50.slope * xMax],
    ] as [number, number][],
    color: c.color,
    lineWidth: 2.5,
    symbol: 'none' as const,
    z: 10,
  }));
  return (
    <div className="flex flex-col gap-4">
      <ScatterAndLineChart
        scatterSeries={scatter}
        lineSeries={lines}
        xAxisTitle="Gas used (Mgas)"
        yAxisTitle="P50 duration (ms)"
        xMax={xMax}
        yMin={0}
        yMax={inModal ? undefined : 250}
        height={inModal ? 560 : 260}
        showLegend={false}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="text-xs text-muted">
              <th className="py-1 text-left font-medium">Client</th>
              <th className="py-1 pl-2 text-right font-medium">Overhead</th>
              <th className="py-1 pl-2 text-right font-medium">Per Mgas</th>
              <th className="py-1 pl-2 text-right font-medium">Full block</th>
              <th className="py-1 pl-2 text-right font-medium">R²</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {clients.map(c => (
              <tr key={c.client}>
                <td className="py-1.5">
                  <ClientInline client={c.client} />
                </td>
                <td className="py-1.5 pl-2 text-right tabular-nums">{Math.max(0, c.fitP50.intercept).toFixed(1)} ms</td>
                <td className="py-1.5 pl-2 text-right tabular-nums">{c.fitP50.slope.toFixed(2)} ms</td>
                <td className="py-1.5 pl-2 text-right tabular-nums">
                  {(Math.max(0, c.fitP50.intercept) + c.fitP50.slope * 60).toFixed(0)} ms
                </td>
                <td className="py-1.5 pl-2 text-right text-muted tabular-nums">{c.fitP50.r2.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Median throughput per gas bucket: fixed overhead dominates small blocks */
function ScalingCurve({
  clients,
  inModal,
  gasLimitM,
}: {
  clients: ClientPerformance[];
  inModal: boolean;
  gasLimitM: number;
}): JSX.Element {
  const bucketCount = Math.ceil(gasLimitM / GAS_BUCKET_MGAS);
  const labels = Array.from({ length: bucketCount }, (_, i) => `${i * GAS_BUCKET_MGAS}–${(i + 1) * GAS_BUCKET_MGAS}M`);
  return (
    <MultiLineChart
      series={clients.map(c => ({
        name: c.client,
        data: labels.map((_, i) => c.byGasBucket.get(i) ?? null),
        color: c.color,
        showSymbol: true,
        symbolSize: 5,
        smooth: true,
      }))}
      xAxis={{ type: 'category', labels, name: 'Gas used' }}
      yAxis={{ name: 'Median Mgas/s', min: 0 }}
      height={inModal ? 600 : 470}
      showLegend
      connectNulls
    />
  );
}

/** Client × resource grid of throughput change on resource-heavy blocks */
function WorkloadSensitivity({
  clients,
  avgShares,
}: {
  clients: ClientPerformance[];
  avgShares: Map<string, number>;
}): JSX.Element {
  const resources = RESOURCES.filter(r => (avgShares.get(r.key) ?? 0) >= 0.01);
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-surface" />
            {resources.map(r => (
              <th key={r.key} className="px-1 pb-1 text-center align-bottom text-xs font-medium text-muted">
                <div className="text-foreground">{r.label}</div>
                <div className="font-normal tabular-nums">{((avgShares.get(r.key) ?? 0) * 100).toFixed(0)}% of gas</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {clients.map(c => (
            <tr key={c.client}>
              <td className="sticky left-0 z-10 bg-surface pr-2">
                <div className="w-max">
                  <ClientInline client={c.client} />
                </div>
              </td>
              {resources.map(r => {
                const v = c.sensitivity.get(r.key);
                return (
                  <td
                    key={r.key}
                    className="h-10 rounded-xs text-center text-xs font-medium text-foreground tabular-nums"
                    style={divergingStyle(v, 25)}
                  >
                    {v === undefined ? '–' : fmtPct(v)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-3 flex items-center justify-end gap-2 text-xs text-muted">
        <span>Slower</span>
        <div
          className="h-2 w-32 rounded-full"
          style={{
            background:
              'linear-gradient(to right, color-mix(in oklab, var(--color-chart-3) 70%, transparent), transparent, color-mix(in oklab, var(--color-chart-0) 70%, transparent))',
          }}
        />
        <span>Faster</span>
      </div>
    </div>
  );
}

/** Table of slowest blocks with a per-client race strip */
function SlowBlocks({ blocks }: { blocks: SlowBlock[] }): JSX.Element {
  const maxMs = Math.max(...blocks.map(b => b.slowestMs), 1);
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead>
          <tr className="text-left text-xs whitespace-nowrap text-muted">
            <th className="px-4 py-2.5 font-medium sm:px-5">Slot</th>
            <th className="hidden px-3 py-2.5 font-medium xl:table-cell">Block</th>
            <th className="px-3 py-2.5 text-right font-medium">Gas</th>
            <th className="px-3 py-2.5 text-right font-medium">Txs</th>
            <th className="px-3 py-2.5 font-medium">Heaviest resource</th>
            <th className="px-3 py-2.5 font-medium">Execution race</th>
            <th className="px-4 py-2.5 text-right font-medium sm:px-5">Slowest</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {blocks.map(b => {
            const block =
              b.blockNumber > 0 ? (
                <Link
                  to="/ethereum/execution/gas-profiler/block/$blockNumber"
                  params={{ blockNumber: String(b.blockNumber) }}
                  className="text-foreground hover:text-primary hover:underline"
                >
                  {b.blockNumber}
                </Link>
              ) : (
                '–'
              );
            return (
              <tr key={b.slot}>
                <td className="px-4 py-2.5 sm:px-5">
                  <Link
                    to="/ethereum/slots/$slot"
                    params={{ slot: String(b.slot) }}
                    className="font-medium text-primary hover:underline"
                  >
                    {b.slot}
                  </Link>
                  {/* Narrower screens stack the block under its slot to keep the race and slowest time in view */}
                  <div className="text-xs xl:hidden">{block}</div>
                </td>
                <td className="hidden px-3 py-2.5 xl:table-cell">{block}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{(b.gasUsed / 1e6).toFixed(1)}M</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{b.txCount}</td>
                <td className="px-3 py-2.5 whitespace-nowrap text-muted">
                  {b.topResource ? (
                    <>
                      <span className="text-foreground">{b.topResource.label}</span>{' '}
                      {(b.topResource.share * 100).toFixed(0)}%
                    </>
                  ) : (
                    '–'
                  )}
                </td>
                <td className="min-w-40 px-3 py-2.5 xl:w-[38%] xl:min-w-64">
                  <div className="relative h-5 rounded-xs bg-background">
                    {b.perClient.map(p => (
                      <span
                        key={p.client}
                        title={`${p.client} · ${Math.round(p.ms)} ms`}
                        className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
                        style={{ left: `${(p.ms / maxMs) * 100}%`, backgroundColor: getExecutionClientColor(p.client) }}
                      />
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-right whitespace-nowrap sm:px-5">
                  <span className="inline-flex items-center gap-1.5">
                    <ClientLogo client={b.slowestClient} size={14} />
                    <span className="font-semibold tabular-nums">{Math.round(b.slowestMs)} ms</span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Per-release throughput with change vs the previous release of the same client */
function VersionTracker({ rows }: { rows: VersionRow[] }): JSX.Element {
  const sorted = [...rows]
    .sort((a, b) => a.client.localeCompare(b.client) || b.firstSeen - a.firstSeen)
    .filter((r, i, all) => all.slice(0, i).filter(x => x.client === r.client).length < 3);
  const fmtDate = (t: number): string => new Date(t * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' });
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-border text-sm">
        <thead>
          <tr className="text-left text-xs text-muted">
            <th className="px-4 py-2.5 font-medium sm:px-5">Client</th>
            <th className="hidden px-3 py-2.5 font-medium xl:table-cell">Version</th>
            <th className="hidden px-3 py-2.5 font-medium xl:table-cell">Seen</th>
            <th className="hidden px-3 py-2.5 font-medium sm:table-cell">Hourly Mgas/s</th>
            <th className="px-3 py-2.5 text-right font-medium whitespace-nowrap">Mgas/s</th>
            <th className="px-4 py-2.5 text-right font-medium whitespace-nowrap sm:px-5">vs previous</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map(r => (
            <tr key={`${r.client}|${r.version}`}>
              <td className="px-4 py-2 sm:px-5">
                <ClientInline client={r.client} />
                {/* Narrower screens stack version and dates under the client so the numbers stay in view */}
                <div className="mt-0.5 font-mono text-xs wrap-break-word text-foreground xl:hidden">{r.version}</div>
                <div className="text-xs whitespace-nowrap text-muted xl:hidden">
                  {fmtDate(r.firstSeen)} – {fmtDate(r.lastSeen)}
                </div>
              </td>
              <td className="hidden max-w-56 truncate px-3 py-2 font-mono text-xs text-foreground xl:table-cell">
                {r.version}
              </td>
              <td className="hidden px-3 py-2 whitespace-nowrap text-muted xl:table-cell">
                {fmtDate(r.firstSeen)} – {fmtDate(r.lastSeen)}
              </td>
              <td className="hidden px-3 py-2 sm:table-cell">
                <Sparkline data={r.sparkline} width={180} height={24} color={getExecutionClientColor(r.client)} />
              </td>
              <td className="px-3 py-2 text-right font-medium tabular-nums">{fmtMgas(r.throughput)}</td>
              <td
                className={clsx(
                  'px-4 py-2 text-right font-medium tabular-nums sm:px-5',
                  r.delta !== undefined && r.delta <= -5 ? 'text-danger' : 'text-foreground'
                )}
              >
                {r.delta === undefined ? <span className="text-muted">–</span> : fmtPct(r.delta)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
