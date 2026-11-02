import type { JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import { ClientLabel } from '@/components/Ethereum/ClientLabel';
import { ClientLogo } from '@/components/Ethereum/ClientLogo';
import { getClientColor } from '@/utils/ethereum';
import { formatClientName } from '@/utils/graffiti';
import { UNKNOWN_CLIENT } from '../../constants';
import type { ClientSummary } from '../../utils/client-share';
import { DIVERSITY_THRESHOLDS, crossedThreshold, nextThreshold } from '../../utils/client-versions';

export interface DiversityCardProps {
  title: string;
  /** Per-client totals for one layer */
  summaries: ClientSummary[];
}

/** Segments narrower than this (percentage points) are too small to label inside the bar */
const MIN_LABELLED_SEGMENT = 9;

/**
 * Client shares of identified blocks as one stacked bar marked at 33%, 50% and 67%, a row per client, and the
 * largest client's position against those thresholds.
 */
export function DiversityCard({ title, summaries }: DiversityCardProps): JSX.Element {
  const identified = summaries.filter(summary => summary.client !== UNKNOWN_CLIENT && summary.identifiedShare !== null);
  const largest = identified[0];
  const share = largest?.identifiedShare ?? 0;
  const next = largest ? nextThreshold(share) : null;
  const crossed = largest ? crossedThreshold(share) : null;

  return (
    <Card rounded title={title} subtitle="Share of blocks whose graffiti names a client">
      {!largest ? (
        <p className="text-sm text-muted">No blocks named a client in this window.</p>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="relative pb-5">
            <div className="flex h-7 w-full overflow-hidden rounded-xs bg-border/50">
              {identified.map(summary => {
                const segment = summary.identifiedShare ?? 0;
                return (
                  <span
                    key={summary.client}
                    className="flex h-full min-w-0 items-center justify-center gap-1 overflow-hidden border-r border-surface text-xs/4 font-semibold text-white last:border-r-0"
                    style={{ width: `${segment}%`, backgroundColor: getClientColor(summary.client) }}
                    title={`${formatClientName(summary.client)} ${segment.toFixed(1)}%`}
                  >
                    {segment >= MIN_LABELLED_SEGMENT && (
                      <span
                        className="relative z-10 inline-flex items-center gap-1 rounded-xs px-1"
                        style={{ backgroundColor: getClientColor(summary.client) }}
                      >
                        <ClientLogo client={summary.client} size={14} noLink decorative />
                        <span className="truncate [text-shadow:0_1px_1px_rgb(0_0_0/0.4)]">{segment.toFixed(0)}%</span>
                      </span>
                    )}
                  </span>
                );
              })}
            </div>
            {DIVERSITY_THRESHOLDS.map(threshold => (
              <span key={threshold.label}>
                <span
                  className="absolute top-0 h-7 w-px -translate-x-1/2 bg-white/70"
                  style={{ left: `${threshold.share}%` }}
                />
                <span
                  className="absolute top-7 h-1.5 w-0.5 -translate-x-1/2 bg-foreground"
                  style={{ left: `${threshold.share}%` }}
                />
                <span
                  className="absolute bottom-0 -translate-x-1/2 text-xs/4 font-medium text-foreground"
                  style={{ left: `${threshold.share}%` }}
                >
                  {threshold.label}
                </span>
              </span>
            ))}
          </div>

          <table className="w-full text-sm/6">
            <thead>
              <tr className="text-left text-xs/5 text-muted">
                <th className="pb-1 font-normal">Client</th>
                <th className="pb-1 text-right font-normal">Share</th>
                <th className="pb-1 text-right font-normal">Blocks</th>
              </tr>
            </thead>
            <tbody>
              {identified.map(summary => (
                <tr key={summary.client}>
                  <td className="py-0.5">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-xs"
                        style={{ backgroundColor: getClientColor(summary.client) }}
                      />
                      <ClientLabel client={summary.client} />
                    </span>
                  </td>
                  <td className="py-0.5 text-right font-medium text-foreground tabular-nums">
                    {summary.identifiedShare?.toFixed(1)}%
                  </td>
                  <td className="py-0.5 text-right text-muted tabular-nums">{summary.blocks.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs/5 text-muted">Largest client</dt>
              <dd className="mt-0.5">
                <ClientLabel client={largest.client} />
              </dd>
            </div>
            <div>
              <dt className="text-xs/5 text-muted">Largest client&apos;s share</dt>
              <dd className="mt-0.5 text-sm/6 font-semibold text-foreground tabular-nums">{share.toFixed(1)}%</dd>
            </div>
            <div>
              <dt className="text-xs/5 text-muted">Threshold crossed</dt>
              <dd
                className={crossed ? 'mt-0.5 text-sm/6 font-semibold text-danger' : 'mt-0.5 text-sm/6 text-foreground'}
              >
                {crossed ?? 'None'}
              </dd>
            </div>
            <div>
              <dt className="text-xs/5 text-muted">{next ? `Points below ${next.label}` : 'Next threshold'}</dt>
              <dd className="mt-0.5 text-sm/6 font-semibold text-foreground tabular-nums">
                {next ? next.distance.toFixed(1) : 'None'}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </Card>
  );
}
