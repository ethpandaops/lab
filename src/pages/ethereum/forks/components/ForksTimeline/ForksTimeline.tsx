import { Card } from '@/components/Layout/Card';
import { Epoch } from '@/components/Ethereum/Epoch';
import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import type { ForkInfo } from '@/utils/forks';
import type { BlobScheduleItem } from '@/hooks/useConfig';
import clsx from 'clsx';

interface ForksTimelineProps {
  forks: ForkInfo[];
  currentEpoch: number;
  blobSchedule?: BlobScheduleItem[];
}

/**
 * Timeline visualization of all network forks and blob schedule changes
 */
export function ForksTimeline({ forks, currentEpoch, blobSchedule = [] }: ForksTimelineProps): React.JSX.Element {
  return (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-foreground">Fork Timeline</h3>
        <p className="mt-1 text-sm text-muted">Complete history of consensus layer upgrades</p>

        <div className="mt-6 space-y-8">
          {forks.map((fork, forkIndex) => {
            const isActive = currentEpoch >= fork.epoch;
            const isCurrentFork =
              isActive && (forkIndex === forks.length - 1 || currentEpoch < forks[forkIndex + 1].epoch);

            // Find blob schedule items that fall within this fork's epoch range
            const nextForkEpoch = forkIndex < forks.length - 1 ? forks[forkIndex + 1].epoch : Infinity;
            const blobItems = blobSchedule
              .filter(item => item.epoch >= fork.epoch && item.epoch < nextForkEpoch)
              .sort((a, b) => a.epoch - b.epoch);

            return (
              <div key={fork.name} className="space-y-6">
                {/* Main fork item */}
                <div className="relative flex items-start gap-x-4">
                  {/* Timeline line */}
                  {(forkIndex !== forks.length - 1 || blobItems.length > 0) && (
                    <div
                      className={clsx(
                        'absolute top-14 left-7 w-0.5',
                        blobItems.length > 0 ? '-bottom-6' : '-bottom-8',
                        isActive ? 'bg-primary/30' : 'bg-border'
                      )}
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
                          (() => {
                            const epochsUntil = fork.epoch - currentEpoch;
                            const daysUntil = Math.floor((epochsUntil * 32 * 12) / 86400);

                            if (daysUntil < 1) {
                              return <p className="text-xs text-muted">Activates soon</p>;
                            } else if (daysUntil < 60) {
                              return <p className="text-xs text-muted">Activates in {daysUntil} days</p>;
                            } else if (daysUntil < 730) {
                              const months = Math.floor(daysUntil / 30);
                              return <p className="text-xs text-muted">Activates in {months} months</p>;
                            } else {
                              const years = Math.floor(daysUntil / 365);
                              const remainingMonths = Math.floor((daysUntil % 365) / 30);
                              return (
                                <p className="text-xs text-muted">
                                  Activates in {years}y {remainingMonths > 0 ? `${remainingMonths}m` : ''}
                                </p>
                              );
                            }
                          })()
                        ) : forkIndex > 0 ? (
                          (() => {
                            const prevFork = forks[forkIndex - 1];
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
                        ) : forkIndex === 0 && !isCurrentFork ? (
                          <p className="text-xs text-muted">Genesis fork</p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Blob schedule sub-items for this fork */}
                {blobItems.length > 0 && (
                  <div className="relative ml-7 space-y-6 border-l-2 border-dashed border-border pl-7">
                    {blobItems.map((blobItem, blobIndex) => {
                      const isBlobActive = currentEpoch >= blobItem.epoch;
                      const nextBlobItem = blobIndex < blobItems.length - 1 ? blobItems[blobIndex + 1] : null;
                      const isCurrentBlob =
                        isBlobActive && (!nextBlobItem || currentEpoch < nextBlobItem.epoch) && isCurrentFork;

                      return (
                        <div key={`blob-${blobItem.epoch}`} className="relative flex items-start gap-x-4">
                          {/* Blob schedule icon */}
                          <div className="relative flex h-9 w-9 flex-none items-center justify-center">
                            <div
                              className={clsx(
                                'flex h-9 w-9 items-center justify-center rounded-lg ring-2 transition-all',
                                isCurrentBlob
                                  ? 'bg-accent/20 shadow-md ring-accent/30'
                                  : isBlobActive
                                    ? 'bg-surface ring-accent/10'
                                    : 'bg-surface ring-border'
                              )}
                            >
                              <ArrowTrendingUpIcon
                                className={clsx('h-5 w-5', isBlobActive ? 'text-accent' : 'text-muted')}
                              />
                            </div>
                          </div>

                          {/* Blob schedule content */}
                          <div className="min-w-0 flex-1 pt-0.5 pb-2">
                            <div className="flex flex-col gap-y-2 sm:flex-row sm:items-start sm:justify-between sm:gap-x-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-x-3">
                                  <h4
                                    className={clsx(
                                      'text-sm font-medium',
                                      isBlobActive ? 'text-foreground' : 'text-muted'
                                    )}
                                  >
                                    Blob Limit Increase
                                  </h4>
                                  {isCurrentBlob && (
                                    <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-muted">
                                  Max blobs per block: {blobItem.max_blobs_per_block}
                                </p>
                              </div>

                              <div className="flex flex-col items-start gap-y-2 sm:items-end">
                                <div className="flex items-center gap-x-2">
                                  <span className="text-xs text-muted">Epoch</span>
                                  <Epoch epoch={blobItem.epoch} />
                                </div>

                                {!isBlobActive
                                  ? (() => {
                                      const epochsUntil = blobItem.epoch - currentEpoch;
                                      const daysUntil = Math.floor((epochsUntil * 32 * 12) / 86400);

                                      if (daysUntil < 1) {
                                        return <p className="text-xs text-muted">Activates soon</p>;
                                      } else if (daysUntil < 60) {
                                        return <p className="text-xs text-muted">Activates in {daysUntil} days</p>;
                                      } else if (daysUntil < 730) {
                                        const months = Math.floor(daysUntil / 30);
                                        return <p className="text-xs text-muted">Activates in {months} months</p>;
                                      } else {
                                        const years = Math.floor(daysUntil / 365);
                                        const remainingMonths = Math.floor((daysUntil % 365) / 30);
                                        return (
                                          <p className="text-xs text-muted">
                                            Activates in {years}y {remainingMonths > 0 ? `${remainingMonths}m` : ''}
                                          </p>
                                        );
                                      }
                                    })()
                                  : blobIndex > 0
                                    ? (() => {
                                        const prevBlob = blobItems[blobIndex - 1];
                                        const epochsSincePrev = blobItem.epoch - prevBlob.epoch;
                                        const daysSincePrev = Math.floor((epochsSincePrev * 32 * 12) / 86400);

                                        if (daysSincePrev < 60) {
                                          return (
                                            <p className="text-xs text-muted">Activated {daysSincePrev} days ago</p>
                                          );
                                        } else if (daysSincePrev < 730) {
                                          const months = Math.floor(daysSincePrev / 30);
                                          return <p className="text-xs text-muted">Activated {months} months ago</p>;
                                        } else {
                                          const years = Math.floor(daysSincePrev / 365);
                                          const remainingMonths = Math.floor((daysSincePrev % 365) / 30);
                                          return (
                                            <p className="text-xs text-muted">
                                              Activated {years}y {remainingMonths > 0 ? `${remainingMonths}m` : ''} ago
                                            </p>
                                          );
                                        }
                                      })()
                                    : (() => {
                                        const epochsSinceActivation = currentEpoch - blobItem.epoch;
                                        const daysSinceActivation = Math.floor(
                                          (epochsSinceActivation * 32 * 12) / 86400
                                        );

                                        if (daysSinceActivation < 1) {
                                          return <p className="text-xs text-muted">Activated recently</p>;
                                        } else if (daysSinceActivation < 60) {
                                          return (
                                            <p className="text-xs text-muted">
                                              Activated {daysSinceActivation} days ago
                                            </p>
                                          );
                                        } else if (daysSinceActivation < 730) {
                                          const months = Math.floor(daysSinceActivation / 30);
                                          return <p className="text-xs text-muted">Activated {months} months ago</p>;
                                        } else {
                                          const years = Math.floor(daysSinceActivation / 365);
                                          const remainingMonths = Math.floor((daysSinceActivation % 365) / 30);
                                          return (
                                            <p className="text-xs text-muted">
                                              Activated {years}y {remainingMonths > 0 ? `${remainingMonths}m` : ''} ago
                                            </p>
                                          );
                                        }
                                      })()}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {forks.length === 0 && (
          <div className="mt-6 flex h-32 items-center justify-center">
            <p className="text-sm text-muted">No forks or blob schedule configured for this network</p>
          </div>
        )}
      </div>
    </Card>
  );
}
