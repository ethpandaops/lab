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
} from '../../utils/opcode-costs';
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
        <div className="flex items-center gap-2">
          <MethodologyButton onClick={onMethodology} />
          <SegmentedControl ariaLabel="Metric" options={METRIC_OPTIONS} value={metric} onChange={setMetric} />
        </div>
      }
    >
      <div className="border-b border-border p-4 sm:p-5">
        <div className="mb-3 text-xs font-medium text-muted">Repricing candidates</div>
        <Stats
          gridClassName="grid grid-cols-2 lg:grid-cols-4"
          stats={candidates.map(c => ({
            id: c.opcode.name,
            name: c.opcode.name,
            value: fmtRatio(c.cost.ratio),
            subtitle: (
              <span className="flex items-center gap-1.5">
                <ClientLogo client={c.client} size={14} />
                {c.client} · {fmtNs(c.cost.nsPerOp)} for {fmtGasPerOp(c.opcode.gasPerOp)} gas
              </span>
            ),
          }))}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-x-1 border-spacing-y-0.5 px-3 py-3 text-sm sm:px-4">
          <thead>
            <tr className="text-xs text-muted">
              <th className="px-1 pb-2 text-left font-medium">Opcode</th>
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
                    <span className="text-xs font-semibold text-foreground">{section.title}</span>
                    {section.note && <span className="ml-2 text-xs text-muted">{section.note}</span>}
                  </td>
                </tr>
                {section.rows.map(i => {
                  const op = model.opcodes[i];
                  return (
                    <tr key={op.name}>
                      <td className="px-1 py-0.5 font-mono text-xs whitespace-nowrap text-foreground">{op.name}</td>
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
        <span className="flex items-center gap-2">
          Faster than priced
          <span
            className="h-2 w-32 rounded-full"
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

/**
 * One opcode's cost over time per client: daily estimates with deploys marked, and an estimate
 * with interval for each release that ran long enough to measure.
 */
export function OpcodeVersionsCard({ model, onMethodology }: OpcodeCardProps): JSX.Element {
  const themeColors = useThemeColors();
  const versionOpcodes = model.opcodes
    .map((op, i) => ({ op, i }))
    .filter(({ op }) => op.gasShare >= 0.005)
    .sort((a, b) => b.op.gasShare - a.op.gasShare);
  const [opIndex, setOpIndex] = useState(model.opcodes.findIndex(o => o.key === 'SLOAD'));
  const op = model.opcodes[opIndex];
  const dayMin = Math.min(...model.clients.flatMap(c => c.daily.map(d => d.day)));
  const dayMax = Math.max(...model.clients.flatMap(c => c.daily.map(d => d.day)));
  const yMax = niceMax(Math.max(...model.clients.flatMap(c => c.daily.map(d => d.nsPerOp[opIndex]))));

  const measured = model.clients.flatMap((c, ci) =>
    // The most recent releases per client; long ranges otherwise list dozens of dev builds
    c.versions.slice(-MAX_RELEASES_PER_CLIENT).map(v => {
      const cost = v.ratios[opIndex];
      return {
        client: c.client,
        color: getExecutionClientColor(c.client, ci),
        version: v,
        ns: cost.nsPerOp,
        lo: cost.nsLo,
        hi: cost.nsHi,
      };
    })
  );
  const forestMax = Math.max(...measured.map(m => m.hi)) * 1.05;

  return (
    <PopoutCard
      title="Opcode Cost Over Time"
      subtitle={`Nanoseconds per ${op.name}, fitted per day. Dashed lines mark deploys.`}
      anchorId="opcode-versions"
      modalSize="full"
      noPadding
      headerActions={
        <div className="flex items-center gap-2">
          <MethodologyButton onClick={onMethodology} />
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
          <div className="grid grid-cols-1 gap-x-6 gap-y-2 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3">
            {model.clients.map((c, ci) => {
              const color = getExecutionClientColor(c.client, ci);
              // A deploy is the first day a new version leads the day's blocks
              const deploys = c.daily
                .filter((d, i) => i > 0 && d.versions[0] !== c.daily[i - 1].versions[0])
                .map(d => ({ xValue: d.day * 1000, color }));
              return (
                <div key={c.client}>
                  <div className="flex items-center justify-between text-sm">
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
                    xAxis={{
                      type: 'value',
                      min: dayMin * 1000,
                      max: dayMax * 1000,
                      formatter: v => fmtDate(Number(v) / 1000),
                    }}
                    yAxis={{ min: 0, max: yMax, formatter: v => fmtNs(v) }}
                    markLines={deploys}
                    height={inModal ? 300 : 190}
                    showLegend={false}
                    grid={{ top: 24, right: 12, bottom: 28, left: 56 }}
                    tooltipFormatter={params => {
                      const p = (Array.isArray(params) ? params : [params]) as { value?: [number, number] }[];
                      const day = c.daily.find(d => d.day * 1000 === p[0]?.value?.[0]);
                      if (!day) return '';
                      return `<div style="font-weight:600">${fmtDate(day.day)}</div><div>${fmtNs(day.nsPerOp[opIndex])} · ${day.blocks.toLocaleString()} blocks</div><div style="font-family:monospace;font-size:11px;opacity:.7">${day.versions.map(shortVersion).join(', ')}</div>`;
                    }}
                  />
                </div>
              );
            })}
          </div>

          {measured.length > 0 && (
            <div className="border-t border-border">
              <div className="px-4 pt-3 text-xs font-semibold text-foreground sm:px-5">
                Releases that ran a day or more
              </div>
              <table className="min-w-full text-sm">
                <tbody>
                  {measured.map(m => (
                    <tr key={`${m.client}|${m.version.version}`}>
                      <td className="px-4 py-1.5 whitespace-nowrap sm:px-5">
                        <span className="flex items-center gap-1.5">
                          <ClientLogo client={m.client} size={14} />
                          <span className="font-mono text-xs text-foreground">{m.version.version}</span>
                        </span>
                      </td>
                      <td className="px-3 py-1.5 whitespace-nowrap text-muted">
                        {fmtDate(m.version.firstSeen)} – {fmtDate(m.version.lastSeen)}
                      </td>
                      <td className="w-[45%] min-w-72 px-3 py-1.5">
                        <div className="relative h-5">
                          <div
                            className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full opacity-40"
                            style={{
                              left: `${(m.lo / forestMax) * 100}%`,
                              width: `${Math.max(0.5, ((m.hi - m.lo) / forestMax) * 100)}%`,
                              backgroundColor: m.color,
                            }}
                          />
                          <div
                            className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
                            style={{ left: `${(m.ns / forestMax) * 100}%`, backgroundColor: m.color }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-1.5 text-right whitespace-nowrap tabular-nums sm:px-5">
                        <span className="font-medium">{fmtNs(m.ns)}</span>{' '}
                        <span className="text-xs text-muted">
                          {fmtNs(m.lo)}–{fmtNs(m.hi)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </PopoutCard>
  );
}
