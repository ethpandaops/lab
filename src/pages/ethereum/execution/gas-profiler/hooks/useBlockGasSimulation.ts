import { useState, useCallback } from 'react';
import { useNetwork } from '@/hooks/useNetwork';
import type { GasSchedule, BlockSimulationResult, CallError } from '../SimulatePage.types';

/**
 * Parameters for the useBlockGasSimulation hook
 */
export interface UseBlockGasSimulationParams {
  /** Block number to simulate */
  blockNumber: number | null;
  /** Custom gas schedule (overrides default values) */
  gasSchedule: GasSchedule;
}

/**
 * Return type for the useBlockGasSimulation hook
 */
export interface UseBlockGasSimulationResult {
  /** Trigger the simulation */
  simulate: () => Promise<void>;
  /** Simulation result data */
  data: BlockSimulationResult | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Reset state */
  reset: () => void;
}

/**
 * API response from the backend (matches Erigon response structure)
 */
interface ApiBlockSimulationResponse {
  blockNumber: number;
  baseFork: string;
  customSchedule: GasSchedule;
  original: {
    gasUsed: number;
    gasLimit: number;
    wouldExceedLimit: boolean;
  };
  simulated: {
    gasUsed: number;
    gasLimit: number;
    wouldExceedLimit: boolean;
  };
  transactions: Array<{
    hash: string;
    index: number;
    originalStatus: string;
    simulatedStatus: string;
    originalGas: number;
    simulatedGas: number;
    deltaPercent: number;
    diverged: boolean;
    originalReverts: number;
    simulatedReverts: number;
    originalErrors: CallError[] | null;
    simulatedErrors: CallError[] | null;
  }>;
  opcodeBreakdown: Record<
    string,
    { originalCount: number; originalGas: number; simulatedCount: number; simulatedGas: number }
  >;
}

/**
 * Transform API response to match frontend types
 */
function transformApiResponse(response: ApiBlockSimulationResponse): BlockSimulationResult {
  return {
    blockNumber: response.blockNumber,
    baseFork: response.baseFork,
    customSchedule: response.customSchedule,
    original: response.original,
    simulated: response.simulated,
    transactions: response.transactions.map(tx => ({
      hash: tx.hash,
      index: tx.index,
      originalStatus: tx.originalStatus === 'success' ? ('success' as const) : ('failed' as const),
      simulatedStatus: tx.simulatedStatus === 'success' ? ('success' as const) : ('failed' as const),
      originalGas: tx.originalGas,
      simulatedGas: tx.simulatedGas,
      deltaPercent: tx.deltaPercent,
      diverged: tx.diverged,
      originalReverts: tx.originalReverts,
      simulatedReverts: tx.simulatedReverts,
      originalErrors: tx.originalErrors ?? [],
      simulatedErrors: tx.simulatedErrors ?? [],
    })),
    opcodeBreakdown: response.opcodeBreakdown,
  };
}

/**
 * Hook for simulating block gas with custom gas schedule
 *
 * Calls the backend API to re-execute a block with custom gas parameters.
 *
 * @example
 * ```tsx
 * const { simulate, data, isLoading, error } = useBlockGasSimulation({
 *   blockNumber: 19000000,
 *   gasSchedule: { SLOAD_COLD: 1500 },
 * });
 *
 * const handleSimulate = async () => {
 *   await simulate();
 * };
 * ```
 */
export function useBlockGasSimulation({
  blockNumber,
  gasSchedule,
}: UseBlockGasSimulationParams): UseBlockGasSimulationResult {
  const { currentNetwork } = useNetwork();
  const [data, setData] = useState<BlockSimulationResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const simulate = useCallback(async () => {
    if (blockNumber === null) {
      setError(new Error('Block number is required'));
      return;
    }

    if (!currentNetwork) {
      setError(new Error('No network selected'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/gas-profiler/${currentNetwork.name}/simulate-block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockNumber,
          gasSchedule: { overrides: gasSchedule },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.error || `Simulation failed: ${response.status} ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const apiResult: ApiBlockSimulationResponse = await response.json();
      const result = transformApiResponse(apiResult);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Simulation failed'));
    } finally {
      setIsLoading(false);
    }
  }, [blockNumber, gasSchedule, currentNetwork]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    simulate,
    data,
    isLoading,
    error,
    reset,
  };
}
