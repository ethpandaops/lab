import { type CSSProperties, type JSX, Fragment, useState } from 'react';
import clsx from 'clsx';
import { PopoutCard } from '@/components/Layout/PopoutCard';
import { Stats } from '@/components/DataDisplay/Stats';
import { SegmentedControl } from '@/components/Forms/SegmentedControl';
import { SelectMenu } from '@/components/Forms/SelectMenu';
import { MultiLineChart } from '@/components/Charts/MultiLine';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { getExecutionClientColor } from '@/utils';
import { useThemeColors } from '@/hooks/useThemeColors';
import {
  MIN_GAS_SHARE,
  isMispriced,
  repricingCandidates,
  type OpcodeCost,
  type OpcodeCostModel,
  type OpcodeMeta,
} from '../utils/opcode-costs';
import { MethodologyButton } from './MethodologyDialog';

export interface OpcodeCardProps {
  model: OpcodeCostModel;
  onMethodology: () => void;
}

const METRIC_OPTIONS = [
  { value: 'ratio', label: '× gas price' },
  { value: 'ns', label: 'ns / op' },
] as const;

function fmtRatio(r: number): string {
  return `${r < 10 ? r.toFixed(1) : Math.round(r)}×`;
}

function fmtNs(ns: number): string {
  if (ns === 0) return '0';
  if (ns >= 1000) return `${(ns / 1000).toFixed(ns >= 10_000 ? 0 : 1)} µs`;
  return `${ns < 10 ? ns.toFixed(1) : Math.round(ns)} ns`;
}

function fmtGasPerOp(gas: number): string {
  if (gas >= 10_000) return `${Math.round(gas / 1000)}k`;
  return gas < 10 ? gas.toFixed(1) : Math.round(gas).toLocaleString();
}

/** Red when slower than priced, blue when faster, on a log scale capped at 4× either way */
function ratioStyle(cost: OpcodeCost): CSSProperties {
  if (!isMispriced(cost)) return {};
  const strength = Math.min(1, Math.abs(Math.log2(Math.max(cost.ratio, 0.01))) / 2);
  const color = cost.ratio > 1 ? 'var(--color-chart-3)' : 'var(--color-chart-0)';
  return { backgroundColor: `color-mix(in oklab, ${color} ${Math.round(10 + strength * 60)}%, transparent)` };
}

/** Indices of opcodes common enough to estimate, ordered by the slowest client's ratio */
function rowsFor(model: OpcodeCostModel, pricedFor: OpcodeMeta['pricedFor']): number[] {
  return model.opcodes
    .map((op, i) => ({ op, i }))
    .filter(({ op }) => op.pricedFor === pricedFor && op.gasShare >= MIN_GAS_SHARE)
    .filter(({ i }) => model.clients.some(c => isMispriced(c.ratios[i])))
    .map(({ i }) => ({ i, worst: Math.max(...model.clients.map(c => c.ratios[i].ratio)) }))
    .sort((a, b) => b.worst - a.worst)
    .map(({ i }) => i);
}

/**
 * Opcode pricing matrix: each opcode's execution time per gas relative to the client's average,
 * plus the clearest repricing candidates.
 */
export function OpcodePricingCard({ model, onMethodology }: OpcodeCardProps): JSX.Element {
  const [metric, setMetric] = useState<'ratio' | 'ns'>('ratio');
  const candidates = repricingCandidates(model, 4);
  const sections = [
    { key: 'execution' as const, title: 'Priced for execution', rows: rowsFor(model, 'execution') },
    {
      key: 'state' as const,
      title: 'Priced for state and history',
      note: 'Gas also pays for state growth and history, so below 1× is expected.',
      rows: rowsFor(model, 'state'),
    },
  ];
  const days = model.days;

  return (
    <PopoutCard
      title="Opcode Pricing"
      subtitle={`Execution time per gas relative to each client's average, median of daily fits over ${days} days`}
      anchorId="opcode-pricing"
      modalSize="full"
      noPadding
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          <MethodologyButton onClick={onMethodology} />
          <SegmentedControl ariaLabel="Metric" options={METRIC_OPTIONS} value={metric} onChange={setMetric} />
        </div>
      }
    >
      <div className="border-b border-border p-4 sm:p-5">
        <div className="mb-3 text-xs font-medium text-muted">Repricing candidates</div>
        <Stats
          gridClassName="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4"
          stats={candidates.map(c => ({
            id: c.opcode.name,
            name: c.opcode.name,
            value: fmtRatio(c.cost.ratio),
            subtitle: (
              <>
                <span className="flex items-center gap-1.5">
                  <ClientLogo client={c.client} size={14} />
                  {c.client}
                </span>
                <span className="block truncate">
                  {fmtNs(c.cost.nsPerOp)} for {fmtGasPerOp(c.opcode.gasPerOp)} gas
                </span>
              </>
            ),
          }))}
        />
      </div>

      {/* Inset scroll area: cells scrolling under the sticky opcode column stay inside the card's hairline */}
      <div className="mx-3 overflow-x-auto sm:mx-4">
        <table className="min-w-full border-separate border-spacing-x-1 border-spacing-y-0.5 py-3 text-sm">
          <thead>
            <tr className="text-xs text-muted">
              <th className="sticky left-0 z-10 bg-surface px-1 pb-2 text-left font-medium">Opcode</th>
              <th className="px-1 pb-2 text-right font-medium">Gas share</th>
              <th className="px-1 pb-2 text-right font-medium">Gas / op</th>
              {model.clients.map(c => (
                <th key={c.client} className="min-w-20 px-1 pb-2 font-medium">
                  <span className="flex items-center justify-center gap-1.5 text-foreground">
                    <ClientLogo client={c.client} size={14} />
                    {c.client}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.map(section => (
              <Fragment key={section.key}>
                <tr>
                  <td colSpan={3 + model.clients.length} className="px-1 pt-4 pb-1.5">
                    {/* Stays in view and wraps inside it while the matrix scrolls sideways */}
                    <div className="sticky left-1 flex max-w-[calc(100vw-5rem)] flex-wrap gap-x-2 text-xs">
                      <span className="font-semibold text-foreground">{section.title}</span>
                      {section.note && <span className="text-muted">{section.note}</span>}
                    </div>
                  </td>
                </tr>
                {section.rows.map(i => {
                  const op = model.opcodes[i];
                  return (
                    <tr key={op.name}>
                      <td className="sticky left-0 z-10 bg-surface px-1 py-0.5 font-mono text-xs text-foreground sm:whitespace-nowrap">
                        <div className="max-w-36 sm:max-w-none">{op.name}</div>
                      </td>
                      <td className="px-1 py-0.5 text-right text-muted tabular-nums">
                        {(op.gasShare * 100).toFixed(op.gasShare >= 0.01 ? 0 : 1)}%
                      </td>
                      <td className="px-1 py-0.5 text-right text-muted tabular-nums">{fmtGasPerOp(op.gasPerOp)}</td>
                      {model.clients.map(c => {
                        const cost = c.ratios[i];
                        return (
                          <td
                            key={c.client}
                            title={`${c.client} · ${fmtRatio(cost.ratio)} (${fmtRatio(cost.lo)}–${fmtRatio(cost.hi)}) · ${fmtNs(cost.nsPerOp)} (${fmtNs(cost.nsLo)}–${fmtNs(cost.nsHi)})`}
                            className={clsx(
                              'h-8 rounded-xs px-2 text-center text-xs tabular-nums',
                              isMispriced(cost) ? 'font-medium text-foreground' : 'text-muted'
                            )}
                            style={ratioStyle(cost)}
                          >
                            {metric === 'ratio' ? fmtRatio(cost.ratio) : fmtNs(cost.nsPerOp)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted sm:px-5">
        <span>Uncoloured cells are within 10% of 1× or within noise.</span>
        <span className="flex w-full items-center gap-2 whitespace-nowrap sm:w-auto">
          Faster than priced
          <span
            className="h-2 min-w-8 flex-1 rounded-full sm:w-32 sm:flex-none"
            style={{
              background:
                'linear-gradient(to right, color-mix(in oklab, var(--color-chart-0) 70%, transparent), transparent, color-mix(in oklab, var(--color-chart-3) 70%, transparent))',
            }}
          />
          Slower than priced
        </span>
      </div>
    </PopoutCard>
  );
}

/** Short build id: the hash suffix of a version string */
function shortVersion(version: string): string {
  const parts = version.split(/[-+]/);
  return parts[parts.length - 1].replace(/^0x/, '').slice(0, 8);
}

/** Round up to an axis max that splits into 4 even intervals */
function niceMax(value: number): number {
  const raw = value / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(m => m >= raw) ?? raw;
  return step * 4;
}

const MAX_RELEASES_PER_CLIENT = 4;

const fmtDate = (t: number): string =>
  new Date(t * 1000).toLocaleDateString([], { month: 'short', day: 'numeric', timeZone: 'UTC' });

const VIEW_OPTIONS = [
  { value: 'combined', label: 'Combined' },
  { value: 'per-client', label: 'Per client' },
] as const;

/** Tooltip for daily points: date, then each series' value */
function dailyTooltip(params: unknown, label: (seriesName: string, ns: number) => string): string {
  const points = (Array.isArray(params) ? params : [params]) as {
    seriesName?: string;
    value?: [number, number];
    color?: string;
  }[];
  const first = points.find(p => p.value);
  if (!first?.value) return '';
  const rows = points
    .filter(p => p.value && p.seriesName !== 'Median')
    .sort((a, b) => (b.value![1] ?? 0) - (a.value![1] ?? 0))
    .map(
      p =>
        `<div style="display:flex;gap:8px;align-items:center;margin:2px 0"><span style="width:8px;height:8px;border-radius:50%;background:${p.color}"></span><span>${p.seriesName}</span><span style="margin-left:auto;font-weight:600">${label(p.seriesName ?? '', p.value![1])}</span></div>`
    )
    .join('');
  return `<div style="font-weight:600;margin-bottom:4px">${fmtDate(first.value[0] / 1000)}</div>${rows}`;
}

/**
 * One opcode's cost over time: all clients on one chart, or a chart per client scaled to that
 * client's own range with deploys marked. Below, an estimate with interval for recent releases.
 */
export function OpcodeVersionsCard({ model, onMethodology }: OpcodeCardProps): JSX.Element {
  const themeColors = useThemeColors();
  const versionOpcodes = model.opcodes
    .map((op, i) => ({ op, i }))
    .filter(({ op }) => op.gasShare >= 0.005)
    .sort((a, b) => b.op.gasShare - a.op.gasShare);
  const [opIndex, setOpIndex] = useState(model.opcodes.findIndex(o => o.key === 'SLOAD'));
  const [view, setView] = useState<(typeof VIEW_OPTIONS)[number]['value']>('combined');
  const op = model.opcodes[opIndex];
  const dayMin = Math.min(...model.clients.flatMap(c => c.daily.map(d => d.day)));
  const dayMax = Math.max(...model.clients.flatMap(c => c.daily.map(d => d.day)));
  const xAxis = {
    type: 'value' as const,
    min: dayMin * 1000,
    max: dayMax * 1000,
    formatter: (v: number | string) => fmtDate(Number(v) / 1000),
  };

  const releaseGroups = model.clients
    .map((c, ci) => {
      const color = getExecutionClientColor(c.client, ci);
      // The most recent releases per client; long ranges otherwise list dozens of dev builds
      const rows = c.versions.slice(-MAX_RELEASES_PER_CLIENT).map(v => ({
        version: v,
        ns: v.ratios[opIndex].nsPerOp,
        lo: v.ratios[opIndex].nsLo,
        hi: v.ratios[opIndex].nsHi,
      }));
      // Each client on its own scale: what matters is how its releases compare with each other
      const max = Math.max(...rows.map(r => r.hi), 1e-9) * 1.05;
      return { client: c.client, color, rows, max };
    })
    .filter(g => g.rows.length > 0);

  return (
    <PopoutCard
      title="Opcode Cost Over Time"
      subtitle={`Nanoseconds per ${op.name}, fitted per day`}
      anchorId="opcode-versions"
      modalSize="full"
      noPadding
      headerActions={
        <div className="flex flex-wrap items-center gap-2">
          <MethodologyButton onClick={onMethodology} />
          <SegmentedControl ariaLabel="Chart layout" options={VIEW_OPTIONS} value={view} onChange={setView} />
          <SelectMenu
            value={opIndex}
            onChange={setOpIndex}
            options={versionOpcodes.map(({ op: o, i }) => ({ value: i, label: o.name }))}
          />
        </div>
      }
    >
      {({ inModal }) => (
        <>
          {view === 'combined' ? (
            <div className="p-4 sm:p-5">
              <MultiLineChart
                series={model.clients.map((c, ci) => ({
                  name: c.client,
                  data: c.daily.map(d => [d.day * 1000, d.nsPerOp[opIndex]] as [number, number]),
                  color: getExecutionClientColor(c.client, ci),
                  showSymbol: true,
                  symbolSize: 5,
                }))}
                xAxis={xAxis}
                yAxis={{ min: 0, formatter: v => fmtNs(v) }}
                height={inModal ? 600 : 360}
                showLegend
                tooltipFormatter={params => dailyTooltip(params, (_, ns) => fmtNs(ns))}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-6 gap-y-2 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3">
              {model.clients.map((c, ci) => {
                const color = getExecutionClientColor(c.client, ci);
                // A deploy is the first day a new version leads the day's blocks
                const deploys = c.daily
                  .filter((d, i) => i > 0 && d.versions[0] !== c.daily[i - 1].versions[0])
                  .map(d => ({ xValue: d.day * 1000, color }));
                const yMax = niceMax(Math.max(...c.daily.map(d => d.nsPerOp[opIndex]), 1e-9));
                return (
                  <div key={c.client}>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-1.5 font-medium text-foreground">
                        <ClientLogo client={c.client} size={16} />
                        {c.client}
                      </span>
                      <span className="text-xs text-muted tabular-nums">{fmtNs(c.ratios[opIndex].nsPerOp)} median</span>
                    </div>
                    <MultiLineChart
                      series={[
                        {
                          name: c.client,
                          data: c.daily.map(d => [d.day * 1000, d.nsPerOp[opIndex]] as [number, number]),
                          color,
                          showSymbol: true,
                          symbolSize: 5,
                        },
                        {
                          name: 'Median',
                          data: [
                            [dayMin * 1000, c.ratios[opIndex].nsPerOp],
                            [dayMax * 1000, c.ratios[opIndex].nsPerOp],
                          ],
                          color: themeColors.muted,
                          lineStyle: 'dotted',
                          lineWidth: 1,
                        },
                      ]}
                      xAxis={xAxis}
                      yAxis={{ min: 0, max: yMax, formatter: v => fmtNs(v) }}
                      markLines={deploys}
                      height={inModal ? 300 : 190}
                      showLegend={false}
                      grid={{ top: 24, right: 12, bottom: 28, left: 56 }}
                      tooltipFormatter={params => {
                        const p = (Array.isArray(params) ? params : [params]) as { value?: [number, number] }[];
                        const day = c.daily.find(d => d.day * 1000 === p[0]?.value?.[0]);
                        if (!day) return '';
                        return `<div style="font-weight:600">${fmtDate(day.day)}</div><div>${fmtNs(day.nsPerOp[opIndex])}, ${day.blocks.toLocaleString()} blocks</div><div style="font-family:monospace;font-size:11px;opacity:.7">${day.versions.map(shortVersion).join(', ')}</div>`;
                      }}
                    />
                  </div>
                );
              })}
              <p className="text-xs text-muted md:col-span-2 xl:col-span-3">
                Each chart has its own scale. Dashed lines mark deploys.
              </p>
            </div>
          )}

          {releaseGroups.length > 0 && (
            <div className="border-t border-border pb-2">
              <div className="px-4 pt-3 text-xs font-semibold text-foreground sm:px-5">Recent releases</div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  {releaseGroups.map(g => (
                    <tbody key={g.client}>
                      <tr>
                        <td colSpan={4} className="px-4 pt-3 pb-1 sm:px-5">
                          <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                            <ClientLogo client={g.client} size={14} />
                            {g.client}
                          </span>
                        </td>
                      </tr>
                      {g.rows.map(r => (
                        <tr key={r.version.version}>
                          <td className="py-1 pr-3 pl-4 sm:pl-5">
                            {/* Wraps rather than truncates on phones: the build hash at the end tells releases apart */}
                            <div className="w-40 font-mono text-xs wrap-break-word text-foreground sm:w-auto sm:whitespace-nowrap">
                              {r.version.version}
                            </div>
                            <div className="text-xs whitespace-nowrap text-muted sm:hidden">
                              {fmtDate(r.version.firstSeen)} – {fmtDate(r.version.lastSeen)}
                            </div>
                          </td>
                          <td className="hidden px-3 py-1 whitespace-nowrap text-muted sm:table-cell">
                            {fmtDate(r.version.firstSeen)} – {fmtDate(r.version.lastSeen)}
                          </td>
                          <td className="w-[40%] min-w-12 px-3 py-1 sm:min-w-40">
                            <div className="relative h-5">
                              <div
                                className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full opacity-40"
                                style={{
                                  left: `${(r.lo / g.max) * 100}%`,
                                  width: `${Math.max(0.5, ((r.hi - r.lo) / g.max) * 100)}%`,
                                  backgroundColor: g.color,
                                }}
                              />
                              <div
                                className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
                                style={{ left: `${(r.ns / g.max) * 100}%`, backgroundColor: g.color }}
                              />
                            </div>
                          </td>
                          <td className="px-4 py-1 text-right whitespace-nowrap tabular-nums sm:px-5">
                            <div className="font-medium">{fmtNs(r.ns)}</div>
                            <div className="text-xs text-muted">
                              {fmtNs(r.lo)}–{fmtNs(r.hi)}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  ))}
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </PopoutCard>
  );
}
