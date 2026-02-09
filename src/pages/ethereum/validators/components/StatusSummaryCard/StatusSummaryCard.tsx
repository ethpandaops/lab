import type { JSX } from 'react';
import clsx from 'clsx';
import { Card } from '@/components/Layout/Card';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import type { StatusSummary } from '../../hooks/useValidatorStatus';

interface StatusSummaryCardProps {
  /** Aggregate status counts across all validators */
  summary: StatusSummary | null;
  /** Whether status data is still loading */
  isLoading?: boolean;
}

interface BadgeConfig {
  key: keyof Omit<StatusSummary, 'total'>;
  label: string;
  dotClass: string;
  badgeClass: string;
}

const BADGE_CONFIGS: BadgeConfig[] = [
  { key: 'active', label: 'Active', dotClass: 'bg-success', badgeClass: 'bg-success/10 text-success' },
  { key: 'pending', label: 'Pending', dotClass: 'bg-accent', badgeClass: 'bg-accent/10 text-accent' },
  { key: 'exited', label: 'Exited', dotClass: 'bg-muted', badgeClass: 'bg-muted/10 text-muted' },
  { key: 'withdrawal', label: 'Withdrawal', dotClass: 'bg-muted', badgeClass: 'bg-muted/10 text-muted' },
  { key: 'slashed', label: 'Slashed', dotClass: 'bg-danger', badgeClass: 'bg-danger/10 text-danger' },
  { key: 'unknown', label: 'Unknown', dotClass: 'bg-warning', badgeClass: 'bg-warning/10 text-warning' },
];

/**
 * Displays a horizontal row of status badges summarizing the current state
 * of all queried validators (active, pending, exited, etc.)
 */
export function StatusSummaryCard({ summary, isLoading = false }: StatusSummaryCardProps): JSX.Element {
  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 3 }, (_, i) => (
            <LoadingContainer key={i} className="h-7 w-24 rounded-xs" />
          ))}
        </div>
      </Card>
    );
  }

  if (!summary) return <></>;

  const visibleBadges = BADGE_CONFIGS.filter(b => summary[b.key] > 0);
  if (visibleBadges.length === 0) return <></>;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-muted">Validators:</span>
        {visibleBadges.map(badge => (
          <span
            key={badge.key}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-xs px-2.5 py-1 text-xs font-medium',
              badge.badgeClass
            )}
          >
            <span className={clsx('size-2 rounded-full', badge.dotClass)} />
            {summary[badge.key]} {badge.label}
          </span>
        ))}
      </div>
    </Card>
  );
}
