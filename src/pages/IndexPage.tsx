import { type JSX, useState, useEffect, type FormEvent } from 'react';
import { Link } from '@tanstack/react-router';
import { Container } from '@/components/Layout/Container';
import { Card } from '@/components/Layout/Card';
import { BeakerIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import {
  PlayIcon,
  PauseIcon,
  ForwardIcon,
  BackwardIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
} from '@heroicons/react/20/solid';
import { Header } from '@/components/Layout/Header';
import { ButtonGroup } from '@/components/Elements/ButtonGroup';
import { SlotPlayerProvider } from '@/providers/SlotPlayerProvider';
import {
  useSlotPlayerState,
  useSlotPlayerConfig,
  useSlotPlayerActions,
  useSlotPlayerProgress,
  useSlotPlayerMeta,
} from '@/hooks/useSlotPlayer';
import { ProgressBar } from '@/components/Navigation/ProgressBar';
import { LoadingContainer } from '@/components/Layout/LoadingContainer';
import { SECONDS_PER_SLOT } from '@/utils/beacon';
import clsx from 'clsx';

// Simplified slot input with inline validation
function SlotInput(): JSX.Element {
  const { currentSlot } = useSlotPlayerState();
  const { minSlot, maxSlot } = useSlotPlayerConfig();
  const actions = useSlotPlayerActions();

  const [inputValue, setInputValue] = useState(currentSlot.toString());

  // Sync input value when currentSlot changes externally
  useEffect(() => {
    setInputValue(currentSlot.toString());
  }, [currentSlot]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const parsedSlot = parseInt(inputValue, 10);

    if (!isNaN(parsedSlot) && parsedSlot >= minSlot && parsedSlot <= maxSlot) {
      actions.goToSlot(parsedSlot);
    } else {
      setInputValue(currentSlot.toString());
    }
  };

  const handleBlur = (): void => {
    const parsedSlot = parseInt(inputValue, 10);

    if (!isNaN(parsedSlot) && parsedSlot >= minSlot && parsedSlot <= maxSlot) {
      actions.goToSlot(parsedSlot);
    } else {
      setInputValue(currentSlot.toString());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-1">
      <input
        id="slot-input"
        type="number"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onBlur={handleBlur}
        min={minSlot}
        max={maxSlot}
        className="w-24 rounded-sm border border-border bg-surface px-2 py-1 text-xs/5 text-foreground tabular-nums focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
        placeholder={currentSlot.toString()}
      />
    </form>
  );
}

// Compact slot progress - updates at 60fps
function CurrentSlotProgressBar(): JSX.Element {
  const { slotProgress } = useSlotPlayerProgress();
  const slotDuration = SECONDS_PER_SLOT * 1000;
  const progressPercentage = (slotProgress / slotDuration) * 100;

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-xs/5 text-muted">
        <span>Slot Progress</span>
        <span className="tabular-nums">
          {(slotProgress / 1000).toFixed(1)}s / {(slotDuration / 1000).toFixed(1)}s
        </span>
      </div>
      <ProgressBar
        progress={progressPercentage}
        ariaLabel="Slot playback progress"
        fillColor="bg-primary"
        disableTransition={true}
      />
    </div>
  );
}

// Compact historical position - only updates when slot changes
function HistoricalPositionBar(): JSX.Element {
  const { currentSlot } = useSlotPlayerState();
  const { minSlot, maxSlot } = useSlotPlayerConfig();
  const slotRangePercentage = maxSlot > minSlot ? ((currentSlot - minSlot) / (maxSlot - minSlot)) * 100 : 0;

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-xs/5 text-muted">
        <span className="tabular-nums">{minSlot.toLocaleString()}</span>
        <span>Historical Position</span>
        <span className="tabular-nums">{maxSlot.toLocaleString()}</span>
      </div>
      <ProgressBar progress={slotRangePercentage} ariaLabel="Historical slot range" fillColor="bg-accent" />
    </div>
  );
}

function SlotPlayerDemo(): JSX.Element {
  const { currentSlot, isPlaying, mode, isStale, staleBehindSlots, isLive, pauseReason } = useSlotPlayerState();
  const { playbackSpeed, minSlot, maxSlot } = useSlotPlayerConfig();
  const { isLoading, error } = useSlotPlayerMeta();
  const actions = useSlotPlayerActions();

  if (isLoading) {
    return <LoadingContainer />;
  }

  if (error) {
    return (
      <Card>
        <div className="text-error text-center">
          <p className="text-lg/7 font-semibold">Error loading slot bounds</p>
          <p className="text-sm/6 text-muted">{error.message}</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card>
        <div className="flex flex-col gap-2.5">
          {/* Compact Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl/8 font-bold text-foreground">{currentSlot.toLocaleString()}</span>
              <span className="text-sm/6 text-muted">
                {isPlaying ? 'Playing' : 'Paused'}
                {!isPlaying && pauseReason && ` (${pauseReason === 'boundary' ? 'Boundary' : 'Manual'})`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isLive ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs/5 font-medium text-success">
                  <span className="size-1.5 animate-pulse rounded-full bg-success" />
                  Live
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-muted/10 px-2.5 py-1 text-xs/5 font-medium text-muted">
                  Historical
                </span>
              )}
              {isStale && (
                <span className="inline-flex items-center rounded-full bg-warning/10 px-2.5 py-1 text-xs/5 font-medium text-warning">
                  -{staleBehindSlots}
                </span>
              )}
            </div>
          </div>

          {/* Compact Progress */}
          <CurrentSlotProgressBar />
          <HistoricalPositionBar />

          {/* Media Controls */}
          <div className="flex items-center justify-center gap-2">
            <ButtonGroup>
              <button
                onClick={actions.previousSlot}
                disabled={currentSlot <= minSlot}
                className="bg-surface p-1.5 text-foreground transition-colors hover:bg-surface/80 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Previous slot"
              >
                <BackwardIcon className="size-5" />
              </button>
              <button
                onClick={actions.rewind}
                className="bg-surface p-1.5 text-foreground transition-colors hover:bg-surface/80"
                aria-label="Rewind to slot start"
              >
                <ChevronDoubleLeftIcon className="size-5" />
              </button>
            </ButtonGroup>

            <button
              onClick={actions.toggle}
              className="rounded-full bg-primary p-3 text-background shadow-sm transition-all hover:scale-105 hover:shadow-md"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <PauseIcon className="size-6" /> : <PlayIcon className="size-6" />}
            </button>

            <ButtonGroup>
              <button
                onClick={actions.fastForward}
                className="bg-surface p-1.5 text-foreground transition-colors hover:bg-surface/80"
                aria-label="Fast forward to slot end"
              >
                <ChevronDoubleRightIcon className="size-5" />
              </button>
              <button
                onClick={actions.nextSlot}
                disabled={currentSlot >= maxSlot}
                className="bg-surface p-1.5 text-foreground transition-colors hover:bg-surface/80 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Next slot"
              >
                <ForwardIcon className="size-5" />
              </button>
            </ButtonGroup>
          </div>

          {/* Compact Controls */}
          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-2.5">
            {/* Mode */}
            <div className="flex gap-1">
              <button
                onClick={() => actions.setMode('continuous')}
                className={clsx(
                  'rounded-sm px-2.5 py-1 text-xs/5 font-medium transition-colors',
                  mode === 'continuous' ? 'bg-primary text-background' : 'bg-surface text-muted hover:bg-surface/80'
                )}
                title="Auto-advances through slots"
              >
                Continuous
              </button>
              <button
                onClick={() => actions.setMode('single')}
                className={clsx(
                  'rounded-sm px-2.5 py-1 text-xs/5 font-medium transition-colors',
                  mode === 'single' ? 'bg-primary text-background' : 'bg-surface text-muted hover:bg-surface/80'
                )}
                title="Stops after each slot"
              >
                Single
              </button>
            </div>

            {/* Speed */}
            <div className="flex items-center gap-2">
              <span className="text-xs/5 text-muted">Speed:</span>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={playbackSpeed}
                onChange={e => actions.setPlaybackSpeed(parseFloat(e.target.value))}
                className="w-20"
              />
              <span className="text-xs/5 font-medium text-foreground tabular-nums">{playbackSpeed.toFixed(1)}x</span>
            </div>

            {/* Navigation */}
            <div className="ml-auto flex items-center gap-1.5">
              <button
                onClick={actions.jumpToLive}
                disabled={isLive}
                className="rounded-sm bg-success px-2 py-1 text-xs/5 font-medium text-background transition-colors hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Live
              </button>
              <button
                onClick={() => actions.goToSlot(minSlot)}
                disabled={currentSlot === minSlot}
                className="rounded-sm bg-surface px-2 py-1 text-xs/5 font-medium text-foreground transition-colors hover:bg-surface/80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Start
              </button>
              <button
                onClick={() => actions.goToSlot(maxSlot)}
                disabled={currentSlot === maxSlot}
                className="rounded-sm bg-surface px-2 py-1 text-xs/5 font-medium text-foreground transition-colors hover:bg-surface/80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                End
              </button>
              <SlotInput />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function IndexPage(): JSX.Element {
  return (
    <Container>
      <Header title="Welcome to Lab" />

      {/* Slot Player Demo */}
      <div className="mb-6">
        <SlotPlayerProvider
          tables={['fct_block_head', 'fct_attestation_correctness_head']}
          initialPlaying={true}
          initialMode="continuous"
          playbackSpeed={1}
        >
          <SlotPlayerDemo />
        </SlotPlayerProvider>
      </div>

      {/* Navigation Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link to="/experiments" className="block">
          <Card>
            <div className="flex flex-col gap-3">
              <BeakerIcon className="size-8 text-primary" />
              <h3 className="text-lg/7 font-semibold text-foreground">Experiments</h3>
              <p className="text-sm/6 text-muted">Explore data visualizations and experiments</p>
            </div>
          </Card>
        </Link>
        <Link to="/contributors" className="block">
          <Card>
            <div className="flex flex-col gap-3">
              <UserGroupIcon className="size-8 text-primary" />
              <h3 className="text-lg/7 font-semibold text-foreground">Contributors</h3>
              <p className="text-sm/6 text-muted">View and analyze contributor data</p>
            </div>
          </Card>
        </Link>
      </div>
    </Container>
  );
}
