import { type JSX, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearch, useNavigate, Link } from '@tanstack/react-router';
import { ArrowLeftIcon, BeakerIcon, PlayIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { Container } from '@/components/Layout/Container';
import { Header } from '@/components/Layout/Header';
import { Card } from '@/components/Layout/Card';
import { Alert } from '@/components/Feedback/Alert';
import { Input } from '@/components/Forms/Input';
import { Button } from '@/components/Elements/Button';
import { GasScheduleEditor } from './components/GasScheduleEditor';
import { BlockSimulationResults } from './components/BlockSimulationResults';
import { SimulatePageSkeleton, SimulatorHelpDialog } from './components';
import { useBlockGasSimulation } from './hooks/useBlockGasSimulation';
import { useGasProfilerBounds } from './hooks/useGasProfilerBounds';
import { useGasSchedule } from './hooks/useGasSchedule';
import type { GasSchedule, GasProfilerSimulateSearch } from './SimulatePage.types';

/**
 * Format gas value with comma separators
 */
function formatGas(value: number): string {
  return value.toLocaleString();
}

/**
 * Validate if string is a valid block number
 */
function isValidBlockNumber(value: string): boolean {
  const cleaned = value.replace(/,/g, '');
  const num = parseInt(cleaned, 10);
  return !isNaN(num) && num >= 0;
}

/**
 * Gas Repricing Simulator page
 *
 * Allows researchers to re-execute historical blocks with custom gas schedules
 * to analyze how proposed opcode repricing would affect real transactions.
 */
export function SimulatePage(): JSX.Element {
  const search = useSearch({ from: '/ethereum/execution/gas-profiler/simulate' }) as GasProfilerSimulateSearch;
  const navigate = useNavigate({ from: '/ethereum/execution/gas-profiler/simulate' });

  // Block number state
  const [blockInput, setBlockInput] = useState(search.block?.toString() ?? '');
  const [inputError, setInputError] = useState<string | null>(null);

  // Help dialog state
  const [helpOpen, setHelpOpen] = useState(false);

  // Gas schedule state (user overrides)
  const [gasSchedule, setGasSchedule] = useState<GasSchedule>({});

  // Fetch bounds to validate block range
  const { data: bounds, isLoading: boundsLoading, error: boundsError } = useGasProfilerBounds();

  // Parse block number from input
  const blockNumber = useMemo(() => {
    const cleaned = blockInput.replace(/,/g, '');
    if (!cleaned || !isValidBlockNumber(cleaned)) return null;
    return parseInt(cleaned, 10);
  }, [blockInput]);

  // Debounced block number for gas schedule fetch (500ms delay)
  const [debouncedBlockNumber, setDebouncedBlockNumber] = useState<number | null>(blockNumber);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      setDebouncedBlockNumber(blockNumber);
    }, 500);

    // Cleanup on unmount or when blockNumber changes
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [blockNumber]);

  // Fetch gas schedule defaults for the selected block's fork
  // Only fetches when a valid block number is entered (debounced to avoid excessive requests)
  const {
    data: gasScheduleDefaults,
    isLoading: defaultsLoading,
    error: defaultsError,
  } = useGasSchedule({ blockNumber: debouncedBlockNumber });

  // Simulation hook
  const {
    simulate,
    data: simulationResult,
    isLoading: simulating,
    error: simulationError,
    reset,
  } = useBlockGasSimulation({
    blockNumber,
    gasSchedule,
  });

  // Count of modified gas parameters
  const modifiedCount = Object.keys(gasSchedule).length;

  // Update URL when block number changes
  useEffect(() => {
    if (blockNumber !== null && blockNumber !== search.block) {
      navigate({
        search: { block: blockNumber },
        replace: true,
      });
    }
  }, [blockNumber, search.block, navigate]);

  // When new gas schedule defaults load, filter out any user overrides that don't exist in the new fork
  // This preserves user changes while removing params that aren't valid for the new block's fork
  useEffect(() => {
    if (gasScheduleDefaults) {
      setGasSchedule(prev => {
        const validKeys = Object.keys(gasScheduleDefaults.parameters);
        const filtered: GasSchedule = {};
        for (const [key, value] of Object.entries(prev)) {
          if (validKeys.includes(key) && value !== undefined) {
            filtered[key] = value;
          }
        }
        return filtered;
      });
    }
  }, [gasScheduleDefaults]);

  // Handle input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.replace(/,/g, '');
      setBlockInput(value);
      setInputError(null);
      reset();
    },
    [reset]
  );

  // Handle simulate button click
  const handleSimulate = useCallback(async () => {
    setInputError(null);

    if (!blockInput) {
      setInputError('Enter a block number');
      return;
    }

    const cleaned = blockInput.replace(/,/g, '');
    if (!isValidBlockNumber(cleaned)) {
      setInputError('Invalid block number');
      return;
    }

    // Note: Bounds check is disabled for the simulation API since
    // the simulation API works on any block the Erigon node has, not just indexed blocks
    void bounds;

    await simulate();
  }, [blockInput, bounds, simulate]);

  // Handle enter key
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSimulate();
      }
    },
    [handleSimulate]
  );

  // Handle gas schedule change
  const handleScheduleChange = useCallback(
    (newSchedule: GasSchedule) => {
      setGasSchedule(newSchedule);
      reset(); // Clear previous results when schedule changes
    },
    [reset]
  );

  // Loading state for initial bounds fetch
  if (boundsLoading) {
    return (
      <Container>
        <Header
          title="Gas Repricing Simulator"
          description="Simulate how gas repricing would affect historical blocks"
        />
        <SimulatePageSkeleton />
      </Container>
    );
  }

  // Error state for bounds
  if (boundsError) {
    return (
      <Container>
        <Header
          title="Gas Repricing Simulator"
          description="Simulate how gas repricing would affect historical blocks"
        />
        <Alert variant="error" title="Error loading data" description={boundsError.message} />
      </Container>
    );
  }

  // No bounds data available
  if (!bounds) {
    return (
      <Container>
        <Header
          title="Gas Repricing Simulator"
          description="Simulate how gas repricing would affect historical blocks"
        />
        <Alert
          variant="warning"
          title="No data available"
          description="Gas profiling data is not yet available. Blocks are still being indexed."
        />
      </Container>
    );
  }

  return (
    <Container>
      <Header title="Gas Repricing Simulator" description="Simulate how gas repricing would affect historical blocks" />

      {/* Back link and help */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          to="/ethereum/execution/gas-profiler"
          className="flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          Gas Profiler Home
        </Link>
        <button
          type="button"
          onClick={() => setHelpOpen(true)}
          className="flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
        >
          <QuestionMarkCircleIcon className="size-4" />
          How it works
        </button>
      </div>

      {/* Help dialog */}
      <SimulatorHelpDialog open={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column - Controls */}
        <div className="space-y-6 lg:col-span-1">
          {/* Block Input */}
          <Card className="p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-xs bg-primary/10 p-2">
                <BeakerIcon className="size-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-foreground">Simulation Target</h3>
                <p className="text-xs text-muted">Choose a block to re-execute</p>
              </div>
            </div>

            <Input error={!!inputError} errorMessage={inputError ?? undefined}>
              <Input.Field
                type="text"
                value={blockInput}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Block number"
              />
            </Input>

            <Button
              className="mt-4 w-full"
              onClick={handleSimulate}
              disabled={!blockInput || simulating || defaultsLoading}
            >
              {simulating ? (
                <>
                  <span className="mr-2 size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Simulating...
                </>
              ) : (
                <>
                  <PlayIcon className="mr-1.5 size-4" />
                  Simulate
                  {modifiedCount > 0 && ` (${modifiedCount} changes)`}
                </>
              )}
            </Button>
          </Card>

          {/* Gas Schedule Editor - only show when defaults are loaded */}
          {(defaultsLoading || (blockNumber !== null && blockNumber !== debouncedBlockNumber)) &&
            blockNumber !== null &&
            !defaultsError && (
              <Card className="p-4">
                <div className="flex items-center justify-center gap-3 py-4">
                  <span className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="text-sm text-muted">Loading gas parameters for block...</span>
                </div>
              </Card>
            )}

          {defaultsError && (
            <Alert variant="error" title="Error loading gas schedule" description={defaultsError.message} />
          )}

          {gasScheduleDefaults && (
            <GasScheduleEditor schedule={gasSchedule} defaults={gasScheduleDefaults} onChange={handleScheduleChange} />
          )}

          {!blockNumber && (
            <Card className="p-4">
              <div className="py-4 text-center text-sm text-muted">
                Enter a block number to see available gas parameters for that fork.
              </div>
            </Card>
          )}
        </div>

        {/* Right column - Results */}
        <div className="lg:col-span-2">
          {/* Simulation error */}
          {simulationError && (
            <Alert variant="error" title="Simulation failed" description={simulationError.message} className="mb-6" />
          )}

          {/* Simulation loading */}
          {simulating && (
            <Card className="p-8">
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="size-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <div className="text-center">
                  <div className="font-medium text-foreground">Running Simulation</div>
                  <div className="mt-1 text-sm text-muted">
                    Re-executing block {blockNumber !== null ? formatGas(blockNumber) : ''} with custom gas schedule...
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Simulation results */}
          {simulationResult && !simulating && <BlockSimulationResults result={simulationResult} />}

          {/* Empty state */}
          {!simulationResult && !simulating && !simulationError && (
            <Card className="p-8">
              <div className="flex flex-col items-center justify-center gap-4 text-center">
                <BeakerIcon className="size-12 text-muted" />
                <div>
                  <div className="font-medium text-foreground">Ready to Simulate</div>
                  <div className="mt-1 max-w-md text-sm text-muted">
                    Enter a block number and adjust gas parameters to see how repricing would affect transaction costs.
                    Results will show original vs simulated gas for the entire block.
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </Container>
  );
}
