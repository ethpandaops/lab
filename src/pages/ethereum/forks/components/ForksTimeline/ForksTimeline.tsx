import { Card } from '@/components/Layout/Card';
import { Epoch } from '@/components/Ethereum/Epoch';
import type { ForkInfo } from '@/utils/forks';
import clsx from 'clsx';

interface ForksTimelineProps {
  forks: ForkInfo[];
  currentEpoch: number;
}

/**
 * Timeline visualization of all network forks
 */
export function ForksTimeline({ forks, currentEpoch }: ForksTimelineProps): React.JSX.Element {
  return (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-foreground">Fork Timeline</h3>
        <p className="mt-1 text-sm text-muted">Complete history of consensus layer upgrades</p>

        <div className="mt-6 space-y-8">
          {forks.map((fork, index) => {
            const isActive = currentEpoch >= fork.epoch;
            const isCurrentFork = isActive && (index === forks.length - 1 || currentEpoch < forks[index + 1].epoch);

            return (
              <div key={fork.name} className="relative flex items-start gap-x-4">
                {/* Timeline line */}
                {index !== forks.length - 1 && (
                  <div
                    className={clsx('absolute top-14 -bottom-8 left-7 w-0.5', isActive ? 'bg-primary/30' : 'bg-border')}
                  />
                )}

                {/* Fork icon */}
                <div className="relative flex h-14 w-14 flex-none items-center justify-center">
                  <div
                    className={clsx(
                      'flex h-14 w-14 items-center justify-center rounded-xl text-3xl ring-4 transition-all',
                      isCurrentFork
                        ? 'bg-primary/20 shadow-lg ring-primary/20'
                        : isActive
                          ? 'bg-surface ring-accent/10'
                          : 'bg-surface ring-border'
                    )}
                  >
                    {fork.emoji}
                  </div>
                </div>

                {/* Fork content */}
                <div className="min-w-0 flex-1 pt-1 pb-2">
                  <div className="flex flex-col gap-y-3 sm:flex-row sm:items-start sm:justify-between sm:gap-x-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-x-3">
                        {fork.combinedName ? (
                          <a
                            href={`https://ethereum.org/roadmap/${fork.combinedName}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={clsx(
                              'text-lg font-semibold hover:underline',
                              isActive ? 'text-foreground' : 'text-muted'
                            )}
                          >
                            {fork.displayName}
                          </a>
                        ) : (
                          <h4 className={clsx('text-lg font-semibold', isActive ? 'text-foreground' : 'text-muted')}>
                            {fork.displayName}
                          </h4>
                        )}
                        {isCurrentFork && (
                          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted">{fork.description}</p>
                    </div>

                    <div className="flex flex-col items-start gap-y-2 sm:items-end">
                      <div className="flex items-center gap-x-2">
                        <span className="text-xs text-muted">Epoch</span>
                        <Epoch epoch={fork.epoch} />
                      </div>

                      {/* Status info */}
                      {!isActive ? (
                        <p className="text-xs text-muted">
                          Activates in {(fork.epoch - currentEpoch).toLocaleString()} epochs
                        </p>
                      ) : !isCurrentFork && index > 0 ? (
                        (() => {
                          const prevFork = forks[index - 1];
                          const epochsSincePrev = fork.epoch - prevFork.epoch;
                          const daysSincePrev = Math.floor((epochsSincePrev * 32 * 12) / 86400);

                          if (daysSincePrev === 0) {
                            return <p className="text-xs text-muted">Activated at genesis</p>;
                          } else if (daysSincePrev < 60) {
                            return (
                              <p className="text-xs text-muted">
                                Activated {daysSincePrev} days after {prevFork.displayName}
                              </p>
                            );
                          } else if (daysSincePrev < 730) {
                            const months = Math.floor(daysSincePrev / 30);
                            return (
                              <p className="text-xs text-muted">
                                Activated {months} months after {prevFork.displayName}
                              </p>
                            );
                          } else {
                            const years = Math.floor(daysSincePrev / 365);
                            const remainingMonths = Math.floor((daysSincePrev % 365) / 30);
                            return (
                              <p className="text-xs text-muted">
                                Activated {years}y {remainingMonths > 0 ? `${remainingMonths}m` : ''} after{' '}
                                {prevFork.displayName}
                              </p>
                            );
                          }
                        })()
                      ) : index === 0 && !isCurrentFork ? (
                        <p className="text-xs text-muted">Genesis fork</p>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {forks.length === 0 && (
          <div className="mt-6 flex h-32 items-center justify-center">
            <p className="text-sm text-muted">No forks configured for this network</p>
          </div>
        )}
      </div>
    </Card>
  );
}
