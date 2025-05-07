import { Routes, Route, Outlet, useSearchParams } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { getConfig } from '@/config';
import type { Config } from '@/types';
import { LoadingState } from '@/components/common/LoadingState';
import { ErrorState } from '@/components/common/ErrorState';
import { BeaconClockManager } from '@/utils/beacon.ts';
import ScrollToTop from '@/components/common/ScrollToTop';
import Redirect from '@/components/common/Redirect';
import Home from '@/pages/Home.tsx';
import { About } from '@/pages/About.tsx';
import Xatu from '@/pages/xatu';
import { CommunityNodes } from '@/pages/xatu/CommunityNodes';
import Networks from '@/pages/xatu/networks';
import ContributorsList from '@/pages/xatu/ContributorsList';
import ContributorDetail from '@/pages/xatu/ContributorDetail';
import ForkReadiness from '@/pages/xatu/ForkReadiness';
import GeographicalChecklist from '@/pages/xatu/GeographicalChecklist';
import Layout from '@/components/layout/Layout';
import { BeaconChainTimings } from '@/pages/beacon/timings';
import { BlockTimings } from '@/pages/beacon/timings/blocks';
import { Beacon } from '@/pages/beacon';
import { BeaconLive } from '@/pages/beacon/live';
import { BeaconSlot } from '@/pages/beacon/slot';
import Experiments from '@/pages/Experiments.tsx';
import { SlotLookup } from '@/pages/beacon/slot/index';
import { ModalProvider } from '@/contexts/ModalContext.tsx';
import { LocallyBuiltBlocks } from '@/pages/beacon/LocallyBuiltBlocks';
import MevRelaysLivePage from '@/pages/beacon/mev_relays/live.tsx';
import BlockProductionLivePage from '@/pages/beacon/block-production/live.tsx';
import BlockProductionSlotPage from '@/pages/beacon/block-production/slot.tsx';
import NetworkContext from '@/contexts/NetworkContext';
import ConfigContext from '@/contexts/ConfigContext';

function App() {
  const [config, setConfig] = useState<Config | null>(null);
  const [configError, setConfigError] = useState<Error | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState('mainnet');
  const [searchParams, setSearchParams] = useSearchParams();
  const initializedRef = useRef(false);

  // Add a ref to track the source of network changes
  const networkChangeSourceRef = useRef<'url' | 'ui' | null>(null);
  
  // This effect handles URL updates when the network changes via the UI
  useEffect(() => {
    // Skip URL updates during initial loading until config is loaded
    if (!initializedRef.current || !config) return;
    
    // Only update URL if the change came from UI
    if (networkChangeSourceRef.current !== 'ui') return;
    
    console.log(`[App.tsx] Network changed to ${selectedNetwork} via UI, updating URL params`);

    // Update URL when network changes (but only if it's not the default)
    const newParams = new URLSearchParams(searchParams);
    if (selectedNetwork === 'mainnet') {
      if (newParams.has('network')) {
        console.log(`[App.tsx] Removing network param (was: ${newParams.get('network')})`);
        newParams.delete('network');
        setSearchParams(newParams, { replace: true });
      }
    } else {
      if (newParams.get('network') !== selectedNetwork) {
        console.log(`[App.tsx] Setting network param to ${selectedNetwork} (was: ${newParams.get('network')})`);
        newParams.set('network', selectedNetwork);
        setSearchParams(newParams, { replace: true });
      }
    }
    
    // Reset the source after handling the change
    networkChangeSourceRef.current = null;
  }, [selectedNetwork, config, searchParams, setSearchParams]);
  
  // This effect handles direct navigation with URL network param
  useEffect(() => {
    // Only run if we're initialized and have config
    if (!initializedRef.current || !config) return;
    
    // Get network from URL
    const networkFromUrl = searchParams.get('network');
    
    // Skip if we're already processing a UI change
    if (networkChangeSourceRef.current === 'ui') return;
    
    // If the URL has a network param that differs from context, update the context
    if (networkFromUrl && networkFromUrl !== selectedNetwork) {
      console.log(`[App.tsx] URL network param changed to ${networkFromUrl}, updating context`);
      
      // Get available networks
      const availableNetworks = Object.keys(config.ethereum?.networks || {});
      
      // Only set if it's a valid network
      if (availableNetworks.includes(networkFromUrl)) {
        // Mark that this change came from URL
        networkChangeSourceRef.current = 'url';
        setSelectedNetwork(networkFromUrl);
      }
    } else if (!networkFromUrl && selectedNetwork !== 'mainnet') {
      // If there's no network in URL but we're not on mainnet, switch to mainnet
      console.log(`[App.tsx] No network param in URL, switching to mainnet`);
      networkChangeSourceRef.current = 'url';
      setSelectedNetwork('mainnet');
    }
  }, [searchParams, config, selectedNetwork]);

  // One-time initialization effect - loads config and sets up initial network
  // We use a ref to track if this effect has run to prevent re-running it
  // This is more reliable than using dependencies like selectedNetwork which can cause loops
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    // Skip if we've already initialized or if we're in the middle of updating
    if (hasInitializedRef.current) return;
    
    console.log(`[App.tsx] Initializing app, searchParams: ${JSON.stringify(Object.fromEntries(searchParams.entries()))}`);
    hasInitializedRef.current = true;
    
    getConfig()
      .then(config => {
        // Initialize BeaconClockManager with config
        BeaconClockManager.getInstance().initialize(config);
        setConfig(config);

        // Get network from URL or use mainnet as default
        const networkFromUrl = searchParams.get('network');
        const availableNetworks = Object.keys(config.ethereum?.networks || {});

        console.log(`[App.tsx] Available networks: ${availableNetworks.join(', ')}`);
        console.log(`[App.tsx] Current network: ${selectedNetwork}, URL network: ${networkFromUrl || 'none'}`);

        // Only update if needed to prevent loops
        if (networkFromUrl && availableNetworks.includes(networkFromUrl) && networkFromUrl !== selectedNetwork) {
          console.log(`[App.tsx] Setting network from URL: ${networkFromUrl}`);
          setSelectedNetwork(networkFromUrl);
        } else if (availableNetworks.length > 0 && !availableNetworks.includes(selectedNetwork)) {
          // If current network is not in available networks, switch to first available
          console.log(`[App.tsx] Current network ${selectedNetwork} not available, switching to ${availableNetworks[0]}`);
          setSelectedNetwork(availableNetworks[0]);
        }
        
        // Mark as initialized AFTER network is set
        initializedRef.current = true;
        console.log(`[App.tsx] Initialization complete, network set to ${selectedNetwork}`);
      })
      .catch(error => {
        // Reset flag on error so we can retry
        hasInitializedRef.current = false;
        setConfigError(error);
      });
  }, [searchParams]); // Only depend on searchParams, not selectedNetwork

  if (configError) {
    return <ErrorState message="Failed to load configuration" error={configError} />;
  }

  if (!config) {
    return <LoadingState message="Loading configuration..." />;
  }

  const availableNetworks = Object.keys(config.ethereum?.networks || {});

  return (
    <ModalProvider>
      <ConfigContext.Provider value={config}>
        <NetworkContext.Provider
          value={{
            selectedNetwork,
            setSelectedNetwork: (network, source = 'ui') => {
              // Set the source of the network change
              networkChangeSourceRef.current = source;
              setSelectedNetwork(network);
            },
            availableNetworks,
          }}
        >
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="about" element={<About />} />
              <Route path="experiments" element={<Experiments />} />
              <Route path="xatu" element={<Xatu />}>
                <Route path="community-nodes" element={<CommunityNodes />} />
                <Route path="networks" element={<Networks />} />
                <Route path="contributors" element={<ContributorsList />} />
                <Route path="contributors/:name" element={<ContributorDetail />} />
                <Route path="fork-readiness" element={<ForkReadiness />} />
                <Route path="geographical-checklist" element={<GeographicalChecklist />} />
              </Route>
              <Route path="beacon" element={<Beacon />}>
                <Route path="slot" element={<Outlet />}>
                  <Route index element={<SlotLookup />} />
                  <Route path="live" element={<BeaconLive />} />
                  <Route path=":slot" element={<BeaconSlot />} />
                </Route>
                <Route path="timings" element={<BeaconChainTimings />}>
                  <Route path="blocks" element={<BlockTimings />} />
                </Route>
                <Route path="locally-built-blocks" element={<LocallyBuiltBlocks />} />
                <Route path="mev_relays/live" element={<MevRelaysLivePage />} />
                <Route path="block-production" element={<Redirect to="/beacon/block-production/live" />} />
                <Route path="block-production/live" element={<BlockProductionLivePage />} />
                <Route path="block-production/:slot" element={<BlockProductionSlotPage />} />
              </Route>
            </Route>
          </Routes>
        </NetworkContext.Provider>
      </ConfigContext.Provider>
    </ModalProvider>
  );
}

export default App;
