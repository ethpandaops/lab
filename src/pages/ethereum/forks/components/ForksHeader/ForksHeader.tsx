import { Card } from '@/components/Layout/Card';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import type { ForkInfo } from '@/utils/forks';
import { epochToTimestamp } from '@/utils/beacon';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/20/solid';
import { useNetwork } from '@/hooks/useNetwork';
import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';

interface ForksHeaderProps {
  activeFork: ForkInfo | null;
  nextFork: ForkInfo | null;
  currentEpoch: number;
  allForks: ForkInfo[];
}

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function ForksHeader({ activeFork, nextFork, allForks }: ForksHeaderProps): React.JSX.Element {
  const { currentNetwork } = useNetwork();

  const calculateSecondsUntilFork = (): number => {
    if (!nextFork || !currentNetwork?.genesis_time) return 0;

    const forkSlot = nextFork.epoch * 32;
    const forkTimestamp = currentNetwork.genesis_time + forkSlot * 12;
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const secondsUntilFork = forkTimestamp - nowInSeconds;

    return Math.max(0, secondsUntilFork);
  };

  const [countdown, setCountdown] = useState<CountdownTime>(() => {
    const secondsUntilFork = calculateSecondsUntilFork();

    return {
      days: Math.floor(secondsUntilFork / 86400),
      hours: Math.floor((secondsUntilFork % 86400) / 3600),
      minutes: Math.floor((secondsUntilFork % 3600) / 60),
      seconds: Math.floor(secondsUntilFork % 60),
    };
  });

  useEffect(() => {
    if (!nextFork || !currentNetwork?.genesis_time) return;

    const updateCountdown = (): void => {
      const secondsUntilFork = calculateSecondsUntilFork();

      setCountdown({
        days: Math.floor(secondsUntilFork / 86400),
        hours: Math.floor((secondsUntilFork % 86400) / 3600),
        minutes: Math.floor((secondsUntilFork % 3600) / 60),
        seconds: Math.floor(secondsUntilFork % 60),
      });
    };

    // Update immediately when data is available
    updateCountdown();

    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nextFork, currentNetwork]);

  if (!nextFork && activeFork) {
    // Calculate time since activation for the current fork
    let timeSinceActivation = '';
    const activeForkIndex = allForks.findIndex(f => f.name === activeFork.name);
    const previousFork = activeForkIndex > 0 ? allForks[activeForkIndex - 1] : null;

    if (previousFork) {
      const epochsSinceActivation = activeFork.epoch - previousFork.epoch;
      const daysSinceActivation = Math.floor((epochsSinceActivation * 32 * 12) / 86400);

      if (daysSinceActivation === 0) {
        timeSinceActivation = 'Activated at genesis';
      } else if (daysSinceActivation < 60) {
        timeSinceActivation = `Activated ${daysSinceActivation} days after ${previousFork.displayName}`;
      } else if (daysSinceActivation < 730) {
        const months = Math.floor(daysSinceActivation / 30);
        timeSinceActivation = `Activated ${months} months after ${previousFork.displayName}`;
      } else {
        const years = Math.floor(daysSinceActivation / 365);
        const remainingMonths = Math.floor((daysSinceActivation % 365) / 30);
        timeSinceActivation = `Activated ${years}y${remainingMonths > 0 ? ` ${remainingMonths}m` : ''} after ${previousFork.displayName}`;
      }
    }

    return (
      <Card>
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            {/* Left: Empty for symmetry */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted"></span>
            </div>

            {/* Right: External links */}
            <div className="flex items-center gap-2">
              <a
                href="https://ethereum.org/en/roadmap/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
              >
                Roadmap
                <ArrowTopRightOnSquareIcon className="h-3 w-3" />
              </a>
              <span className="text-border">•</span>
              <a
                href={
                  activeFork.combinedName
                    ? `https://forkcast.org/upgrade/${activeFork.combinedName}`
                    : 'https://forkcast.org'
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
              >
                Forkcast
                <ArrowTopRightOnSquareIcon className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Center: Current active fork info */}
          <div className="mb-6 text-center">
            <div className="mb-3 text-8xl">{activeFork.emoji}</div>
            <div className="mb-2 text-xs font-medium tracking-wider text-accent uppercase">Currently Active</div>
            <h2 className="text-3xl font-bold text-foreground">{activeFork.displayName}</h2>
            <p className="mt-3 text-sm text-muted">{activeFork.description}</p>
            {timeSinceActivation && <p className="mt-2 text-sm text-muted">{timeSinceActivation}</p>}
          </div>

          {/* "LIVE NOW" display instead of countdown */}
          <div className="mb-6 flex items-center justify-center gap-4 rounded-lg bg-accent/5 py-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-accent">LIVE NOW</div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              to="/ethereum/epochs/$epoch"
              params={{ epoch: activeFork.epoch.toString() }}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface"
            >
              Epoch {activeFork.epoch}
            </Link>
            <Link
              to="/ethereum/slots/$slot"
              params={{ slot: (activeFork.epoch * 32).toString() }}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface"
            >
              Slot {activeFork.epoch * 32}
            </Link>
            <Link
              to="/ethereum/live"
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface"
            >
              Live View
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  // Should not happen - both activeFork and nextFork are null
  if (!nextFork) {
    return (
      <Card>
        <div className="p-6 text-center text-muted">No fork information available</div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          {/* Left: Current fork */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted">Active:</span>
            {activeFork && (
              <span className="font-medium text-foreground">
                {activeFork.emoji} {activeFork.displayName}
              </span>
            )}
          </div>

          {/* Right: External links */}
          <div className="flex items-center gap-2">
            <a
              href="https://ethereum.org/en/roadmap/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
            >
              Roadmap
              <ArrowTopRightOnSquareIcon className="h-3 w-3" />
            </a>
            <span className="text-border">•</span>
            <a
              href={
                nextFork.combinedName ? `https://forkcast.org/upgrade/${nextFork.combinedName}` : 'https://forkcast.org'
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground"
            >
              Forkcast
              <ArrowTopRightOnSquareIcon className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* Center: Next upgrade info */}
        <div className="mb-6 text-center">
          <div className="mb-3 text-8xl">{nextFork.emoji}</div>
          <div className="mb-2 text-xs font-medium tracking-wider text-accent uppercase">Next Upgrade</div>
          <h2 className="text-3xl font-bold text-foreground">{nextFork.displayName}</h2>
          <p className="mt-3 text-sm text-muted">{nextFork.description}</p>
          {currentNetwork?.genesis_time && (
            <div className="mt-4 text-base font-medium text-foreground">
              Local Time:{' '}
              <Timestamp timestamp={epochToTimestamp(nextFork.epoch, currentNetwork.genesis_time)} format="long" />
            </div>
          )}
        </div>

        {/* Countdown display */}
        {!currentNetwork?.genesis_time ? (
          <div className="mb-6 rounded-lg bg-accent/5 py-6">
            <div className="mb-3 text-center text-xs font-medium tracking-wider text-muted uppercase">Goes Live In</div>
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <div className="h-12 w-16 animate-pulse rounded bg-muted/20"></div>
                <div className="mt-1 text-xs tracking-wider text-muted uppercase">Days</div>
              </div>
              <div className="text-2xl text-muted">:</div>
              <div className="text-center">
                <div className="h-12 w-16 animate-pulse rounded bg-muted/20"></div>
                <div className="mt-1 text-xs tracking-wider text-muted uppercase">Hours</div>
              </div>
              <div className="text-2xl text-muted">:</div>
              <div className="text-center">
                <div className="h-12 w-16 animate-pulse rounded bg-muted/20"></div>
                <div className="mt-1 text-xs tracking-wider text-muted uppercase">Minutes</div>
              </div>
              <div className="text-2xl text-muted">:</div>
              <div className="text-center">
                <div className="h-12 w-16 animate-pulse rounded bg-muted/20"></div>
                <div className="mt-1 text-xs tracking-wider text-muted uppercase">Seconds</div>
              </div>
            </div>
          </div>
        ) : (
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
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Link
            to="/ethereum/epochs/$epoch"
            params={{ epoch: nextFork.epoch.toString() }}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface"
          >
            Epoch {nextFork.epoch}
          </Link>
          <Link
            to="/ethereum/slots/$slot"
            params={{ slot: (nextFork.epoch * 32).toString() }}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface"
          >
            Slot {nextFork.epoch * 32}
          </Link>
          <Link
            to="/ethereum/live"
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface"
          >
            Live View
          </Link>
        </div>
      </div>
    </Card>
  );
}
