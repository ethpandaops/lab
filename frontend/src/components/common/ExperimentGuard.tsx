import React from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import { useExperimentConfig } from '@/hooks/useExperimentConfig';
import useNetwork from '@/contexts/network';
import useConfig from '@/contexts/config';

interface ExperimentGuardProps {
  /** The experiment ID to check (e.g., 'block-production-flow') */
  experimentId: string;
  /** The network to check data availability for */
  network?: string;
  /** Content to render when experiment is available and data is ready */
  children: React.ReactNode;
  /** Custom error messages */
  errorMessages?: {
    notAvailable?: string;
    noData?: string;
    noSafeSlot?: string;
    configError?: string;
  };
  /** Whether to show staleness warnings */
  showStalenessWarning?: boolean;
  /** Whether to show out-of-range warnings */
  showRangeWarning?: boolean;
  /** Current slot number for range checking */
  currentSlot?: number | null;
}

/**
 * Guard component that handles common experiment error states:
 * - Experiment not available for network
 * - Config loading
 * - Missing data (hasData: false)
 * - Config errors or missing safe slot
 * - Data staleness warnings
 * - Out of range slot warnings
 */
export function ExperimentGuard({
  experimentId,
  network,
  children,
  errorMessages = {},
  showStalenessWarning = true,
  showRangeWarning = true,
  currentSlot,
}: ExperimentGuardProps) {
  const { selectedNetwork } = useNetwork();
  const { config } = useConfig();
  const targetNetwork = network || selectedNetwork;

  // Check if this experiment is available for the current network
  const isExperimentAvailable = () => {
    if (!config?.experiments) return true; // Default to available if no config
    const experiment = config.experiments.find(exp => exp.id === experimentId);
    return experiment?.enabled && experiment?.networks?.includes(targetNetwork);
  };

  // Get the networks that support this experiment
  const getSupportedNetworks = () => {
    if (!config?.experiments) return [];
    const experiment = config.experiments.find(exp => exp.id === experimentId);
    return experiment?.enabled ? experiment?.networks || [] : [];
  };

  // Fetch experiment config for data availability
  const {
    data: experimentConfig,
    isLoading: isConfigLoading,
    error: configError,
    getNetworkAvailability,
    getSafeSlot,
    isSlotInRange,
    getDataStaleness,
  } = useExperimentConfig(experimentId, targetNetwork);

  // Show not available message if experiment isn't enabled for this network
  if (!isExperimentAvailable()) {
    const supportedNetworks = getSupportedNetworks();
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-md mx-auto">
          <AlertCircle className="w-12 h-12 text-accent/60 mx-auto mb-4" />
          <h2 className="text-xl font-sans font-bold text-primary mb-2">
            Experiment Not Available
          </h2>
          <p className="text-sm font-mono text-secondary mb-4">
            {errorMessages.notAvailable || `${experimentId} is not enabled for ${targetNetwork}`}
          </p>
          {supportedNetworks.length > 0 && (
            <p className="text-xs font-mono text-tertiary">
              Available on: {supportedNetworks.join(', ')}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Check for config loading state
  if (isConfigLoading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-pulse text-accent mb-2">Loading configuration...</div>
        </div>
      </div>
    );
  }

  // Check if network has data available
  const networkAvailability = getNetworkAvailability(targetNetwork);
  const hasDataForNetwork = networkAvailability?.hasData !== false;

  // Show error if no data is available for the network
  if (!isConfigLoading && !configError && !hasDataForNetwork) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-md mx-auto">
          <AlertCircle className="w-12 h-12 text-error/60 mx-auto mb-4" />
          <h2 className="text-xl font-sans font-bold text-error mb-2">No Data Available</h2>
          <p className="text-sm font-mono text-secondary mb-4">
            {errorMessages.noData ||
              `No data available for ${targetNetwork}. Data pipeline may be offline.`}
          </p>
          <p className="text-xs font-mono text-tertiary">
            Please try again later or select a different network.
          </p>
        </div>
      </div>
    );
  }

  // Check for config error or missing safe slot
  const safeSlot = getSafeSlot(targetNetwork);
  if (configError || safeSlot === null || safeSlot === undefined) {
    // Log the error for debugging
    console.error('Data availability error:', {
      configError,
      safeSlot,
      network: targetNetwork,
      experimentConfig,
    });

    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-md mx-auto">
          <AlertCircle className="w-12 h-12 text-error/60 mx-auto mb-4" />
          <h2 className="text-xl font-sans font-bold text-error mb-2">Data Availability Error</h2>
          <p className="text-sm font-mono text-secondary mb-4">
            {configError
              ? errorMessages.configError ||
                `Failed to load experiment configuration: ${configError.message}`
              : errorMessages.noSafeSlot ||
                `No safe slot available for ${targetNetwork}. Data pipeline may be down.`}
          </p>
          <p className="text-xs font-mono text-tertiary">Please try again later.</p>
        </div>
      </div>
    );
  }

  // Check data staleness and range
  const staleness = getDataStaleness(targetNetwork);
  // Only show warning if significantly out of range (use larger tolerance for warnings)
  const isSlotOutOfRange = currentSlot !== null && !isSlotInRange(currentSlot, targetNetwork, 10);

  // Render children with optional warnings
  return (
    <div className="flex flex-col h-full bg-base">
      {/* Data staleness warning */}
      {showStalenessWarning && staleness?.isStale && (
        <div className="mb-1">
          <div className="bg-gradient-to-r from-warning/15 to-warning/10 border-l-4 border-warning text-warning px-4 py-2.5 font-mono flex items-center gap-3 shadow-sm">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 animate-pulse" />
            <div className="flex-1">
              <div className="text-sm font-semibold">{staleness.message}</div>
              <div className="text-xs opacity-80 mt-0.5">
                Data may be incomplete or outdated. Pipeline is catching up...
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Out of range warning */}
      {showRangeWarning && isSlotOutOfRange && networkAvailability && (
        <div className="mb-2">
          <div className="bg-gradient-to-r from-error/15 to-error/10 border-l-4 border-error text-error px-4 py-3 font-mono flex items-center gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="text-sm">
              Slot {currentSlot} is outside available range ({networkAvailability.minSlot} -{' '}
              {networkAvailability.maxSlot})
            </div>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
