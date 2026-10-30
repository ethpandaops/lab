import { buttonClassName } from '@/components/Elements/Button';
import { Card } from '@/components/Layout/Card';
import { Timestamp } from '@/components/DataDisplay/Timestamp';
import type { ForkInfo } from '@/utils/forks';
import { epochToTimestamp } from '@/utils/beacon';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/20/solid';
import { useNetwork } from '@/hooks/useNetwork';
import { useState, useEffect } from 'react';
import { Link } from '@tanstack/react-router';
import {
  ForkCountdown,
  ForkCountdownSkeleton,
  ForkQuickLinks,
  secondsToCountdown,
  type CountdownTime,
} from '../ForkShared';

interface ForksHeaderProps {
  activeFork: ForkInfo | null;
  nextFork: ForkInfo | null;
  currentEpoch: number;
  allForks: ForkInfo[];
}

/** Roadmap and Forkcast links shown in the top row of the card */
function ExternalLinks({ combinedName }: { combinedName?: string }): React.JSX.Element {
  const linkClass = 'inline-flex items-center gap-1 text-xs text-muted hover:text-foreground';

  return (
    <div className="flex items-center gap-2">
      <a href="https://ethereum.org/en/roadmap/" target="_blank" rel="noopener noreferrer" className={linkClass}>
        Roadmap
        <ArrowTopRightOnSquareIcon className="h-3 w-3" />
      </a>
      <span className="text-border">•</span>
      <a
        href={combinedName ? `https://forkcast.org/upgrade/${combinedName}` : 'https://forkcast.org'}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClass}
      >
        Forkcast
        <ArrowTopRightOnSquareIcon className="h-3 w-3" />
      </a>
    </div>
  );
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

  const [countdown, setCountdown] = useState<CountdownTime>(() => secondsToCountdown(calculateSecondsUntilFork()));

  useEffect(() => {
    if (!nextFork || !currentNetwork?.genesis_time) return;

    const updateCountdown = (): void => {
      setCountdown(secondsToCountdown(calculateSecondsUntilFork()));
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
        <div className="mb-6 flex items-center justify-between">
          {/* Left: Empty for symmetry */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted"></span>
          </div>

          {/* Right: External links */}
          <ExternalLinks combinedName={activeFork.combinedName} />
        </div>

        {/* Center: Current active fork info */}
        <div className="mb-6 text-center">
          <div className="mb-3 text-8xl">{activeFork.emoji}</div>
          <div className="mb-2 text-xs font-medium text-accent">Currently Active</div>
          <h2 className="text-3xl font-semibold text-foreground">{activeFork.displayName}</h2>
          <p className="mt-3 text-sm text-muted">{activeFork.description}</p>
          {timeSinceActivation && <p className="mt-2 text-sm text-muted">{timeSinceActivation}</p>}
        </div>

        {/* "LIVE NOW" display instead of countdown */}
        <div className="mb-6 flex items-center justify-center gap-4 rounded-sm border border-border py-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-success">LIVE NOW</div>
          </div>
        </div>

        {/* Action buttons */}
        <ForkQuickLinks epoch={activeFork.epoch}>
          <Link to="/ethereum/live" className={buttonClassName({ variant: 'secondary', size: 'xs' })}>
            Live View
          </Link>
        </ForkQuickLinks>
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
        <ExternalLinks combinedName={nextFork.combinedName} />
      </div>

      {/* Center: Next upgrade info */}
      <div className="mb-6 text-center">
        <div className="mb-3 text-8xl">{nextFork.emoji}</div>
        <div className="mb-2 text-xs font-medium text-accent">Next Upgrade</div>
        <h2 className="text-3xl font-semibold text-foreground">{nextFork.displayName}</h2>
        <p className="mt-3 text-sm text-muted">{nextFork.description}</p>
        {currentNetwork?.genesis_time && (
          <div className="mt-4 text-base font-medium text-foreground">
            Local Time:{' '}
            <Timestamp timestamp={epochToTimestamp(nextFork.epoch, currentNetwork.genesis_time)} format="long" />
          </div>
        )}
      </div>

      {/* Countdown display */}
      {!currentNetwork?.genesis_time ? <ForkCountdownSkeleton /> : <ForkCountdown countdown={countdown} />}

      {/* Action buttons */}
      <ForkQuickLinks epoch={nextFork.epoch}>
        <Link to="/ethereum/live" className={buttonClassName({ variant: 'secondary', size: 'xs' })}>
          Live View
        </Link>
      </ForkQuickLinks>
    </Card>
  );
}
