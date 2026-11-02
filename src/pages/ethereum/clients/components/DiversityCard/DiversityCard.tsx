import type { JSX } from 'react';
import { Card } from '@/components/Layout/Card';
import { ClientLabel } from '@/components/Ethereum/ClientLabel';
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

/**
 * Client shares of identified blocks as one bar, marked at ⅓, ½ and ⅔, with the largest client's distance to
 * the next threshold.
 */
export function DiversityCard({ title, summaries }: DiversityCardProps): JSX.Element {
  const identified = summaries.filter(summary => summary.client !== UNKNOWN_CLIENT && summary.identifiedShare !== null);
  const largest = identified[0];
  const share = largest?.identifiedShare ?? 0;
  const next = largest ? nextThreshold(share) : null;
  const crossed = largest ? crossedThreshold(share) : null;

  return (
    <Card rounded title={title}>
      {!largest ? (
        <p className="text-sm text-muted">No blocks named a client in this window.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="relative pt-5">
            {DIVERSITY_THRESHOLDS.map(threshold => (
              <span
                key={threshold.label}
                className="absolute top-0 -translate-x-1/2 text-xs/4 text-muted"
                style={{ left: `${threshold.share}%` }}
              >
                {threshold.label}
              </span>
            ))}
            <div className="relative flex h-4 w-full overflow-hidden rounded-xs bg-border/50">
              {identified.map(summary => (
                <span
                  key={summary.client}
                  className="h-full border-r border-surface last:border-r-0"
                  style={{ width: `${summary.identifiedShare}%`, backgroundColor: getClientColor(summary.client) }}
                  title={`${formatClientName(summary.client)} ${summary.identifiedShare?.toFixed(1)}%`}
                />
              ))}
            </div>
            {DIVERSITY_THRESHOLDS.map(threshold => (
              <span
                key={threshold.label}
                className="absolute top-4 h-6 w-px bg-foreground/60"
                style={{ left: `${threshold.share}%` }}
              />
            ))}
          </div>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs/5 text-muted">Largest client</dt>
              <dd>
                <ClientLabel client={largest.client} />
              </dd>
            </div>
            <div>
              <dt className="text-xs/5 text-muted">Its share</dt>
              <dd className="text-sm/6 font-semibold text-foreground tabular-nums">{share.toFixed(1)}%</dd>
            </div>
            <div>
              <dt className="text-xs/5 text-muted">{crossed ? 'Over' : 'Next threshold'}</dt>
              <dd
                className={crossed ? 'text-sm/6 font-semibold text-danger' : 'text-sm/6 font-semibold text-foreground'}
              >
                {crossed ?? next?.label ?? '-'}
              </dd>
            </div>
            <div>
              <dt className="text-xs/5 text-muted">To next threshold</dt>
              <dd className="text-sm/6 font-semibold text-foreground tabular-nums">
                {next ? `${next.distance.toFixed(1)} pts` : '-'}
              </dd>
            </div>
          </dl>
        </div>
      )}
    </Card>
  );
}
