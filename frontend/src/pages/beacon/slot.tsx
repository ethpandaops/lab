import { useEffect } from 'react';
import { useParams, useSearch } from '@tanstack/react-router';
import { SlotView } from '@/components/beacon/SlotView';
import { useNetwork, useConfig } from '@/stores/appStore';
import { AlertCircle } from 'lucide-react';

function BeaconSlot() {
  const { slot } = useParams<{ slot: string }>();
  const search = useSearch({ from: '__root__' });
  const { selectedNetwork } = useNetwork();
  const { config } = useConfig();

  // Check if this experiment is available for the current network
  const isExperimentAvailable = () => {
    if (!config?.experiments) return true; // Default to available if no config
    const experiment = config.experiments.find(exp => exp.id === 'historical-slots');
    return experiment?.enabled && experiment?.networks?.includes(selectedNetwork);
  };

  // Get the networks that support this experiment
  const getSupportedNetworks = () => {
    if (!config?.experiments) return [];
    const experiment = config.experiments.find(exp => exp.id === 'historical-slots');
    return experiment?.enabled ? experiment?.networks || [] : [];
  };

  // Network is managed by root route search params

  // Show not available message if experiment isn't enabled for this network
  if (!isExperimentAvailable()) {
    const supportedNetworks = getSupportedNetworks();
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <div className="text-center max-w-md mx-auto">
          <AlertCircle className="w-12 h-12 text-accent/60 mx-auto mb-4" />
          <h2 className="text-xl font-sans font-bold text-primary mb-2">Experiment Not Available</h2>
          <p className="text-sm font-mono text-secondary mb-4">Historical Slots is not enabled for {selectedNetwork}</p>
          {supportedNetworks.length > 0 && (
            <p className="text-xs font-mono text-tertiary">Available on: {supportedNetworks.join(', ')}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Slot View */}
      <SlotView slot={slot ? parseInt(slot) : undefined} network={selectedNetwork} isLive={false} />
    </div>
  );
}

export { BeaconSlot };
