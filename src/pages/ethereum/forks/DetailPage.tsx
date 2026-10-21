import { useParams, useNavigate, Link } from '@tanstack/react-router';
import { useMemo, useEffect, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { Alert } from '@/components/Feedback/Alert';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Card } from '@/components/Layout/Card';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { Badge } from '@/components/Elements/Badge';
import { Button, buttonClassName } from '@/components/Elements/Button';
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
import {
  ExternalResourcesCard,
  ForkCountdown,
  ForkQuickLinks,
  ForkStatusBadge,
  secondsToCountdown,
  type CountdownTime,
} from './components/ForkShared';
import { Route } from '@/routes/ethereum/forks/$fork';

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
        <Header title="Fork Details" />
        <LoadingContainer className="h-96" />
      </Container>
    );
  }

  // Handle BPO pages
  if (isBPO) {
    if (!bpo) {
      return (
        <Container>
          <Header title="BPO Not Found" />
          <Alert
            variant="warning"
            title="BPO Not Available"
            description={`The BPO "${params.fork}" is not scheduled for this network.`}
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
        <Header title="Fork Not Found" />
        <Alert
          variant="warning"
          title="Fork Not Available"
          description={`The fork "${params.fork}" is not scheduled for this network.`}
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

interface ForkHeroProps {
  fork: ForkInfo;
  isCurrentFork: boolean;
  previousFork: ForkInfo | null;
  countdown: CountdownTime;
  genesisTime?: number;
}

/** Centered status block: "LIVE NOW" / "ACTIVATED" with its date, or the countdown while upcoming */
function ActivationStatus({
  isActive,
  isCurrent,
  epoch,
  countdown,
  genesisTime,
}: {
  isActive: boolean;
  isCurrent: boolean;
  epoch: number;
  countdown: CountdownTime;
  genesisTime?: number;
}): React.JSX.Element {
  if (!isActive) {
    return (
      <ForkCountdown
        countdown={countdown}
        footer={
          genesisTime && (
            <div className="mt-4 text-center text-sm text-muted">
              Local Time: <Timestamp timestamp={epochToTimestamp(epoch, genesisTime)} format="long" />
            </div>
          )
        }
      />
    );
  }

  return (
    <div className="mb-6 flex items-center justify-center gap-4 rounded-sm border border-border py-6">
      <div className="text-center">
        <div className="text-4xl font-bold text-accent">{isCurrent ? 'LIVE NOW' : 'ACTIVATED'}</div>
        {genesisTime && (
          <div className="mt-2 text-sm text-muted">
            <Timestamp timestamp={epochToTimestamp(epoch, genesisTime)} format="long" />
          </div>
        )}
      </div>
    </div>
  );
}

function ForkHero({ fork, isCurrentFork, previousFork, countdown, genesisTime }: ForkHeroProps): React.JSX.Element {
  return (
    <Card>
      {/* Header with emoji and status badges */}
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-4 text-5xl">{fork.emoji}</div>
        <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
          <h2 className="text-2xl font-semibold text-foreground">{fork.displayName}</h2>
          <ForkStatusBadge isActive={fork.isActive} isCurrent={isCurrentFork} />
        </div>
        <p className="text-sm text-muted">{fork.description}</p>
      </div>

      <ActivationStatus
        isActive={fork.isActive}
        isCurrent={isCurrentFork}
        epoch={fork.epoch}
        countdown={countdown}
        genesisTime={genesisTime}
      />

      {/* Quick links */}
      <ForkQuickLinks epoch={fork.epoch}>
        {previousFork && (
          <Link
            to="/ethereum/forks/$fork"
            params={{ fork: getForkSlug(previousFork) }}
            className={buttonClassName({ variant: 'secondary', size: 'xs' })}
          >
            {previousFork.displayName}
          </Link>
        )}
      </ForkQuickLinks>
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
      {/* Header with emoji and status badges */}
      <div className="mb-6 flex flex-col items-center text-center">
        <div className="mb-4 text-5xl">{bpo.emoji}</div>
        <div className="mb-2 flex flex-wrap items-center justify-center gap-2">
          <h2 className="text-2xl font-semibold text-foreground">Blob Parameter-Only Fork {bpo.sequenceNumber}</h2>
          <ForkStatusBadge isActive={bpo.isActive} isCurrent={isCurrentBPO} />
        </div>
        <p className="text-sm text-muted">
          Max blobs per block: <span className="font-semibold text-foreground">{bpo.maxBlobsPerBlock}</span>
        </p>
      </div>

      <ActivationStatus
        isActive={bpo.isActive}
        isCurrent={isCurrentBPO}
        epoch={bpo.epoch}
        countdown={countdown}
        genesisTime={genesisTime}
      />

      {/* Quick links */}
      <ForkQuickLinks epoch={bpo.epoch}>
        <Link
          to="/ethereum/forks/$fork"
          params={{ fork: getForkSlug(bpo.parentFork) }}
          className={buttonClassName({ variant: 'secondary', size: 'xs' })}
        >
          {bpo.parentFork.displayName}
        </Link>
      </ForkQuickLinks>
    </Card>
  );
}

interface BPOParentForkCardProps {
  bpo: BPOInfo;
}

function BPOParentForkCard({ bpo }: BPOParentForkCardProps): React.JSX.Element {
  return (
    <Card title="Parent Fork">
      <Link
        to="/ethereum/forks/$fork"
        params={{ fork: getForkSlug(bpo.parentFork) }}
        className="group flex items-center gap-4 rounded-sm border border-border p-4 transition-colors hover:bg-background"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-border bg-surface text-2xl transition-colors group-hover:border-accent/30">
          {bpo.parentFork.emoji}
        </div>
        <div className="flex-1">
          <div className="text-lg font-semibold text-foreground">{bpo.parentFork.displayName}</div>
          <div className="text-sm text-muted">{bpo.parentFork.description}</div>
        </div>
        <ChevronRightIcon className="h-5 w-5 text-muted transition-colors group-hover:text-foreground" />
      </Link>
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
    <Card title="Blob Schedule" subtitle="Blob throughput changes during this fork">
      <div className="space-y-4">
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
                    'flex h-9 w-9 items-center justify-center rounded-sm border transition-colors',
                    isCurrent
                      ? 'border-accent/30 bg-accent/20'
                      : isActive
                        ? 'border-accent/20 bg-surface'
                        : 'border-border bg-surface'
                  )}
                >
                  <ArrowTrendingUpIcon className={clsx('h-5 w-5', isActive ? 'text-accent' : 'text-muted')} />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-col gap-y-2 sm:flex-row sm:items-start sm:justify-between sm:gap-x-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-x-3">
                      <span className={clsx('text-sm font-medium', isActive ? 'text-foreground' : 'text-muted')}>
                        {bpoSlug ? `${bpoSlug.toUpperCase()} - ` : ''}Max {item.max_blobs_per_block} blobs per block
                      </span>
                      {isCurrent && (
                        <Badge color="green" variant="flat">
                          Active
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-y-1">
                    <div className="flex items-center gap-x-2">
                      <span className="text-xs text-muted">Epoch</span>
                      <Epoch epoch={item.epoch} />
                    </div>
                    {genesisTime && (
                      <div className="text-xs text-muted">
                        <Timestamp timestamp={epochToTimestamp(item.epoch, genesisTime)} format="relative" />
                      </div>
                    )}
                  </div>
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
                className="-m-2 flex items-start gap-4 rounded-sm p-2 transition-colors hover:bg-background"
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

  return <ExternalResourcesCard links={links} />;
}

function BPOLinksCard(): React.JSX.Element {
  return (
    <ExternalResourcesCard
      links={[
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
      ]}
    />
  );
}
