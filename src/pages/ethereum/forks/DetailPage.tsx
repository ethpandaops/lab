import { useParams, useNavigate, Link } from '@tanstack/react-router';
import { useMemo, useEffect, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';
import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { Alert } from '@/components/Feedback/Alert';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Card } from '@/components/Layout/Card';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { Button } from '@/components/Elements/Button';
import { Epoch } from '@/components/Ethereum/Epoch';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import { useNetwork } from '@/hooks/useNetwork';
import { useBeaconClock } from '@/hooks/useBeaconClock';
import { useForks } from '@/hooks/useForks';
import { useNetworkChangeRedirect } from '@/hooks/useNetworkChangeRedirect';
import {
  getForkBySlug,
  getForkSlug,
  isBPOSlug,
  getBPOBySlug,
  getNetworkBPOs,
  getBPOSlugForBlobItem,
  type ForkInfo,
  type BPOInfo,
} from '@/utils/forks';
import { epochToTimestamp } from '@/utils/beacon';
import { Route } from '@/routes/ethereum/forks/$fork';

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/**
 * Fork detail page - comprehensive information about a specific network upgrade.
 *
 * Shows:
 * - Fork status (active, upcoming, or not configured)
 * - Activation epoch and timestamp
 * - Countdown for upcoming forks
 * - Related blob schedule changes
 * - Navigation to adjacent forks
 *
 * Also supports BPO (Blob Parameter-Only) forks via slugs like "bpo1", "bpo2"
 */
export function DetailPage(): React.JSX.Element {
  const params = useParams({ from: '/ethereum/forks/$fork' });
  const context = Route.useRouteContext();
  const navigate = useNavigate();

  // Redirect to forks index when network changes
  useNetworkChangeRedirect(context.redirectOnNetworkChange);

  const { currentNetwork, isLoading: isNetworkLoading } = useNetwork();
  const { epoch: currentEpoch } = useBeaconClock();
  const { allForks, isLoading: isForksLoading } = useForks();

  // Check if this is a BPO slug
  const isBPO = isBPOSlug(params.fork);

  // Find the fork or BPO by slug
  const fork = useMemo(() => {
    if (!currentNetwork) return null;
    if (isBPO) return null; // BPOs are handled separately
    return getForkBySlug(currentNetwork, params.fork, currentEpoch);
  }, [currentNetwork, params.fork, currentEpoch, isBPO]);

  const bpo = useMemo(() => {
    if (!currentNetwork || !isBPO) return null;
    return getBPOBySlug(currentNetwork, params.fork.toLowerCase(), currentEpoch);
  }, [currentNetwork, params.fork, currentEpoch, isBPO]);

  // Get all BPOs for navigation
  const allBPOs = useMemo(() => {
    if (!currentNetwork) return [];
    return getNetworkBPOs(currentNetwork, currentEpoch);
  }, [currentNetwork, currentEpoch]);

  // Find adjacent forks/BPOs for navigation
  const { previousFork, nextFork } = useMemo(() => {
    if (isBPO && bpo) {
      // For BPO, navigate between BPOs
      const currentIndex = allBPOs.findIndex(b => b.slug === bpo.slug);
      return {
        previousFork: currentIndex > 0 ? allBPOs[currentIndex - 1] : null,
        nextFork: currentIndex < allBPOs.length - 1 ? allBPOs[currentIndex + 1] : null,
      };
    }

    if (!fork || allForks.length === 0) {
      return { previousFork: null, nextFork: null };
    }

    const currentIndex = allForks.findIndex(f => f.name === fork.name);
    return {
      previousFork: currentIndex > 0 ? allForks[currentIndex - 1] : null,
      nextFork: currentIndex < allForks.length - 1 ? allForks[currentIndex + 1] : null,
    };
  }, [fork, allForks, isBPO, bpo, allBPOs]);

  // Keyboard navigation between forks
  useEffect(() => {
    if (!fork && !bpo) return;

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement
      ) {
        return;
      }

      if (event.key === 'ArrowLeft' && previousFork) {
        event.preventDefault();
        const slug = isBPO ? (previousFork as BPOInfo).slug : getForkSlug(previousFork as ForkInfo);
        navigate({ to: '/ethereum/forks/$fork', params: { fork: slug } });
      } else if (event.key === 'ArrowRight' && nextFork) {
        event.preventDefault();
        const slug = isBPO ? (nextFork as BPOInfo).slug : getForkSlug(nextFork as ForkInfo);
        navigate({ to: '/ethereum/forks/$fork', params: { fork: slug } });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fork, bpo, previousFork, nextFork, navigate, isBPO]);

  const isLoading = isNetworkLoading || isForksLoading;

  if (isLoading) {
    return (
      <Container>
        <Header title="Fork Details" description="Loading fork information..." />
        <LoadingContainer className="h-96" />
      </Container>
    );
  }

  // Handle BPO pages
  if (isBPO) {
    if (!bpo) {
      return (
        <Container>
          <Header title="BPO Not Found" description={`The BPO "${params.fork}" is not configured on this network`} />
          <Alert
            variant="warning"
            title="BPO Not Available"
            description={`The BPO "${params.fork}" is not scheduled for this network. BPO forks are blob parameter changes that occur independently of consensus forks.`}
          />
        </Container>
      );
    }

    return (
      <BPODetailContent
        bpo={bpo}
        allBPOs={allBPOs}
        previousBPO={previousFork as BPOInfo | null}
        nextBPO={nextFork as BPOInfo | null}
        currentEpoch={currentEpoch}
        genesisTime={currentNetwork?.genesis_time}
        navigate={navigate}
      />
    );
  }

  // Handle regular fork pages
  if (!fork) {
    return (
      <Container>
        <Header title="Fork Not Found" description={`The fork "${params.fork}" is not configured on this network`} />
        <Alert
          variant="warning"
          title="Fork Not Available"
          description={`The fork "${params.fork}" is not scheduled for this network. It may be a future upgrade that hasn't been announced yet, or the network may not support this fork.`}
        />
      </Container>
    );
  }

  return (
    <ForkDetailContent
      fork={fork}
      allForks={allForks}
      previousFork={previousFork as ForkInfo | null}
      nextFork={nextFork as ForkInfo | null}
      currentEpoch={currentEpoch}
      currentNetwork={currentNetwork}
      navigate={navigate}
    />
  );
}

interface ForkDetailContentProps {
  fork: ForkInfo;
  allForks: ForkInfo[];
  previousFork: ForkInfo | null;
  nextFork: ForkInfo | null;
  currentEpoch: number;
  currentNetwork: ReturnType<typeof useNetwork>['currentNetwork'];
  navigate: ReturnType<typeof useNavigate>;
}

function ForkDetailContent({
  fork,
  previousFork,
  nextFork,
  currentEpoch,
  currentNetwork,
  navigate,
}: ForkDetailContentProps): React.JSX.Element {
  const [countdown, setCountdown] = useState<CountdownTime>(() => {
    const secondsUntilFork = calculateSecondsUntil(fork.epoch, fork.isActive, currentNetwork?.genesis_time);
    return secondsToCountdown(secondsUntilFork);
  });

  useEffect(() => {
    if (fork.isActive || !currentNetwork?.genesis_time) return;

    const updateCountdown = (): void => {
      const secondsUntilFork = calculateSecondsUntil(fork.epoch, fork.isActive, currentNetwork.genesis_time);
      setCountdown(secondsToCountdown(secondsUntilFork));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [fork, currentNetwork]);

  // Get blob schedule items for this fork
  const blobItems = useMemo(() => {
    if (!currentNetwork?.blob_schedule) return [];

    const nextForkEpoch = nextFork?.epoch ?? Infinity;
    return currentNetwork.blob_schedule
      .filter(item => item.epoch >= fork.epoch && item.epoch < nextForkEpoch)
      .sort((a, b) => a.epoch - b.epoch);
  }, [fork, nextFork, currentNetwork]);

  const isCurrentFork = fork.isActive && (!nextFork || currentEpoch < nextFork.epoch);

  return (
    <Container>
      {/* Navigation Controls */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <Button
          variant="secondary"
          size="sm"
          rounded="sm"
          leadingIcon={<ChevronLeftIcon />}
          onClick={() => navigate({ to: '/ethereum/forks' })}
          aria-label="All forks"
        >
          All Forks
        </Button>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            rounded="sm"
            leadingIcon={<ChevronLeftIcon />}
            disabled={!previousFork}
            onClick={() =>
              previousFork && navigate({ to: '/ethereum/forks/$fork', params: { fork: getForkSlug(previousFork) } })
            }
            aria-label="Previous fork"
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            rounded="sm"
            trailingIcon={<ChevronRightIcon />}
            disabled={!nextFork}
            onClick={() =>
              nextFork && navigate({ to: '/ethereum/forks/$fork', params: { fork: getForkSlug(nextFork) } })
            }
            aria-label="Next fork"
          >
            Next
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <ForkHero
          fork={fork}
          isCurrentFork={isCurrentFork}
          previousFork={previousFork}
          countdown={countdown}
          genesisTime={currentNetwork?.genesis_time}
        />

        {blobItems.length > 0 && (
          <BlobScheduleCard
            blobItems={blobItems}
            currentEpoch={currentEpoch}
            isCurrentFork={isCurrentFork}
            network={currentNetwork}
            genesisTime={currentNetwork?.genesis_time}
          />
        )}

        <ForkLinksCard fork={fork} />
      </div>
    </Container>
  );
}

interface BPODetailContentProps {
  bpo: BPOInfo;
  allBPOs: BPOInfo[];
  previousBPO: BPOInfo | null;
  nextBPO: BPOInfo | null;
  currentEpoch: number;
  genesisTime?: number;
  navigate: ReturnType<typeof useNavigate>;
}

function BPODetailContent({
  bpo,
  previousBPO,
  nextBPO,
  currentEpoch,
  genesisTime,
  navigate,
}: BPODetailContentProps): React.JSX.Element {
  const [countdown, setCountdown] = useState<CountdownTime>(() => {
    const secondsUntil = calculateSecondsUntil(bpo.epoch, bpo.isActive, genesisTime);
    return secondsToCountdown(secondsUntil);
  });

  useEffect(() => {
    if (bpo.isActive || !genesisTime) return;

    const updateCountdown = (): void => {
      const secondsUntil = calculateSecondsUntil(bpo.epoch, bpo.isActive, genesisTime);
      setCountdown(secondsToCountdown(secondsUntil));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [bpo, genesisTime]);

  // Determine if this is the current BPO
  const isCurrentBPO = bpo.isActive && (!nextBPO || currentEpoch < nextBPO.epoch);

  return (
    <Container>
      {/* Navigation Controls */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <Button
          variant="secondary"
          size="sm"
          rounded="sm"
          leadingIcon={<ChevronLeftIcon />}
          onClick={() => navigate({ to: '/ethereum/forks' })}
          aria-label="All forks"
        >
          All Forks
        </Button>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            rounded="sm"
            leadingIcon={<ChevronLeftIcon />}
            disabled={!previousBPO}
            onClick={() => previousBPO && navigate({ to: '/ethereum/forks/$fork', params: { fork: previousBPO.slug } })}
            aria-label="Previous BPO"
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            rounded="sm"
            trailingIcon={<ChevronRightIcon />}
            disabled={!nextBPO}
            onClick={() => nextBPO && navigate({ to: '/ethereum/forks/$fork', params: { fork: nextBPO.slug } })}
            aria-label="Next BPO"
          >
            Next
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <BPOHero bpo={bpo} isCurrentBPO={isCurrentBPO} countdown={countdown} genesisTime={genesisTime} />

        <BPOParentForkCard bpo={bpo} />

        <BPOLinksCard />
      </div>
    </Container>
  );
}

// Helper functions
function calculateSecondsUntil(epoch: number, isActive: boolean, genesisTime?: number): number {
  if (isActive || !genesisTime) return 0;

  const slot = epoch * 32;
  const timestamp = genesisTime + slot * 12;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const seconds = timestamp - nowInSeconds;

  return Math.max(0, seconds);
}

function secondsToCountdown(seconds: number): CountdownTime {
  return {
    days: Math.floor(seconds / 86400),
    hours: Math.floor((seconds % 86400) / 3600),
    minutes: Math.floor((seconds % 3600) / 60),
    seconds: Math.floor(seconds % 60),
  };
}

interface ForkHeroProps {
  fork: ForkInfo;
  isCurrentFork: boolean;
  previousFork: ForkInfo | null;
  countdown: CountdownTime;
  genesisTime?: number;
}

function ForkHero({ fork, isCurrentFork, previousFork, countdown, genesisTime }: ForkHeroProps): React.JSX.Element {
  return (
    <Card>
      <div className="p-6">
        {/* Header with emoji and status badges */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 text-5xl">{fork.emoji}</div>
          <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
            <h2 className="text-2xl font-bold text-foreground">{fork.displayName}</h2>
            {isCurrentFork && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                Current
              </span>
            )}
            {fork.isActive && !isCurrentFork && (
              <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">Active</span>
            )}
            {!fork.isActive && (
              <span className="rounded-full bg-muted/20 px-2.5 py-0.5 text-xs font-semibold text-muted">Upcoming</span>
            )}
          </div>
          <p className="text-sm text-muted">{fork.description}</p>
        </div>

        {/* Status display */}
        {fork.isActive ? (
          <div className="mb-6 flex items-center justify-center gap-4 rounded-lg bg-accent/5 py-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-accent">{isCurrentFork ? 'LIVE NOW' : 'ACTIVATED'}</div>
              {genesisTime && (
                <div className="mt-2 text-sm text-muted">
                  <Timestamp timestamp={epochToTimestamp(fork.epoch, genesisTime)} format="long" />
                </div>
              )}
            </div>
          </div>
        ) : (
          <CountdownDisplay countdown={countdown} genesisTime={genesisTime} epoch={fork.epoch} />
        )}

        {/* Quick links */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link
            to="/ethereum/epochs/$epoch"
            params={{ epoch: fork.epoch.toString() }}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface"
          >
            Epoch {fork.epoch}
          </Link>
          <Link
            to="/ethereum/slots/$slot"
            params={{ slot: (fork.epoch * 32).toString() }}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface"
          >
            Slot {fork.epoch * 32}
          </Link>
          {previousFork && (
            <Link
              to="/ethereum/forks/$fork"
              params={{ fork: getForkSlug(previousFork) }}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface"
            >
              {previousFork.displayName}
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}

interface BPOHeroProps {
  bpo: BPOInfo;
  isCurrentBPO: boolean;
  countdown: CountdownTime;
  genesisTime?: number;
}

function BPOHero({ bpo, isCurrentBPO, countdown, genesisTime }: BPOHeroProps): React.JSX.Element {
  return (
    <Card>
      <div className="p-6">
        {/* Header with emoji and status badges */}
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 text-5xl">{bpo.emoji}</div>
          <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
            <h2 className="text-2xl font-bold text-foreground">Blob Parameter-Only Fork {bpo.sequenceNumber}</h2>
            {isCurrentBPO && (
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                Current
              </span>
            )}
            {bpo.isActive && !isCurrentBPO && (
              <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-semibold text-accent">Active</span>
            )}
            {!bpo.isActive && (
              <span className="rounded-full bg-muted/20 px-2.5 py-0.5 text-xs font-semibold text-muted">Upcoming</span>
            )}
          </div>
          <p className="text-sm text-muted">
            Max blobs per block: <span className="font-semibold text-foreground">{bpo.maxBlobsPerBlock}</span>
          </p>
        </div>

        {/* Status display */}
        {bpo.isActive ? (
          <div className="mb-6 flex items-center justify-center gap-4 rounded-lg bg-accent/5 py-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-accent">{isCurrentBPO ? 'LIVE NOW' : 'ACTIVATED'}</div>
              {genesisTime && (
                <div className="mt-2 text-sm text-muted">
                  <Timestamp timestamp={epochToTimestamp(bpo.epoch, genesisTime)} format="long" />
                </div>
              )}
            </div>
          </div>
        ) : (
          <CountdownDisplay countdown={countdown} genesisTime={genesisTime} epoch={bpo.epoch} />
        )}

        {/* Quick links */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link
            to="/ethereum/epochs/$epoch"
            params={{ epoch: bpo.epoch.toString() }}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface"
          >
            Epoch {bpo.epoch}
          </Link>
          <Link
            to="/ethereum/slots/$slot"
            params={{ slot: (bpo.epoch * 32).toString() }}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface"
          >
            Slot {bpo.epoch * 32}
          </Link>
          <Link
            to="/ethereum/forks/$fork"
            params={{ fork: getForkSlug(bpo.parentFork) }}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface"
          >
            {bpo.parentFork.displayName}
          </Link>
        </div>
      </div>
    </Card>
  );
}

interface CountdownDisplayProps {
  countdown: CountdownTime;
  genesisTime?: number;
  epoch: number;
}

function CountdownDisplay({ countdown, genesisTime, epoch }: CountdownDisplayProps): React.JSX.Element {
  return (
    <div className="mb-6 rounded-lg bg-accent/5 py-6">
      <div className="mb-3 text-center text-xs font-medium tracking-wider text-muted uppercase">Goes Live In</div>
      <div className="flex items-center justify-center gap-4">
        {countdown.days > 0 && (
          <>
            <div className="text-center">
              <div className="text-4xl font-bold text-accent tabular-nums">{countdown.days}</div>
              <div className="mt-1 text-xs tracking-wider text-muted uppercase">days</div>
            </div>
            <div className="text-2xl text-muted">:</div>
          </>
        )}
        <div className="text-center">
          <div className="text-4xl font-bold text-accent tabular-nums">{countdown.hours}</div>
          <div className="mt-1 text-xs tracking-wider text-muted uppercase">hours</div>
        </div>
        <div className="text-2xl text-muted">:</div>
        <div className="text-center">
          <div className="text-4xl font-bold text-accent tabular-nums">{countdown.minutes}</div>
          <div className="mt-1 text-xs tracking-wider text-muted uppercase">minutes</div>
        </div>
        <div className="text-2xl text-muted">:</div>
        <div className="text-center">
          <div className="text-4xl font-bold text-accent tabular-nums">{countdown.seconds}</div>
          <div className="mt-1 text-xs tracking-wider text-muted uppercase">seconds</div>
        </div>
      </div>
      {genesisTime && (
        <div className="mt-4 text-center text-sm text-muted">
          Local Time: <Timestamp timestamp={epochToTimestamp(epoch, genesisTime)} format="long" />
        </div>
      )}
    </div>
  );
}

interface BPOParentForkCardProps {
  bpo: BPOInfo;
}

function BPOParentForkCard({ bpo }: BPOParentForkCardProps): React.JSX.Element {
  return (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-foreground">Parent Fork</h3>
        <p className="mt-1 text-sm text-muted">
          This BPO is a blob parameter change within the {bpo.parentFork.displayName} fork
        </p>

        <div className="mt-6">
          <Link
            to="/ethereum/forks/$fork"
            params={{ fork: getForkSlug(bpo.parentFork) }}
            className="group flex items-center gap-4 rounded-lg border border-border p-4 transition-colors hover:bg-surface"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-surface text-2xl ring-2 ring-border transition-all group-hover:ring-accent/30">
              {bpo.parentFork.emoji}
            </div>
            <div className="flex-1">
              <div className="text-lg font-semibold text-foreground">{bpo.parentFork.displayName}</div>
              <div className="text-sm text-muted">{bpo.parentFork.description}</div>
            </div>
            <ChevronRightIcon className="h-5 w-5 text-muted transition-colors group-hover:text-foreground" />
          </Link>
        </div>
      </div>
    </Card>
  );
}

interface BlobScheduleCardProps {
  blobItems: Array<{ epoch: number; max_blobs_per_block: number }>;
  currentEpoch: number;
  isCurrentFork: boolean;
  network?: ReturnType<typeof useNetwork>['currentNetwork'];
  genesisTime?: number;
}

function BlobScheduleCard({
  blobItems,
  currentEpoch,
  isCurrentFork,
  network,
  genesisTime,
}: BlobScheduleCardProps): React.JSX.Element {
  return (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-foreground">Blob Schedule</h3>
        <p className="mt-1 text-sm text-muted">Blob throughput changes during this fork</p>

        <div className="mt-6 space-y-4">
          {blobItems.map((item, index) => {
            const isActive = currentEpoch >= item.epoch;
            const nextItem = index < blobItems.length - 1 ? blobItems[index + 1] : null;
            const isCurrent = isActive && (!nextItem || currentEpoch < nextItem.epoch) && isCurrentFork;
            const bpoSlug = network ? getBPOSlugForBlobItem(network, item, currentEpoch) : null;

            const content = (
              <>
                <div className="relative flex h-9 w-9 flex-none items-center justify-center">
                  <div
                    className={clsx(
                      'flex h-9 w-9 items-center justify-center rounded-lg ring-2 transition-all',
                      isCurrent
                        ? 'bg-accent/20 shadow-md ring-accent/30'
                        : isActive
                          ? 'bg-surface ring-accent/10'
                          : 'bg-surface ring-border'
                    )}
                  >
                    <ArrowTrendingUpIcon className={clsx('h-5 w-5', isActive ? 'text-accent' : 'text-muted')} />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-y-2">
                    <div className="flex flex-col gap-y-2 sm:flex-row sm:items-start sm:justify-between sm:gap-x-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-x-3">
                          <span className={clsx('text-sm font-medium', isActive ? 'text-foreground' : 'text-muted')}>
                            {bpoSlug ? `${bpoSlug.toUpperCase()} - ` : ''}Max {item.max_blobs_per_block} blobs per block
                          </span>
                          {isCurrent && (
                            <span className="rounded-full bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                              Active
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-x-2">
                        <span className="text-xs text-muted">Epoch</span>
                        <Epoch epoch={item.epoch} />
                      </div>
                    </div>

                    {genesisTime && (
                      <div className="text-xs text-muted">
                        <Timestamp timestamp={epochToTimestamp(item.epoch, genesisTime)} format="relative" />
                      </div>
                    )}
                  </div>
                </div>
              </>
            );

            if (bpoSlug) {
              return (
                <Link
                  key={item.epoch}
                  to="/ethereum/forks/$fork"
                  params={{ fork: bpoSlug }}
                  className="-m-2 flex items-start gap-4 rounded-lg p-2 transition-colors hover:bg-surface"
                >
                  {content}
                </Link>
              );
            }

            return (
              <div key={item.epoch} className="flex items-start gap-4">
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

interface ForkLinksCardProps {
  fork: ForkInfo;
}

function ForkLinksCard({ fork }: ForkLinksCardProps): React.JSX.Element {
  const links = [
    {
      label: 'Ethereum Roadmap',
      href: 'https://ethereum.org/en/roadmap/',
      description: 'Official Ethereum roadmap and upgrade timeline',
    },
    ...(fork.combinedName
      ? [
          {
            label: 'Forkcast',
            href: `https://forkcast.org/upgrade/${fork.combinedName}`,
            description: `Detailed tracking for the ${fork.combinedName} upgrade`,
          },
          {
            label: 'ethereum.org',
            href: `https://ethereum.org/roadmap/${fork.combinedName}`,
            description: `Official documentation for ${fork.combinedName}`,
          },
        ]
      : [
          {
            label: 'Forkcast',
            href: 'https://forkcast.org',
            description: 'Track Ethereum network upgrades',
          },
        ]),
  ];

  return (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-foreground">External Resources</h3>
        <p className="mt-1 text-sm text-muted">Learn more about this upgrade</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map(link => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-surface"
            >
              <ArrowTopRightOnSquareIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-foreground" />
              <div>
                <div className="text-sm font-medium text-foreground">{link.label}</div>
                <div className="mt-1 text-xs text-muted">{link.description}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </Card>
  );
}

function BPOLinksCard(): React.JSX.Element {
  const links = [
    {
      label: 'EIP-7892',
      href: 'https://eips.ethereum.org/EIPS/eip-7892',
      description: 'Blob Parameter-Only Forks specification',
    },
    {
      label: 'Ethereum Roadmap',
      href: 'https://ethereum.org/en/roadmap/',
      description: 'Official Ethereum roadmap and upgrade timeline',
    },
    {
      label: 'Forkcast',
      href: 'https://forkcast.org',
      description: 'Track Ethereum network upgrades',
    },
  ];

  return (
    <Card>
      <div className="p-6">
        <h3 className="text-lg font-semibold text-foreground">External Resources</h3>
        <p className="mt-1 text-sm text-muted">Learn more about BPO forks</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {links.map(link => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-surface"
            >
              <ArrowTopRightOnSquareIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted transition-colors group-hover:text-foreground" />
              <div>
                <div className="text-sm font-medium text-foreground">{link.label}</div>
                <div className="mt-1 text-xs text-muted">{link.description}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </Card>
  );
}
