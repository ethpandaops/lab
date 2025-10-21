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
import { InputGroup } from '@/components/Forms/InputGroup';
import clsx from 'clsx';

// Slot input that updates with current slot and allows manual changes
function SlotInput(): JSX.Element {
  const { currentSlot } = useSlotPlayerState();
  const { minSlot, maxSlot } = useSlotPlayerConfig();
  const actions = useSlotPlayerActions();

  const [inputValue, setInputValue] = useState(currentSlot.toString());
  const [error, setError] = useState<string | undefined>();

  // Sync input value when currentSlot changes externally
  useEffect(() => {
    setInputValue(currentSlot.toString());
    setError(undefined);
  }, [currentSlot]);

  const handleSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    handleSlotChange();
  };

  const handleBlur = (): void => {
    handleSlotChange();
  };

  const handleSlotChange = (): void => {
    const parsedSlot = parseInt(inputValue, 10);

    if (isNaN(parsedSlot)) {
      setError('Please enter a valid number');
      setInputValue(currentSlot.toString());
      return;
    }

    if (parsedSlot < minSlot) {
      setError(`Slot must be at least ${minSlot.toLocaleString()}`);
      setInputValue(currentSlot.toString());
      return;
    }

    if (parsedSlot > maxSlot) {
      setError(`Slot must be at most ${maxSlot.toLocaleString()}`);
      setInputValue(currentSlot.toString());
      return;
    }

    setError(undefined);
    actions.goToSlot(parsedSlot);
  };

  return (
    <form onSubmit={handleSubmit}>
      <InputGroup
        label="Go to Slot"
        type="number"
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onBlur={handleBlur}
        error={error}
        helpText={`Enter a slot number between ${minSlot.toLocaleString()} and ${maxSlot.toLocaleString()}`}
        placeholder={currentSlot.toString()}
        min={minSlot}
        max={maxSlot}
      />
    </form>
  );
}

// Slot playback progress - updates at 60fps, isolated component
function CurrentSlotProgressBar(): JSX.Element {
  const { slotProgress } = useSlotPlayerProgress();
  const { slotDuration } = useSlotPlayerConfig();

  const progressPercentage = (slotProgress / slotDuration) * 100;

  return (
    <div>
      <ProgressBar
        progress={progressPercentage}
        statusMessage={`Slot Progress: ${(slotProgress / 1000).toFixed(1)}s / ${(slotDuration / 1000).toFixed(1)}s`}
        ariaLabel="Slot playback progress"
        fillColor="bg-primary"
        disableTransition={true}
      />
    </div>
  );
}

// Historical position progress - only updates when slot changes
function HistoricalPositionBar(): JSX.Element {
  const { currentSlot } = useSlotPlayerState();
  const { minSlot, maxSlot } = useSlotPlayerConfig();

  const slotRangePercentage = maxSlot > minSlot ? ((currentSlot - minSlot) / (maxSlot - minSlot)) * 100 : 0;

  return (
    <div>
      <ProgressBar
        progress={slotRangePercentage}
        statusMessage={`Historical Position: Slot ${minSlot.toLocaleString()} to ${maxSlot.toLocaleString()}`}
        ariaLabel="Historical slot range"
        fillColor="bg-accent"
        segments={[
          { label: `Slot ${minSlot.toLocaleString()}`, percentage: 0 },
          { label: `Slot ${maxSlot.toLocaleString()}`, percentage: 100 },
        ]}
      />
    </div>
  );
}

function SlotPlayerDemo(): JSX.Element {
  const { currentSlot, isPlaying, mode, isStale, staleBehindSlots, isLive } = useSlotPlayerState();
  const { slotDuration, playbackSpeed, minSlot, maxSlot } = useSlotPlayerConfig();
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

  const slotsFromMax = maxSlot - currentSlot;

  return (
    <div className="space-y-4">
      {/* Status Card */}
      <Card>
        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg/7 font-bold text-foreground">Slot Player Demo</h3>
              <p className="text-sm/6 text-muted">
                Interactive playback through Ethereum slots with fct_block and fct_block_proposer data
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isLive && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-xs/5 font-medium text-success">
                  <span className="size-2 rounded-full bg-success" />
                  {slotsFromMax > 0 ? `${slotsFromMax} from max` : 'Live'}
                </span>
              )}
              {isStale && (
                <span className="inline-flex items-center rounded-full bg-warning/10 px-3 py-1 text-xs/5 font-medium text-warning">
                  {staleBehindSlots} slots behind
                </span>
              )}
            </div>
          </div>

          {/* Current Slot Display */}
          <div className="flex items-baseline gap-3">
            <span className="text-4xl/8 font-bold text-foreground">{currentSlot.toLocaleString()}</span>
            <span className="text-sm/6 text-muted">Current Slot</span>
          </div>

          {/* Current Slot Progress (60fps updates) */}
          <CurrentSlotProgressBar />

          {/* Historical Position Progress */}
          <HistoricalPositionBar />

          {/* Media Controls */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={actions.previousSlot}
              disabled={currentSlot <= minSlot}
              className="rounded-sm p-2 text-foreground transition-colors hover:bg-surface/80 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Previous slot"
            >
              <BackwardIcon className="size-6" />
            </button>

            <button
              onClick={actions.rewind}
              className="rounded-sm p-2 text-foreground transition-colors hover:bg-surface/80"
              aria-label="Rewind to slot start"
            >
              <ChevronDoubleLeftIcon className="size-6" />
            </button>

            <button
              onClick={actions.toggle}
              className="rounded-full bg-primary p-4 text-background shadow-sm transition-all hover:scale-105 hover:shadow-md"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <PauseIcon className="size-8" /> : <PlayIcon className="size-8" />}
            </button>

            <button
              onClick={actions.fastForward}
              className="rounded-sm p-2 text-foreground transition-colors hover:bg-surface/80"
              aria-label="Fast forward to slot end"
            >
              <ChevronDoubleRightIcon className="size-6" />
            </button>

            <button
              onClick={actions.nextSlot}
              disabled={currentSlot >= maxSlot}
              className="rounded-sm p-2 text-foreground transition-colors hover:bg-surface/80 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Next slot"
            >
              <ForwardIcon className="size-6" />
            </button>
          </div>

          {/* Settings Row */}
          <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-3">
            {/* Playback Mode */}
            <div className="flex flex-col gap-2">
              <label className="text-sm/6 font-medium text-foreground">Playback Mode</label>
              <div className="flex gap-2">
                <button
                  onClick={() => actions.setMode('continuous')}
                  className={clsx(
                    'flex-1 rounded-sm px-3 py-2 text-xs/5 font-medium transition-colors',
                    mode === 'continuous' ? 'bg-primary text-background' : 'bg-surface text-muted hover:bg-surface/80'
                  )}
                >
                  Continuous
                </button>
                <button
                  onClick={() => actions.setMode('single')}
                  className={clsx(
                    'flex-1 rounded-sm px-3 py-2 text-xs/5 font-medium transition-colors',
                    mode === 'single' ? 'bg-primary text-background' : 'bg-surface text-muted hover:bg-surface/80'
                  )}
                >
                  Single
                </button>
              </div>
            </div>

            {/* Playback Speed */}
            <div className="flex flex-col gap-2">
              <label className="text-sm/6 font-medium text-foreground">Speed: {playbackSpeed.toFixed(1)}x</label>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={playbackSpeed}
                onChange={e => actions.setPlaybackSpeed(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Slot Duration */}
            <div className="flex flex-col gap-2">
              <label className="text-sm/6 font-medium text-foreground">
                Duration: {(slotDuration / 1000).toFixed(0)}s
              </label>
              <input
                type="range"
                min="1000"
                max="30000"
                step="1000"
                value={slotDuration}
                onChange={e => actions.setSlotDuration(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="border-t border-border pt-3">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={actions.jumpToLive}
                disabled={isLive}
                className="rounded-sm bg-success px-3 py-1.5 text-sm/6 font-medium text-background transition-colors hover:bg-success/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Jump to Live
              </button>
              <button
                onClick={() => actions.goToSlot(minSlot)}
                disabled={currentSlot === minSlot}
                className="rounded-sm bg-surface px-3 py-1.5 text-sm/6 font-medium text-foreground transition-colors hover:bg-surface/80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Go to Start
              </button>
              <button
                onClick={() => actions.goToSlot(maxSlot)}
                disabled={currentSlot === maxSlot}
                className="rounded-sm bg-surface px-3 py-1.5 text-sm/6 font-medium text-foreground transition-colors hover:bg-surface/80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Go to End
              </button>
            </div>

            {/* Go To Slot Input */}
            <div className="mt-3">
              <SlotInput />
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid gap-2 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-sm bg-surface/50 p-2">
              <p className="text-xs/5 text-muted">Status</p>
              <p className="text-sm/6 font-semibold text-foreground">{isPlaying ? 'Playing' : 'Paused'}</p>
            </div>
            <div className="rounded-sm bg-surface/50 p-2">
              <p className="text-xs/5 text-muted">Mode</p>
              <p className="text-sm/6 font-semibold text-foreground capitalize">{mode}</p>
            </div>
            <div className="rounded-sm bg-surface/50 p-2">
              <p className="text-xs/5 text-muted">Min Slot</p>
              <p className="text-sm/6 font-semibold text-foreground">{minSlot.toLocaleString()}</p>
            </div>
            <div className="rounded-sm bg-surface/50 p-2">
              <p className="text-xs/5 text-muted">Max Slot</p>
              <p className="text-sm/6 font-semibold text-foreground">{maxSlot.toLocaleString()}</p>
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
          initialPlaying={false}
          initialMode="continuous"
          slotDuration={12000}
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
